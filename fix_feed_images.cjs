const fs = require('fs');
let file = fs.readFileSync('src/components/FeedCard.tsx', 'utf8');

const regex = /\{\/\* Actual Video player with thumbnail fallback \*\/\}\s*<video[\s\S]*?\/>/;

const replacement = `{/* Actual Video player with thumbnail fallback */}
        {post.videoUrl ? (
          <video
            ref={videoRef}
            src={post.videoUrl}
            poster={post.thumbnailUrl}
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover"
          />
        ) : post.imageUrls && post.imageUrls.length > 0 ? (
          <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory">
            {post.imageUrls.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={post.title || post.caption}
                className="w-full h-full object-cover flex-shrink-0 snap-center"
              />
            ))}
          </div>
        ) : (
          <img
            src={post.thumbnailUrl}
            alt={post.title || post.caption}
            className="w-full h-full object-cover"
          />
        )}`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/components/FeedCard.tsx', file);
