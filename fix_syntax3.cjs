const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

file = file.replace(/\) : \(\s*\) : \(/, ') : (');

fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
