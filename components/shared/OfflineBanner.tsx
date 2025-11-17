import React from 'react';
import { WifiOff } from 'lucide-react';

const OfflineBanner: React.FC = () => {
    return (
        <div 
            className="fixed top-0 left-0 right-0 bg-yellow-600 text-white h-8 text-center z-[9999] flex items-center justify-center gap-2"
            role="alert"
            aria-live="assertive"
        >
            <WifiOff size={18} />
            <span className="text-sm font-semibold">
                You are currently offline. The app is using cached data.
            </span>
        </div>
    );
};

export default OfflineBanner;
