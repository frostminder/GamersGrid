const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

file = file.replace(/const \[imageFile, setImageFile\] = useState<File \| null>\(null\);/, 'const [imageFiles, setImageFiles] = useState<File[]>([]);');
file = file.replace(/const \[mediaPreview, setMediaPreview\] = useState<string \| null>\(null\);/, 'const [videoPreview, setVideoPreview] = useState<string | null>(null);\n  const [imagePreviews, setImagePreviews] = useState<string[]>([]);');

fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
