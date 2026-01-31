import React, { useMemo } from 'react';

interface GeometricLoaderProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

interface Vertex {
    angle: number; // in degrees
    radius: number; // normalized 0-1 (relative to half-size)
}

const GeometricLoader: React.FC<GeometricLoaderProps> = ({
    size = 100,
    color = 'currentColor',
    strokeWidth = 1.5,
    className = '',
}) => {
    const center = size / 2;
    const maxRadius = (size / 2) * 0.9; // keep some padding

    // Generate static vertices for the "shattered/geometric" look.
    // We use a fixed seed or just useMemo with no deps to keep it consistent per mount.
    // In the future, these radii will be animated.
    const vertices = useMemo<Vertex[]>(() => {
        const numPoints = 12;
        const points: Vertex[] = [];
        for (let i = 0; i < numPoints; i++) {
            // Distribute points around the circle
            const angleStep = 360 / numPoints;
            const angleBase = i * angleStep;

            // Add some randomness to the angle to make it less perfect
            const angleRandom = (Math.random() - 0.5) * (angleStep * 0.5);

            // Randomize radius to create the irregular "shard" look
            // varying between 0.4 and 1.0 of max radius
            const radius = 0.4 + Math.random() * 0.6;

            points.push({
                angle: angleBase + angleRandom,
                radius: radius
            });
        }
        return points;
    }, []);

    // Convert polar to cartesian for rendering
    const getPoint = (v: Vertex) => {
        const rad = (v.angle * Math.PI) / 180;
        const r = v.radius * maxRadius;
        const x = center + r * Math.cos(rad);
        const y = center + r * Math.sin(rad);
        return { x, y };
    };

    const points = vertices.map(getPoint);

    return (
        <div className={`inline-flex items-center justify-center ${className}`}>
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
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default GeometricLoader;
