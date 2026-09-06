const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

const fileChangeRegex = /const handleFileChange = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?\} else \{[\s\S]*?\}\s*\};/;
const newFileChange = `const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError(null);
    setVideoDuration(0);
    setIsVideoTooLong(false);

    if (postType === 'clip') {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setImageFiles([]);
        setImagePreviews([]);
        
        const objectUrl = URL.createObjectURL(file);
        setVideoPreview(objectUrl);

        // Read video metadata for length and resolution
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.src = objectUrl;
        videoElement.onloadedmetadata = () => {
          const duration = videoElement.duration;
          setVideoDuration(duration);
          setTrimStart(0);
          setTrimEnd(Math.min(duration, 120));
          if (duration > 120) {
            setIsVideoTooLong(true);
          }
        };
      } else {
        setError('Please select a valid video file.');
      }
    } else {
      const newImages = files.filter(f => f.type.startsWith('image/'));
      if (!newImages.length) {
        setError('Please select valid image files.');
        return;
      }
      
      const totalImages = imageFiles.length + newImages.length;
      if (totalImages > 10) {
        setError('You can only upload up to 10 images.');
        newImages.splice(10 - imageFiles.length);
      }
      
      setImageFiles(prev => [...prev, ...newImages]);
      setVideoFile(null);
      setVideoPreview(null);
      
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };`;

file = file.replace(fileChangeRegex, newFileChange);
fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
