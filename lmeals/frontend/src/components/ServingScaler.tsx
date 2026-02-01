import React, { useRef, useEffect, useState } from 'react';

interface ServingScalerProps {
    originalServings: string;
    yieldUnit?: string;
    onScaleChange: (multiplier: number) => void;
}

const ServingScaler: React.FC<ServingScalerProps> = ({ originalServings, yieldUnit, onScaleChange }) => {
    const [selected, setSelected] = useState<string>('1x');
    const [customValue, setCustomValue] = useState<string>('');
    const [markerStyle, setMarkerStyle] = useState({ left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract number from original servings, handling ranges (e.g., "20-24" -> use 20)
    const extractBaseNumber = (servings: string): number => {
        // Check for range first (e.g., "20-24")
        const rangeMatch = servings.match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
            return parseInt(rangeMatch[1]); // Use minimum value from range
        }
        // Single number
        const match = servings.match(/(\d+)/);
        return parseInt(match?.[0] || '4');
    };

    const basePeople = extractBaseNumber(originalServings);

    const options = [
        { id: '0.5x', label: `${Math.round(basePeople * 0.5)}`, sub: 'Half' },
        { id: '1x', label: `${basePeople}`, sub: 'Orig' },
        { id: '2x', label: `${Math.round(basePeople * 2)}`, sub: 'Double' },
        { id: 'custom', label: 'Custom', sub: '' }
    ];

    useEffect(() => {
        updateMarker();
        window.addEventListener('resize', updateMarker);
        return () => window.removeEventListener('resize', updateMarker);
    }, [selected]);

    const updateMarker = () => {
        if (containerRef.current) {
            const activeElement = containerRef.current.querySelector(`[data-id="${selected}"]`) as HTMLElement;
            if (activeElement) {
                setMarkerStyle({
                    left: activeElement.offsetLeft,
                    width: activeElement.offsetWidth
                });
            }
        }
    };

    const handleSelect = (id: string) => {
        setSelected(id);
        if (id === '0.5x') onScaleChange(0.5);
        else if (id === '1x') onScaleChange(1);
        else if (id === '2x') onScaleChange(2);
        // Custom handled by Input
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomValue(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            // Scale is (custom people / base people)
            onScaleChange(num / basePeople);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
                ref={containerRef}
                className="relative flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full sm:w-min min-w-[320px]"
            >
                {/* Animated Background Marker */}
                <div
                    className="absolute bg-white rounded-xl shadow-sm transition-all duration-300 ease-out z-0"
                    style={{
                        left: `${markerStyle.left}px`,
                        top: '6px',
                        width: `${markerStyle.width}px`,
                        height: 'calc(100% - 12px)'
                    }}
                />

                {options.map((opt) => (
                    <div
                        key={opt.id}
                        data-id={opt.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelect(opt.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelect(opt.id)}
                        className={`relative z-10 flex-1 px-4 py-2.5 flex flex-col items-center justify-center transition-all duration-300 outline-none select-none cursor-pointer ${selected === opt.id ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <span className="text-sm font-black uppercase tracking-tight leading-none mb-0.5 pointer-events-none">
                            {opt.label}
                        </span>
                        <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none pointer-events-none">
                            {opt.sub}
                        </span>
                    </div>
                ))}
            </div>

            {/* Custom Input Field */}
            {selected === 'custom' && (
                <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                    <span className="text-slate-500 font-bold">for</span>
                    <div className="relative group">
                        <input
                            type="number"
                            value={customValue}
                            onChange={handleCustomChange}
                            placeholder={basePeople.toString()}
                            autoFocus
                            className="w-24 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-center font-black text-slate-800 focus:border-p-mint focus:ring-0 transition-all outline-none"
                        />
                        <div className="absolute inset-0 rounded-xl bg-p-mint/10 scale-0 group-focus-within:scale-110 transition-transform -z-10" />
                    </div>
                    <span className="text-slate-500 font-bold">{yieldUnit || 'servings'}</span>
                </div>
            )}
        </div>
    );
};

export default ServingScaler;
