
import React, { useState } from 'react';

const slogans = [
    "Harnessing cosmic energy for a harmonious life.",
    "Aligning your space with the stars for prosperity.",
    "Where ancient wisdom meets modern living.",
    "Unlocking the secrets of numbers to reveal your path.",
    "Crafting your destiny, one number at a time.",
    "Building your future on the foundation of Vastu.",
    "The architecture of fortune is in your hands.",
    "Numerology: The roadmap of your life's journey.",
    "Balancing energies, transforming lives.",
    "Designing spaces that resonate with success."
];

const InitialLoadingScreen: React.FC = () => {
    // Read the slogan from the server-rendered data attribute to prevent flicker.
    // Fallback to a random slogan if the attribute is not present.
    const [slogan] = useState(() => {
        if (typeof document !== 'undefined') {
            const rootEl = document.getElementById('root');
            return rootEl?.dataset.initialSlogan || slogans[Math.floor(Math.random() * slogans.length)];
        }
        return slogans[Math.floor(Math.random() * slogans.length)];
    });

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-slate-50">
            <svg className="animate-spin h-10 w-10 text-blue-600 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl font-semibold text-gray-700 italic">"{slogan}"</p>
        </div>
    );
};

export default InitialLoadingScreen;
