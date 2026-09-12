# Coastline source

`world_map_contours.svg` is generated from Natural Earth 1:110m coastline data,
including major islands, without administrative borders. Made with Natural Earth.

- Dataset: https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-coastline/
- Input: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson
- Terms: https://www.naturalearthdata.com/about/terms-of-use/ (public domain).
- Downloaded 2026-09-12.

`node scripts/coastline-svg.cjs /path/to/ne_110m_coastline.geojson` emits the SVG.
Projection is equirectangular: x = (longitude + 180) / 360, y = (90 - latitude) / 180.
This matches the globe sphere's UVs and `cityDirection`; antimeridian jumps begin
a new path rather than connecting across the texture. The shipped asset is local;
no geography service or conversion runs in the browser.
