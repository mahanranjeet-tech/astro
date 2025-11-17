

import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { NotificationType } from '../../types.ts';

export const ExpiryWarningBanner: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
        <div className="flex items-start">
            <div className="py-1 flex-shrink-0"><AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" /></div>
            <div className="flex-grow">
                <p className="font-bold">Account expiring soon</p>
                <p className="text-sm">Your account access expires today. Please contact an administrator to renew your access to avoid service interruption.</p>
            </div>
             <button onClick={onClose} className="ml-4 -mt-1 -mr-1 p-1 rounded-full text-yellow-500 hover:bg-yellow-200 transition-colors" aria-label="Close">
                <X className="h-5 w-5" />
            </button>
        </div>
    </div>
);

interface NotificationProps {
    message: string;
    type: NotificationType;
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Mount animation
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);
    
    const typeStyles = {
        success: {
            bg: 'bg-green-600',
            icon: <CheckCircle className="h-6 w-6" />
        },
        error: {
            bg: 'bg-red-600',
            icon: <AlertTriangle className="h-6 w-6" />
        },
        info: {
            bg: 'bg-blue-600',
            icon: <Info className="h-6 w-6" />
        },
    };

    const currentStyle = typeStyles[type] || typeStyles.info;

    return (
        <div 
            className="fixed top-6 right-6 z-[9999] pointer-events-none"
            role="alert"
            aria-live="assertive"
        >
            <div 
                 className={`pointer-events-auto transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
            >
                <div className={`flex items-center gap-4 text-white font-semibold px-5 py-3 rounded-lg shadow-2xl ${currentStyle.bg}`}>
                    {currentStyle.icon}
                    <span>{message}</span>
                    <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-black/20 transition-colors" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Notification;