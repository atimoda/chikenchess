"use client"

import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import {
  BackSide, LinearFilter, LinearMipmapLinearFilter, Mesh, OrthographicCamera, PlaneGeometry,
  RepeatWrapping, Scene, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector3, WebGLRenderTarget, type Texture,
} from 'three'

/**
 * Realistic Earth layer for the map globe: NASA Blue Marble surface, Black
 * Marble city lights, sun-lit ocean glint, a procedural cloud deck that is
 * generated anew on every visit, and an atmosphere rim. `mixRef` carries the
 * 0..1 blend with the neon globe; this layer advances it towards `target`.
 */

const FADE_SECONDS = 2

// 3D gradient noise, fBm and the cloud recipe. Sampling the noise on the unit
// sphere (instead of the flat texture) keeps the map free of seams and of
// pinched poles.
const NOISE_GLSL = /* glsl */`
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float gnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
                 mix(dot(hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
             mix(mix(dot(hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                 mix(dot(hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
}
float fbm(vec3 p, int octaves) {
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * gnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 4.1);
    amp *= 0.5;
  }
  return sum;
}
vec3 rotateAround(vec3 v, vec3 axis, float angle) {
  float c = cos(angle), s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}
`

const CYCLONES = 7

const BAKE_FRAGMENT = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec3 seed;
uniform float coverage;
uniform vec4 cyclones[${CYCLONES}];
uniform int octaves;
${NOISE_GLSL}
void main() {
  float lat = (vUv.y - 0.5) * 3.14159265;
  float lng = (vUv.x - 0.5) * 6.28318531;
  vec3 dir = vec3(cos(lat) * cos(lng), sin(lat), cos(lat) * sin(lng));

  // Storm systems: each twists the surrounding air into a spiral, counter-
  // clockwise in the north and clockwise in the south, densest at the core.
  vec3 swirled = dir;
  float storms = 0.0;
  for (int i = 0; i < ${CYCLONES}; i++) {
    vec3 center = normalize(cyclones[i].xyz);
    float radius = abs(cyclones[i].w);
    float d = acos(clamp(dot(swirled, center), -1.0, 1.0)) / radius;
    float falloff = exp(-d * d);
    float spin = sign(center.y + 1e-4) * sign(cyclones[i].w);
    swirled = rotateAround(swirled, center, spin * falloff * 2.4);
    storms = max(storms, falloff);
  }

  vec3 p = swirled * 3.4 + seed;
  // Stretch along longitude: winds smear clouds east-west.
  p.y *= 1.7;
  vec3 warp = vec3(fbm(p + vec3(3.1), 4), fbm(p + vec3(7.7, 1.3, 5.2), 4), fbm(p + vec3(2.4, 8.8, 0.6), 4));
  float n = fbm(p + warp * 0.9, octaves);
  float detail = fbm(swirled * vec3(22.0, 34.0, 22.0) + seed * 1.7, 5);

  // Climate bands: wet tropics (ITCZ just north of the equator), dry
  // subtropics and the stormy mid-latitudes.
  float latDeg = degrees(lat);
  float bands = 0.06 * exp(-pow((latDeg - 6.0) / 9.0, 2.0))
              - 0.07 * exp(-pow((abs(latDeg) - 24.0) / 9.0, 2.0))
              + 0.07 * exp(-pow((abs(latDeg) - 55.0) / 14.0, 2.0))
              - 0.05 * smoothstep(72.0, 88.0, abs(latDeg));
  float field = n + bands + storms * 0.1 + detail * 0.16;
  float cloud = smoothstep(0.02 - coverage, 0.30 - coverage, field);
  // Thin, wispy edges with some denser cores.
  cloud *= 0.55 + 0.45 * smoothstep(-0.25, 0.35, field + detail * 0.4);
  gl_FragColor = vec4(vec3(clamp(cloud, 0.0, 1.0)), 1.0);
}
`

const PASS_VERTEX = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

function randomCloudUniforms() {
  const cyclones = Array.from({ length: CYCLONES }, (_, index) => {
    // Most storms live at mid-latitudes; a couple are tropical cyclones.
    const tropical = index < 2
    const latitude = (Math.random() < .5 ? -1 : 1) * (tropical ? 10 + Math.random() * 15 : 35 + Math.random() * 30)
    const longitude = Math.random() * Math.PI * 2
    const lat = latitude * Math.PI / 180
    const radius = (tropical ? .05 + Math.random() * .04 : .09 + Math.random() * .09)
    return { x: Math.cos(lat) * Math.cos(longitude), y: Math.sin(lat), z: Math.cos(lat) * Math.sin(longitude), w: radius * (Math.random() < .85 ? 1 : -1) }
  })
  return {
    seed: new Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100),
    coverage: -.02 + Math.random() * .1,
    cyclones,
  }
}

/** Renders a fresh equirectangular cloud map once per mount. */
function useRandomCloudMap(size: [number, number], octaves: number) {
  const gl = useThree(state => state.gl)
  const target = useMemo(() => {
    const renderTarget = new WebGLRenderTarget(size[0], size[1], {
      generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, depthBuffer: false,
    })
    renderTarget.texture.wrapS = RepeatWrapping
    return renderTarget
  }, [size])
  useEffect(() => {
    const { seed, coverage, cyclones } = randomCloudUniforms()
    const material = new ShaderMaterial({
      vertexShader: PASS_VERTEX,
      fragmentShader: BAKE_FRAGMENT,
      uniforms: { seed: { value: seed }, coverage: { value: coverage }, octaves: { value: octaves }, cyclones: { value: cyclones.map(c => [c.x, c.y, c.z, c.w]).flat() } },
      depthTest: false,
      depthWrite: false,
    })
    const geometry = new PlaneGeometry(2, 2)
    const scene = new Scene()
    const quad = new Mesh(geometry, material)
    quad.frustumCulled = false
    scene.add(quad)
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.render(scene, new OrthographicCamera())
    gl.setRenderTarget(previous)
    geometry.dispose()
    material.dispose()
    return () => target.dispose()
  }, [gl, target, octaves])
  return target.texture
}

const SURFACE_VERTEX = /* glsl */`
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const SURFACE_FRAGMENT = /* glsl */`
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D waterMap;
uniform sampler2D cloudMap;
uniform vec3 sunPosition;
uniform float cloudOffset;
uniform float opacity;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 l = normalize(sunPosition - vWorldPosition);
  vec3 v = normalize(cameraPosition - vWorldPosition);
  float ndl = dot(n, l);
  float day = smoothstep(-0.12, 0.28, ndl);

  vec3 albedo = texture2D(dayMap, vUv).rgb;
  float water = texture2D(waterMap, vUv).r;
  float cloud = texture2D(cloudMap, vec2(vUv.x + cloudOffset, vUv.y)).r;

  // Daylight with a cloud shadow and a warm band along the terminator.
  vec3 lit = albedo * (0.06 + 1.05 * max(ndl, 0.0)) * (1.0 - 0.38 * cloud * day);
  lit = mix(lit, lit * vec3(1.18, 0.82, 0.62), smoothstep(0.35, 0.0, ndl) * day * 0.6);

  // Sun glint on open water.
  vec3 h = normalize(l + v);
  float glint = pow(max(dot(n, h), 0.0), 160.0) * 0.55 + pow(max(dot(n, h), 0.0), 24.0) * 0.035;
  lit += vec3(1.0, 0.92, 0.78) * glint * water * day * (1.0 - cloud * 0.85);

  // City lights fade in past the terminator and dim under clouds.
  float lights = texture2D(nightMap, vUv).r;
  // The shaded half stays readable (earthshine), as the neon globe's does.
  vec3 night = vec3(1.0, 0.72, 0.42) * pow(lights, 1.6) * 1.6 * (1.0 - 0.7 * cloud) + albedo * vec3(0.16, 0.18, 0.24) * (1.0 - 0.3 * cloud);
  vec3 color = mix(night, lit, day);

  // Thin atmospheric haze toward the limb.
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  color += vec3(0.32, 0.58, 1.0) * fresnel * (0.08 + 0.55 * smoothstep(-0.2, 0.6, ndl));
  gl_FragColor = vec4(color, opacity);
  #include <colorspace_fragment>
}
`

