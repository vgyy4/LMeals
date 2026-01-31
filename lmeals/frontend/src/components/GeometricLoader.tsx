import React, { useEffect, useRef, useState, useMemo } from 'react';

interface GeometricLoaderProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

interface Vertex {
    angle: number;       // in degrees
    baseRadius: number;  // The "resting" radius

    // We use 3 different sine waves for each vertex to create complex interference
    phase1: number;
    speed1: number;

    phase2: number;
    speed2: number;

    phase3: number;
    speed3: number;
}

const GeometricLoader: React.FC<GeometricLoaderProps> = ({
    size = 100,
    color = 'currentColor',
    strokeWidth = 1.5,
    className = '',
}) => {
    const center = size / 2;
    const maxRadius = (size / 2) * 0.9;

    const verticesConfig = useMemo<Vertex[]>(() => {
        const numPoints = 12;
        const points: Vertex[] = [];
        for (let i = 0; i < numPoints; i++) {
            const angleStep = 360 / numPoints;
            const angleBase = i * angleStep;
            const angleRandom = (Math.random() - 0.5) * (angleStep * 0.5);

            // Use Prime numbers components for speeds to avoid common denominators (repetitive loops)
            // Base speeds are very slow for "calming" effect
            points.push({
                angle: angleBase + angleRandom,
                baseRadius: 0.45 + Math.random() * 0.2,

                // Wave 1: The "Main" breathing
                phase1: Math.random() * Math.PI * 2,
                speed1: 0.4 + Math.random() * 0.2,

                // Wave 2: Faster variation
                phase2: Math.random() * Math.PI * 2,
                speed2: 0.6 + Math.random() * 0.4,

                // Wave 3: Slow underlying drift
                phase3: Math.random() * Math.PI * 2,
                speed3: 0.2 + Math.random() * 0.1,
            });
        }
        return points;
    }, []);

    const [currentRadii, setCurrentRadii] = useState<number[]>([]);
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(document.timeline ? document.timeline.currentTime as number : performance.now());

    const animate = (time: number) => {
        const t = (time - startTimeRef.current) / 1000;

        // Amplitudes for each wave layer
        const amp1 = 0.15;
        const amp2 = 0.08;
        const amp3 = 0.10;

        const newRadii = verticesConfig.map(v => {
            // Sum of Sines
            const wave1 = Math.sin(t * v.speed1 + v.phase1) * amp1;
            const wave2 = Math.sin(t * v.speed2 + v.phase2) * amp2;
            const wave3 = Math.sin(t * v.speed3 + v.phase3) * amp3;

            let r = v.baseRadius + wave1 + wave2 + wave3;

            // Clamp
            return Math.max(0.2, Math.min(1.0, r));
        });

        setCurrentRadii(newRadii);
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [verticesConfig]);

    if (currentRadii.length === 0) return null;

    const points = verticesConfig.map((v, i) => {
        const r = currentRadii[i] * maxRadius;
        const rad = (v.angle * Math.PI) / 180;
        return {
            x: center + r * Math.cos(rad),
            y: center + r * Math.sin(rad)
        };
    });

    return (
        <div className={`inline-flex items-center justify-center ${className}`}>
            <style>
                {`
          @keyframes drawStroke {
            from { stroke-dashoffset: 100; }
            to { stroke-dashoffset: 0; }
          }
        `}
            </style>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Radial Lines */}
                {points.map((p, i) => (
                    <line
                        key={`radial-${i}`}
                        x1={center}
                        y1={center}
                        x2={p.x}
                        y2={p.y}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        opacity={0.8}
                        pathLength={100}
                        style={{
                            strokeDasharray: 100,
                            strokeDashoffset: 100,
                            animation: `drawStroke 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                            animationDelay: `${i * 0.05}s`
                        }}
                    />
                ))}

                {/* Perimeter Lines */}
                {points.map((p, i) => {
                    const nextP = points[(i + 1) % points.length];
                    return (
                        <line
                            key={`perimeter-${i}`}
                            x1={p.x}
                            y1={p.y}
                            x2={nextP.x}
                            y2={nextP.y}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            pathLength={100}
                            style={{
                                strokeDasharray: 100,
                                strokeDashoffset: 100,
                                animation: `drawStroke 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                                animationDelay: `${0.5 + i * 0.05}s`
                            }}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default GeometricLoader;
