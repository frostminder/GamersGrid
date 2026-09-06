const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

file = file.replace(/thumbnailUrl: mediaResults.thumbnailUrl,/, "thumbnailUrl: mediaResults.thumbnailUrl,\n        imageUrls: postType === 'image' ? mediaResults.imageUrls : [],");
fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
