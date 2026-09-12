// Natural Earth 1:110m coastline GeoJSON -> equirectangular SVG.
// Usage: node scripts/coastline-svg.cjs /path/to/ne_110m_coastline.geojson
// Source and license: public/world_map_contours.README.md
const fs = require('node:fs')
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const paths = data.features.flatMap(({ geometry }) => {
  const lines = geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates]
  return lines.map(line => {
    let previous
    return line.map(([longitude, latitude]) => {
      // Do not draw a horizontal line across the map at the antimeridian.
      const command = previous === undefined || Math.abs(longitude - previous) > 180 ? 'M' : 'L'
      previous = longitude
      return `${command}${((longitude + 180) / 360 * 2048).toFixed(2)},${((90 - latitude) / 180 * 1024).toFixed(2)}`
    }).join(' ')
  })
})
process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024" viewBox="0 0 2048 1024">\n  <title>Natural Earth coastline, equirectangular projection</title>\n  <g fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">\n${paths.map(path => `    <path d="${path}"/>`).join('\n')}\n  </g>\n</svg>\n`)
