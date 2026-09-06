const fs = require('fs');
let file = fs.readFileSync('src/components/CreatePostScreen.tsx', 'utf8');

const regex = /className=\{\`relative rounded-3xl border-2 border-dashed bg-\[#1a1a1a\] overflow-hidden min-h-\[220px\] flex flex-col items-center justify-center cursor-pointer p-6 group transition-all duration-300 hover:bg-\[#1d1d21\] \$\{mediaPreview \? 'border-\[#5003BD\]\/50' : 'border-\[#2a2a2e\] hover:border-\[#5003BD\]\/40'\}\`\}[\s\S]*?\)\s*:\s*\(/;

const replacement = `className={\`relative rounded-3xl border-2 border-dashed bg-[#1a1a1a] overflow-hidden min-h-[220px] flex flex-col items-center justify-center cursor-pointer p-6 group transition-all duration-300 hover:bg-[#1d1d21] \${(videoPreview || imagePreviews.length > 0) ? 'border-[#5003BD]/50' : 'border-[#2a2a2e] hover:border-[#5003BD]/40'}\`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept={postType === 'clip' ? 'video/*' : 'image/*'}
              multiple={postType === 'image'}
              onChange={handleFileChange}
              className="hidden"
            />

            {(videoPreview || imagePreviews.length > 0) ? (
              <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                {postType === 'clip' ? (
                  <video 
                    ref={videoPreviewRef}
                    src={videoPreview || undefined} 
                    className="w-full h-full object-contain bg-black"
                    controls
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center gap-2 overflow-x-auto p-4 snap-x">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative h-full aspect-[9/16] sm:aspect-square flex-shrink-0 snap-center rounded-xl overflow-hidden border border-white/10 group/img">
                        <img 
                          src={preview} 
                          alt={\`Preview \${idx + 1}\`} 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageFiles(prev => prev.filter((_, i) => i !== idx));
                            setImagePreviews(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded-full opacity-0 group-hover/img:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 10 && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="h-full aspect-[9/16] sm:aspect-square flex-shrink-0 rounded-xl border-2 border-dashed border-[#5003BD]/50 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
                      >
                        <Plus className="w-8 h-8 text-[#5003BD]" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Delete Button overlay (only for video) */}
                {postType === 'clip' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoPreview(null);
                      setVideoFile(null);
                      setVideoDuration(0);
                      setIsVideoTooLong(false);
                      setTrimStart(0);
                      setTrimEnd(0);
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-black/80 hover:bg-red-600 rounded-full transition-colors group/del"
                    title="Remove file"
                  >
                    <Trash2 className="w-5 h-5 text-gray-300 group-hover/del:text-white" />
                  </button>
                )}
              </div>
            ) : (`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/components/CreatePostScreen.tsx', file);
