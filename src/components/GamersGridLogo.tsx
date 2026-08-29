import React from 'react';

interface GamersGridLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
  color?: string;
  glow?: boolean;
}

export const GamersGridLogo: React.FC<GamersGridLogoProps> = ({
  className = '',
  size = 32,
  showText = false,
  textColor = 'text-white',
  color = '#5003BD',
  glow = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className={`relative flex items-center justify-center transition-transform hover:scale-105 duration-200 ${
          glow ? 'drop-shadow-[0_0_12px_rgba(80,3,189,0.7)]' : ''
        }`}
        style={{ width: size, height: size * 0.72 }}
      >
        <svg
          viewBox="0 0 450 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain"
        >
          {/* Gamers Grid Controller Vector Shape */}
          {/* Main Controller Body with Signature Top & Right Cuts */}
          <path
            d="M 215 110 
               C 215 75, 185 45, 140 45 
               C 85 45, 45 95, 45 155 
               C 45 205, 75 255, 115 255 
               C 145 255, 165 220, 185 185 
               C 205 185, 245 185, 265 185 
               C 285 220, 305 255, 335 255 
               C 375 255, 405 205, 405 155 
               C 405 142, 403 130, 400 120 
               L 355 128 
               C 358 136, 360 145, 360 155 
               C 360 185, 340 215, 320 215 
               C 305 215, 290 190, 275 160 
               C 255 150, 195 150, 175 160 
               C 160 190, 145 215, 130 215 
               C 110 215, 90 185, 90 155 
               C 90 110, 115 85, 140 85 
               C 165 85, 175 100, 175 110 
               Z"
            fill={color}
          />
          {/* Top Right Distinctive Arc Cutout Section */}
          <path
            d="M 235 110 
               C 235 75, 265 45, 310 45 
               C 355 45, 395 78, 403 120 
               L 358 128 
               C 350 100, 330 85, 310 85 
               C 285 85, 275 100, 275 110 
               Z"
            fill={color}
          />
          
          {/* D-Pad on Left Handle */}
          {/* Vertical Bar */}
          <rect x="133" y="118" width="24" height="60" rx="6" fill={color} />
          {/* Horizontal Bar */}
          <rect x="115" y="136" width="60" height="24" rx="6" fill={color} />

          {/* Action Buttons (4 Dots Diamond) on Right Handle */}
          {/* Top Button */}
          <circle cx="310" cy="126" r="10.5" fill={color} />
          {/* Left Button */}
          <circle cx="288" cy="148" r="10.5" fill={color} />
          {/* Right Button */}
          <circle cx="332" cy="148" r="10.5" fill={color} />
          {/* Bottom Button */}
          <circle cx="310" cy="170" r="10.5" fill={color} />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span className={`font-gaming text-xl sm:text-2xl font-black tracking-wider uppercase ${textColor}`}>
              GAMERS
            </span>
            <span className="font-gaming text-xl sm:text-2xl font-black tracking-wider uppercase text-[#7A22EC]">
              GRID
            </span>
          </div>
          <span className="text-[9px] font-semibold text-[#999999] tracking-widest uppercase">
            Worldwide Gaming Social
          </span>
        </div>
      )}
    </div>
  );
};
