import React, { useEffect, useRef, useState, useMemo } from 'react';

interface GeometricLoaderProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

interface Vertex {
    angle: number;       // in degrees
    baseRadius: number;  // The "resting" radius (0.4 - 0.7)
    phase: number;       // Offset for the sine wave (0 - 2PI)
}

const GeometricLoader: React.FC<GeometricLoaderProps> = ({
    size = 100,
    color = 'currentColor',
    strokeWidth = 1.5,
    className = '',
}) => {
    const center = size / 2;
    const maxRadius = (size / 2) * 0.9;

    // Static definition of the shape's topology. 
    // We only store the invariant properties here.
    const verticesConfig = useMemo<Vertex[]>(() => {
        const numPoints = 12;
        const points: Vertex[] = [];
        for (let i = 0; i < numPoints; i++) {
            const angleStep = 360 / numPoints;
            const angleBase = i * angleStep;
            const angleRandom = (Math.random() - 0.5) * (angleStep * 0.5);

            points.push({
                angle: angleBase + angleRandom,
                baseRadius: 0.5 + Math.random() * 0.3, // Irregular shape base
                // Phase creates the "wave" effect. 
                // Using i * 0.5 makes the wave travel around the circle.
                // Adding random gives it a slightly loose, organic feel.
                phase: (i * 0.5) + (Math.random() * 0.2)
            });
        }
        return points;
    }, []);

    // We only track the *current radii* in state to trigger re-renders
    const [currentRadii, setCurrentRadii] = useState<number[]>([]);
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(document.timeline ? document.timeline.currentTime as number : performance.now());

    const animate = (time: number) => {
        // Calculate elapsed time in seconds
        const t = (time - startTimeRef.current) / 1000;

        // Animation Parameters
        const speed = 0.8; // Radians per second (slow breathing)
        const amplitude = 0.15; // How much it expands/contracts

        const newRadii = verticesConfig.map(v => {
            // Sine wave formula: Base + Amp * sin(Time * Speed + Phase)
            const r = v.baseRadius + amplitude * Math.sin(t * speed + v.phase);
            // Clamp to avoid inverted shapes or too large shapes
            return Math.max(0.2, Math.min(1.0, r));
        });

        setCurrentRadii(newRadii);
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [verticesConfig]);

    // If no radii calculated yet, render nothing (or static base)
    if (currentRadii.length === 0) return null;

    // Map configuration + current dynamic radii to Cartesian points
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
                            strokeDashoffset: 100, // Start hidden
                            // Use a standard CSS animation for the entry. 
                            // Since this component re-renders every frame for the Shape,
                            // we rely on the DOM element persistence for the CSS animation to run smoothly.
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
