const fs = require('fs');
let file = fs.readFileSync('src/components/ClipPlayerModal.tsx', 'utf8');

const regex = /\{post\.videoUrl \? \([\s\S]*?\) : \([\s\S]*?className="w-full h-full object-contain max-h-full"\s*\/>\s*\)\}/;

const replacement = `{post.videoUrl ? (
            <video
              ref={videoRef}
              src={post.videoUrl}
              poster={post.thumbnailUrl}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain max-h-full"
            />
          ) : post.imageUrls && post.imageUrls.length > 0 ? (
            <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide relative group/slider">
              {post.imageUrls.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={post.title || post.caption}
                  className="w-full h-full object-contain max-h-full flex-shrink-0 snap-center"
                />
              ))}
              {post.imageUrls.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                  {post.imageUrls.map((_, idx) => (
                    <div key={idx} className="w-2 h-2 rounded-full bg-white/50 backdrop-blur-md" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <img
              src={post.thumbnailUrl}
              alt={post.title || post.caption}
              className="w-full h-full object-contain max-h-full"
            />
          )}`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/components/ClipPlayerModal.tsx', file);
