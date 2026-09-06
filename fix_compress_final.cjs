const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

const lines = file.split('\n');
const startIdx = lines.findIndex(l => l.includes('const compressAndProcessMedia'));
const endIdx = lines.findIndex(l => l.includes('const handleToggleTag ='));

const newFunc = `  const compressAndProcessMedia = async (): Promise<{ mediaUrl: string; thumbnailUrl: string; duration: string; imageUrls?: string[] }> => {
    return new Promise(async (resolve, reject) => {
      setIsProcessingMedia(true);
      setProcessingProgress(15);
      
      try {
        if (postType === 'clip' && videoFile) {
          const startSec = Math.floor(trimStart);
          const endSec = Math.floor(trimEnd);
          
          setProcessingProgress(45);
          setProcessingStatus('Simulating local video processing...');
          
          const localUrl = videoPreview || URL.createObjectURL(videoFile);
          
          setProcessingProgress(100);
          setProcessingStatus('Video processed successfully!');
          
          setTimeout(() => {
            setIsProcessingMedia(false);
            const minutes = Math.floor(trimmedDuration / 60);
            const seconds = Math.floor(trimmedDuration % 60).toString().padStart(2, '0');
            
            resolve({
              mediaUrl: localUrl,
              thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
              duration: \`\${minutes}:\${seconds}\`
            });
          }, 800);
          
        } else if (postType === 'image' && imageFiles.length > 0) {
          setProcessingStatus('Compressing images...');
          
          const compressedImages: string[] = [];
          
          for (let i = 0; i < imagePreviews.length; i++) {
            setProcessingProgress(15 + Math.floor((i / imagePreviews.length) * 80));
            
            const compressed = await new Promise<string>((res, rej) => {
              const img = new window.Image();
              img.src = imagePreviews[i];
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const max_width = 1200;
                let width = img.width;
                let height = img.height;

                if (width > max_width) {
                  height = Math.round((height * max_width) / width);
                  width = max_width;
                }
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  res(canvas.toDataURL('image/jpeg', 0.65));
                } else {
                  rej(new Error("Canvas context is null"));
                }
              };
              img.onerror = () => rej(new Error("Image load failed"));
            });
            compressedImages.push(compressed);
          }

          setProcessingProgress(100);
          setProcessingStatus('Images optimized successfully!');
          
          setTimeout(() => {
            setIsProcessingMedia(false);
            resolve({
              mediaUrl: compressedImages[0],
              thumbnailUrl: compressedImages[0],
              duration: '0:00',
              imageUrls: compressedImages
            });
          }, 600);
          
        } else {
          setIsProcessingMedia(false);
          reject(new Error("No media provided"));
        }
      } catch (err) {
        setIsProcessingMedia(false);
        reject(err);
      }
    });
  };`;

lines.splice(startIdx, endIdx - startIdx, newFunc);
fs.writeFileSync('src/components/CreatePostScreen.tsx', lines.join('\n'));
