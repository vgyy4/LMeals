import React from 'react';
import GeometricLoader from '../components/GeometricLoader';

const LoaderTestPage: React.FC = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-slate-800">Geometric Loader Test</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Card 1: Default / Large */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
                    <h2 className="text-lg font-semibold text-slate-500 mb-8 self-start w-full border-b border-slate-100 pb-2">
                        Base Variant (Large)
                    </h2>
                    <GeometricLoader size={200} className="text-slate-800" />
                </div>

                {/* Card 2: Colored / Small */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
                    <h2 className="text-lg font-semibold text-slate-500 mb-8 self-start w-full border-b border-slate-100 pb-2">
                        Colored Variant (Small)
                    </h2>
                    <div className="flex gap-8 items-center">
                        <GeometricLoader size={64} className="text-p-coral" />
                        <GeometricLoader size={64} className="text-p-mint" />
                        <GeometricLoader size={64} className="text-p-sky" />
                    </div>
                </div>

                {/* Card 3: Dark Mode Simulation */}
                <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
                    <h2 className="text-lg font-semibold text-slate-400 mb-8 self-start w-full border-b border-slate-800 pb-2">
                        Dark Background
                    </h2>
                    <GeometricLoader size={120} className="text-white" />
                </div>

            </div>
        </div>
    );
};

export default LoaderTestPage;
