import React, { useEffect, useRef, useState } from 'react';

interface GeometricLoaderProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

interface Vertex {
    angle: number; // in degrees
    radius: number; // current normalized radius (0-1)
    targetRadius: number; // target normalized radius to animate towards
    speed: number; // speed of change for this specific movement leg
}

const GeometricLoader: React.FC<GeometricLoaderProps> = ({
    size = 100,
    color = 'currentColor',
    strokeWidth = 1.5,
    className = '',
}) => {
    const center = size / 2;
    const maxRadius = (size / 2) * 0.9;

    // State to hold the current animation frame's vertices
    const [vertices, setVertices] = useState<Vertex[]>([]);
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    // Initialize vertices on mount
    useEffect(() => {
        const numPoints = 12;
        const initialVertices: Vertex[] = [];

        for (let i = 0; i < numPoints; i++) {
            const angleStep = 360 / numPoints;
            const angleBase = i * angleStep;
            // Randomize initial angle slightly
            const angleRandom = (Math.random() - 0.5) * (angleStep * 0.5);

            initialVertices.push({
                angle: angleBase + angleRandom,
                radius: 0.4 + Math.random() * 0.5, // Start with random size
                targetRadius: 0.4 + Math.random() * 0.6,
                speed: 0.002 + Math.random() * 0.003 // Random speed
            });
        }
        setVertices(initialVertices);
    }, []);

    // Animation Loop
    const animate = (time: number) => {
        setVertices(prevVertices => {
            return prevVertices.map(v => {
                let { radius, targetRadius, speed } = v;

                // Move radius towards target
                if (radius < targetRadius) {
                    radius += speed;
                    if (radius >= targetRadius) radius = targetRadius;
                } else {
                    radius -= speed;
                    if (radius <= targetRadius) radius = targetRadius;
                }

                // If we reached the target (or are very close), pick a new target
                if (Math.abs(radius - targetRadius) < 0.01) {
                    targetRadius = 0.4 + Math.random() * 0.6; // New random target between 0.4 and 1.0
                    speed = 0.005 + Math.random() * 0.015; // New random speed for variety
                }

                return { ...v, radius, targetRadius, speed };
            });
        });

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        // Start animation
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    // Convert polar to cartesian
    const getPoint = (v: Vertex) => {
        const rad = (v.angle * Math.PI) / 180;
        const r = v.radius * maxRadius;
        const x = center + r * Math.cos(rad);
        const y = center + r * Math.sin(rad);
        return { x, y };
    };

    if (vertices.length === 0) return null;

    const points = vertices.map(getPoint);

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
                {/* Radial Lines: Center to Vertex */}
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
                        className="animate-draw"
                        style={{
                            strokeDasharray: 100,
                            strokeDashoffset: 100,
                            animation: `drawStroke 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                            animationDelay: `${i * 0.05}s` // Stagger drawing slightly
                        }}
                    />
                ))}

                {/* Perimeter Lines: Vertex to Next Vertex */}
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
                                animationDelay: `${0.5 + i * 0.05}s` // Draw perimeter after radials start
                            }}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default GeometricLoader;