const CLOUD_FRAGMENT = /* glsl */`
uniform sampler2D cloudMap;
uniform vec3 sunPosition;
uniform float cloudOffset;
uniform float opacity;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 l = normalize(sunPosition - vWorldPosition);
  float ndl = dot(n, l);
  float cloud = texture2D(cloudMap, vec2(vUv.x + cloudOffset, vUv.y)).r;
  float light = smoothstep(-0.18, 0.4, ndl);
  vec3 color = mix(vec3(0.17, 0.19, 0.25), mix(vec3(1.0, 0.86, 0.72), vec3(1.0), smoothstep(0.0, 0.45, ndl)), light);
  gl_FragColor = vec4(color, cloud * 0.92 * opacity);
  #include <colorspace_fragment>
}
`

const ATMOSPHERE_FRAGMENT = /* glsl */`
uniform vec3 sunPosition;
uniform float innerRadius;
uniform float outerRadius;
uniform float opacity;
varying vec3 vWorldPosition;
void main() {
  // Distance from the planet center to the view ray decides how much air the
  // ray crosses beyond the limb.
  vec3 ray = normalize(vWorldPosition - cameraPosition);
  float along = -dot(cameraPosition, ray);
  vec3 closest = cameraPosition + ray * along;
  float height = (length(closest) - innerRadius) / (outerRadius - innerRadius);
  float glow = pow(clamp(1.0 - height, 0.0, 1.0), 2.6);
  float sun = smoothstep(-0.35, 0.55, dot(normalize(closest), normalize(sunPosition)));
  // Inside the shell (diving into a city) the rim would wrap the camera.
  float outside = smoothstep(outerRadius, outerRadius + 0.4, length(cameraPosition));
  vec3 color = mix(vec3(0.12, 0.22, 0.55), vec3(0.38, 0.66, 1.0), sun);
  gl_FragColor = vec4(color, clamp(glow * (0.12 + 0.95 * sun), 0.0, 1.0) * outside * opacity);
  #include <colorspace_fragment>
}
`

