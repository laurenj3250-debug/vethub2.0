'use client';

import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
  size: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 8,
  }));
}

interface CSSConfettiProps {
  active: boolean;
  duration?: number;
}

export function CSSConfetti({ active, duration = 3000 }: CSSConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setPieces(generateConfetti(50));
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes confetti-wobble {
          0%, 100% {
            transform: translateX(-15px);
          }
          50% {
            transform: translateX(15px);
          }
        }
      `}</style>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
          }}
        >
          <div
            style={{
              width: `${piece.size}px`,
              height: `${piece.size * 0.6}px`,
              backgroundColor: piece.color,
              borderRadius: '2px',
              transform: `rotate(${piece.rotation}deg)`,
              animation: `confetti-wobble ${0.5 + Math.random() * 0.5}s ease-in-out infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
