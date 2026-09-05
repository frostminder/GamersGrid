const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

const startStr = "const compressAndProcessMedia = async (): Promise<{ mediaUrl: string; thumbnailUrl: string; duration: string }> => {";
const endStr = "  };";

const startIndex = file.indexOf(startStr);
const restOfFile = file.substring(startIndex + startStr.length);
const endIndex = restOfFile.indexOf(endStr);
const actualEndIndex = startIndex + startStr.length + endIndex + endStr.length;

const replacement = `const compressAndProcessMedia = async (): Promise<{ mediaUrl: string; thumbnailUrl: string; duration: string }> => {
    return new Promise(async (resolve, reject) => {
      setIsProcessingMedia(true);
      setProcessingProgress(15);
      
      try {
        if (videoFile) {
          const startSec = Math.floor(trimStart);
          const endSec = Math.floor(trimEnd);
          
          const storageRef = ref(storage, \`posts/videos/\${auth.currentUser?.uid}_\${Date.now()}_\${videoFile.name}\`);
          
          setProcessingProgress(45);
          setProcessingStatus('Uploading video to cloud servers...');
          
          await uploadBytes(storageRef, videoFile);
          
          setProcessingProgress(90);
          setProcessingStatus('Finalizing video URL...');
          
          const downloadUrl = await getDownloadURL(storageRef);
          
          setProcessingProgress(100);
          setProcessingStatus('Video successfully uploaded!');
          
          setTimeout(() => {
            setIsProcessingMedia(false);
            const minutes = Math.floor(trimmedDuration / 60);
            const seconds = Math.floor(trimmedDuration % 60).toString().padStart(2, '0');
            
            resolve({
              mediaUrl: downloadUrl,
              thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
              duration: \`\${minutes}:\${seconds}\`
            });
          }, 800);
          
        } else if (imageFile && mediaPreview) {
          setProcessingStatus('Compressing image size via HTML5 canvas...');
          
          const img = new window.Image();
          img.src = mediaPreview;
          img.onload = async () => {
            try {
              const canvas = document.createElement('canvas');
              const max_width = 1920;
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
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
                
                setProcessingProgress(50);
                setProcessingStatus('Uploading compressed image...');
                
                const storageRef = ref(storage, \`posts/images/\${auth.currentUser?.uid}_\${Date.now()}.jpg\`);
                await uploadString(storageRef, compressedBase64, 'data_url');
                
                setProcessingProgress(90);
                setProcessingStatus('Getting secure URL...');
                
                const downloadUrl = await getDownloadURL(storageRef);

                setProcessingProgress(100);
                setProcessingStatus('Image uploaded successfully!');
                
                setTimeout(() => {
                  setIsProcessingMedia(false);
                  resolve({
                    mediaUrl: downloadUrl,
                    thumbnailUrl: downloadUrl,
                    duration: '0:00'
                  });
                }, 600);
              } else {
                throw new Error("Canvas context is null");
              }
            } catch (err) {
              console.error("Image upload failed:", err);
              setIsProcessingMedia(false);
              reject(err);
            }
          };
          img.onerror = () => {
            setIsProcessingMedia(false);
            reject(new Error("Failed to load image for compression"));
          };
        } else {
          setIsProcessingMedia(false);
          resolve({ mediaUrl: '', thumbnailUrl: '', duration: '0:00' });
        }
      } catch (error) {
        console.error("Upload failed:", error);
        setIsProcessingMedia(false);
        reject(error);
      }
    });
  };`;

file = file.substring(0, startIndex) + replacement + file.substring(actualEndIndex);
fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
