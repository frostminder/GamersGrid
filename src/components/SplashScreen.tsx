import React, { useEffect, useRef, useState } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import { GamersGridLogo } from './GamersGridLogo';
import { ShieldCheck, Wifi, RefreshCw, Play, Pause, Upload, Film } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
  autoComplete?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  autoComplete = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLottieData = (jsonData: any) => {
    if (!containerRef.current) return;
    try {
      if (animRef.current) {
        animRef.current.destroy();
      }
      setIsVideo(false);
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: isLooping,
        autoplay: true,
        animationData: jsonData,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
        },
      });

      animRef.current.addEventListener('DOMLoaded', () => {
        setIsLoaded(true);
        setErrorMsg(null);
      });

      animRef.current.addEventListener('complete', () => {
        if (autoComplete && onComplete) {
          setTimeout(() => {
            onComplete();
          }, 500);
        }
      });
    } catch (err: any) {
      console.error('Error rendering Lottie:', err);
      setErrorMsg('Failed to render Lottie JSON');
    }
  };

  const removeWatermark = (data: any) => {
    const isWatermark = (l: any) => {
      if (l.nm && typeof l.nm === 'string' && l.nm.toLowerCase().includes('jitter')) return true;
      if (l.w === 86 && l.h === 24) return true;
      return false;
    };

    try {
      if (data.layers) {
        data.layers = data.layers.filter((l: any) => !isWatermark(l));
      }
      if (data.assets) {
        data.assets.forEach((asset: any) => {
          if (asset.layers) {
            asset.layers = asset.layers.filter((l: any) => !isWatermark(l));
          }
        });
      }
    } catch (e) {
      console.warn('Failed to strip watermark', e);
    }
    return data;
  };

  const tryLoadFromPublic = async () => {
    try {
      // 1. Try public/splash.json
      const jsonRes = await fetch('/splash.json');
      if (jsonRes.ok) {
        let data = await jsonRes.json();
        data = removeWatermark(data);
        loadLottieData(data);
        return;
      }
    } catch (e) {
      console.log('No public/splash.json found');
    }

    try {
      // 2. Try public/splash.mp4
      const vidRes = await fetch('/splash.mp4', { method: 'HEAD' });
      if (vidRes.ok) {
        setIsVideo(true);
        setVideoSrc('/splash.mp4');
        setIsLoaded(true);
        return;
      }
    } catch (e) {
      console.log('No public/splash.mp4 found');
    }

    // 3. Fallback: try default src/assets
    try {
      const defaultData = await import('../assets/splashAnimation.json');
      let data = defaultData.default || defaultData;
      data = removeWatermark(JSON.parse(JSON.stringify(data)));
      loadLottieData(data);
    } catch (e) {
      console.log('Fallback to logo placeholder');
      setErrorMsg('No animation file loaded yet');
    }
  };

  useEffect(() => {
    tryLoadFromPublic();

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          let parsed = JSON.parse(event.target?.result as string);
          parsed = removeWatermark(parsed);
          loadLottieData(parsed);
        } catch (err) {
          setErrorMsg('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm')) {
      if (animRef.current) {
        animRef.current.destroy();
      }
      const url = URL.createObjectURL(file);
      setIsVideo(true);
      setVideoSrc(url);
      setIsLoaded(true);
      setErrorMsg(null);
    }
  };

  const handleReplay = () => {
    setIsPlaying(true);
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    } else if (animRef.current) {
      animRef.current.goToAndPlay(0, true);
    }
  };

  const togglePlay = () => {
    if (isVideo && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (animRef.current) {
      if (isPlaying) {
        animRef.current.pause();
      } else {
        animRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div 
      id="gamers-grid-splash-screen"
      className="fixed inset-0 w-full h-full bg-[#121212] flex flex-col items-center justify-between px-4 py-8 z-50 overflow-hidden select-none"
    >
      {/* Ambient background styling */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#5003BD] opacity-[0.03] rounded-full blur-[140px]" />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #5003BD 1px, transparent 1px), linear-gradient(to bottom, #5003BD 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#7A22EC] opacity-[0.03] rounded-full blur-[120px]" />
      </div>

      {/* Center Display: Lottie or Video Player */}
      <div className="flex flex-col items-center justify-center my-auto z-10 w-full max-w-xl">
        <div className="relative w-full aspect-video flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#5003BD]/10 via-transparent to-[#7A22EC]/10 rounded-2xl filter blur-2xl pointer-events-none" />

          {isVideo && videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              muted
              playsInline
              onEnded={() => {
                if (autoComplete && onComplete) {
                  setTimeout(() => onComplete(), 500);
                }
              }}
              className="w-full h-full max-w-[560px] object-contain rounded-2xl drop-shadow-[0_0_35px_rgba(122,34,236,0.5)]"
            />
          ) : (
            <div 
              ref={containerRef} 
              className="w-full h-full max-w-[560px] flex items-center justify-center drop-shadow-[0_0_35px_rgba(122,34,236,0.3)]"
              style={{ minHeight: '300px' }}
            />
          )}

          {errorMsg && !isLoaded && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <GamersGridLogo size={96} color="#7A22EC" glow={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
