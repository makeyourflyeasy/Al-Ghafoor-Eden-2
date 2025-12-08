
import React from 'react';
import { BuildingIcon } from './Icons';

const SplashScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo Animation */}
                <div className="mb-8 relative animate-float">
                    <div className="absolute inset-0 bg-brand-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                    <BuildingIcon className="w-32 h-32 text-white drop-shadow-2xl relative z-10" />
                </div>

                {/* Text Animation */}
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-2 animate-fadeIn opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                    AL GHAFOOR <span className="text-brand-500">EDEN</span>
                </h1>
                
                <p className="text-slate-400 text-sm md:text-lg uppercase tracking-[0.3em] font-medium animate-fadeIn opacity-0" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                    Premium Living Community
                </p>

                {/* Loader Bar */}
                <div className="mt-12 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden relative animate-fadeIn opacity-0" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}>
                    <div className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600 animate-progress w-0" style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}></div>
                </div>
            </div>
            
            {/* Footer Text */}
            <div className="absolute bottom-8 text-slate-600 text-xs animate-fadeIn opacity-0" style={{ animationDelay: '2s', animationFillMode: 'forwards' }}>
                &copy; {new Date().getFullYear()} Management System. All Rights Reserved.
            </div>
        </div>
    );
};

export default SplashScreen;
