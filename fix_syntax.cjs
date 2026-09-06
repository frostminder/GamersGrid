const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

const regex = /             \) : \(\s*<img \s*src=\{mediaPreview\}\s*alt="Preview"\s*className="w-full h-full object-contain"\s*\/>\s*\}\)\s*\{\/\* Delete Button overlay \*\/\}\s*<button[\s\S]*?<\/button>\s*<\/div>\s*\) : \(/;

const replacement = `            ) : (`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
