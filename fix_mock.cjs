const fs = require('fs');
let file = fs.readFileSync('src/types/mockData.ts', 'utf8');

file = file.replace(/thumbnailUrl: string;/, 'thumbnailUrl: string;\n  imageUrls?: string[];');
fs.writeFileSync('src/types/mockData.ts', file);
