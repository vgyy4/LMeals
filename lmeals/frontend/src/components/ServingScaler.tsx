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

    // Extract number of people from original servings (e.g., "4 people" -> 4)
    const basePeople = parseInt(originalServings.match(/(\d+)/)?.[0] || '4');

    const options = [
        { id: '0.5x', label: `${Math.round(basePeople * 0.5)}`, sub: 'Half' },
        { id: '1x', label: `${basePeople}`, sub: 'Orig' },
        { id: '2x', label: `${Math.round(basePeople * 2)}`, sub: 'Double' },
        { id: 'custom', label: 'Custom', sub: '...' }
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
        <div className="mb-8">
            <div
                ref={containerRef}
                className="relative flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full sm:w-min min-w-[320px]"
            >
                {/* Animated Background Marker */}
                <div
                    className="absolute h-[calc(100%-12px)] bg-white rounded-xl shadow-md transition-all duration-300 ease-out z-0"
                    style={{
                        left: `${markerStyle.left}px`,
                        width: `${markerStyle.width}px`
                    }}
                />

                {options.map((opt) => (
                    <button
                        key={opt.id}
                        data-id={opt.id}
                        onClick={() => handleSelect(opt.id)}
                        className={`relative z-10 flex-1 px-4 py-2.5 flex flex-col items-center justify-center transition-colors duration-300 ${selected === opt.id ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <span className="text-sm font-black uppercase tracking-tight leading-none mb-0.5">
                            {opt.label}
                        </span>
                        <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none">
                            {opt.sub}
                        </span>
                    </button>
                ))}
            </div>

            {/* Custom Input Field */}
            {selected === 'custom' && (
                <div className="mt-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                    <span className="text-slate-500 font-bold ml-2">for</span>
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
