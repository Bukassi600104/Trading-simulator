"use client";

import { useEffect, useState, useCallback } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  shape: "square" | "rectangle" | "circle";
}

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number;
  particleCount?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

export default function Confetti({
  isActive,
  onComplete,
  duration = 3000,
  particleCount = 100,
  colors = DEFAULT_COLORS,
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const generateParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const shapes: ("square" | "rectangle" | "circle")[] = ["square", "rectangle", "circle"];

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: 2 + Math.random() * 4,
        rotationSpeed: (Math.random() - 0.5) * 20,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    return newParticles;
  }, [particleCount, colors]);

  useEffect(() => {
    if (isActive && !isPlaying) {
      setIsPlaying(true);
      setParticles(generateParticles());

      const timer = setTimeout(() => {
        setIsPlaying(false);
        setParticles([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, isPlaying, duration, generateParticles, onComplete]);

  if (!isPlaying || particles.length === 0) {
    return null;
  }

  return (
    <div className="confetti-container">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`confetti-particle ${particle.shape}`}
          style={{
            "--x": `${particle.x}%`,
            "--y": `${particle.y}%`,
            "--rotation": `${particle.rotation}deg`,
            "--color": particle.color,
            "--size": `${particle.size}px`,
            "--velocityX": `${particle.velocityX}vw`,
            "--velocityY": `${particle.velocityY * 30}vh`,
            "--rotationSpeed": `${particle.rotationSpeed * 10}deg`,
            "--duration": `${duration}ms`,
          } as React.CSSProperties}
        />
      ))}

      <style jsx>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 99999;
          overflow: hidden;
        }

        .confetti-particle {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: var(--size);
          height: var(--size);
          background: var(--color);
          transform: rotate(var(--rotation));
          animation: fall var(--duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0.9;
        }

        .confetti-particle.rectangle {
          width: calc(var(--size) * 0.5);
          height: var(--size);
          border-radius: 2px;
        }

        .confetti-particle.circle {
          border-radius: 50%;
        }

        .confetti-particle.square {
          border-radius: 2px;
        }

        @keyframes fall {
          0% {
            transform: translateY(0) translateX(0) rotate(var(--rotation));
            opacity: 1;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translateY(var(--velocityY)) translateX(var(--velocityX)) rotate(calc(var(--rotation) + var(--rotationSpeed)));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Hook for easy confetti triggering
export function useConfetti() {
  const [isActive, setIsActive] = useState(false);

  const trigger = useCallback(() => {
    setIsActive(true);
  }, []);

  const reset = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    trigger,
    reset,
    Confetti: (props: Omit<ConfettiProps, "isActive" | "onComplete">) => (
      <Confetti {...props} isActive={isActive} onComplete={reset} />
    ),
  };
}