function configureColorMap(texture: Texture, anisotropy: number) {
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.needsUpdate = true
}

export function RealisticEarth({ radius, sunPosition, target, mixRef, constrained }: {
  radius: number
  /** World position of the scene's sun, shared with the neon globe's shading. */
  sunPosition: [number, number, number]
  target: boolean
  mixRef: RefObject<number>
  constrained: boolean
}) {
  const quality = constrained ? '2k' : '4k'
  const [dayMap, nightMap, waterMap] = useLoader(TextureLoader, [`/globe/earth-day-${quality}.jpg`, `/globe/earth-night-${quality}.jpg`, '/globe/earth-water-2k.png'])
  const gl = useThree(state => state.gl)
  const cloudSize = useMemo<[number, number]>(() => constrained ? [1024, 512] : [2048, 1024], [constrained])
  const cloudMap = useRandomCloudMap(cloudSize, constrained ? 5 : 7)
  useEffect(() => {
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    configureColorMap(dayMap, anisotropy)
    nightMap.anisotropy = anisotropy
  }, [dayMap, nightMap, gl])

  const surfaceRef = useRef<Mesh>(null)
  const cloudRef = useRef<Mesh>(null)
  const atmosphereRef = useRef<Mesh>(null)
  const sun = useMemo(() => new Vector3(...sunPosition), [sunPosition])
  const uniforms = useMemo(() => {
    // Surface and clouds share the drift and fade so cloud shadows stay under their clouds.
    const cloudOffset = { value: Math.random() }
    const opacity = { value: 0 }
    return {
      surface: { dayMap: { value: dayMap }, nightMap: { value: nightMap }, waterMap: { value: waterMap }, cloudMap: { value: cloudMap }, sunPosition: { value: sun }, cloudOffset, opacity },
      clouds: { cloudMap: { value: cloudMap }, sunPosition: { value: sun }, cloudOffset, opacity },
      atmosphere: { sunPosition: { value: sun }, innerRadius: { value: radius }, outerRadius: { value: radius * 1.075 }, opacity },
    }
  }, [dayMap, nightMap, waterMap, cloudMap, sun, radius])

  useFrame((_, delta) => {
    const goal = target ? 1 : 0
    const current = mixRef.current ?? 0
    const next = current < goal ? Math.min(goal, current + delta / FADE_SECONDS) : Math.max(goal, current - delta / FADE_SECONDS)
    mixRef.current = next
    const eased = next * next * (3 - 2 * next)
    uniforms.surface.opacity.value = eased
    // The cloud deck drifts slowly eastward over the surface.
    uniforms.surface.cloudOffset.value = (uniforms.surface.cloudOffset.value - delta * .0009) % 1
    const visible = next > 0
    if (surfaceRef.current) surfaceRef.current.visible = visible
    if (cloudRef.current) cloudRef.current.visible = visible
    if (atmosphereRef.current) atmosphereRef.current.visible = visible
  })

  return <>
    <mesh ref={surfaceRef} renderOrder={-3} raycast={() => {}} visible={false}>
      <sphereGeometry args={[radius + .002, 128, 64]} />
      <shaderMaterial vertexShader={SURFACE_VERTEX} fragmentShader={SURFACE_FRAGMENT} uniforms={uniforms.surface} transparent />
    </mesh>
    <mesh ref={cloudRef} renderOrder={-2} raycast={() => {}} visible={false}>
      <sphereGeometry args={[radius + .014, 128, 64]} />
      <shaderMaterial vertexShader={SURFACE_VERTEX} fragmentShader={CLOUD_FRAGMENT} uniforms={uniforms.clouds} transparent depthWrite={false} />
    </mesh>
    <mesh ref={atmosphereRef} renderOrder={-1} raycast={() => {}} visible={false}>
      <sphereGeometry args={[radius * 1.075, 96, 48]} />
      <shaderMaterial vertexShader={SURFACE_VERTEX} fragmentShader={ATMOSPHERE_FRAGMENT} uniforms={uniforms.atmosphere} side={BackSide} transparent depthWrite={false} />
    </mesh>
  </>
}
