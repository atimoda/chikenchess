
const fs = require('fs');
const path = require('path');

const inputPath = path.join(process.cwd(), 'public', 'world_map_with_points.svg');
const outputPath = path.join(process.cwd(), 'public', 'world_map_tech.svg');

try {
  const data = fs.readFileSync(inputPath, 'utf8');

  // Regex to match circles: <circle cx="191" cy="90" r=".3"/>
  // We want to capture cx and cy
  const circleRegex = /<circle cx="([\d\.]+)" cy="([\d\.]+)" r="\.3"\/>/g;

  let match;
  let rects = '';
  let count = 0;

  while ((match = circleRegex.exec(data)) !== null) {
    const cx = parseFloat(match[1]);
    const cy = parseFloat(match[2]);
    
    // Convert to rect (square pixel)
    // Center is cx, cy. Size is roughly 0.8 (slightly larger than r=0.3*2=0.6 to make it look "blocky")
    const size = 0.8;
    const x = (cx - size / 2).toFixed(2);
    const y = (cy - size / 2).toFixed(2);
    
    rects += `<rect x="${x}" y="${y}" width="${size}" height="${size}" />`;
    count++;
  }

  const svgContent = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="660" height="320" viewBox="0 0 201 97">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="0.2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g fill="rgba(0, 255, 170, 0.5)" filter="url(#glow)">
    ${rects}
  </g>
</svg>`;

  fs.writeFileSync(outputPath, svgContent);
  console.log(`Generated ${outputPath} with ${count} pixels.`);

} catch (err) {
  console.error('Error:', err);
}
