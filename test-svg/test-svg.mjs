import fs from 'fs';

// Create a simple SVG
const svgContent = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <circle cx="150" cy="100" r="50" fill="red" />
  <text x="150" y="100" font-family="Arial" font-size="20" text-anchor="middle" fill="white">Test</text>
</svg>`;

// Write to file
fs.writeFileSync('test-svg/sample.svg', svgContent);

// Create a data URI
const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
fs.writeFileSync('test-svg/sample-data-uri.txt', dataUri);

console.log('SVG test files created');
console.log('SVG Content:', svgContent.substring(0, 100) + '...');
console.log('Data URI:', dataUri.substring(0, 100) + '...');
