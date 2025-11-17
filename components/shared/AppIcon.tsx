import React, { useState, useEffect } from 'react';
import { AppWindow } from 'lucide-react';
import { isUrl } from '../../utils/url.ts';

interface AppIconProps {
    icon: string;
    name: string;
    className?: string;
}

const AppIcon: React.FC<AppIconProps> = ({ icon, name, className = "h-10 w-10 text-xl" }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [icon]);

    const handleError = () => {
        setHasError(true);
    };

    if (hasError || !icon) {
        return (
            <div className={`flex items-center justify-center rounded-lg bg-gray-200 text-gray-500 ${className}`}>
                <AppWindow size="60%" />
            </div>
        );
    }

    if (isUrl(icon)) {
        return (
            <img
                src={icon}
                alt={`${name} icon`}
                className={`object-contain ${className}`}
                onError={handleError}
            />
        );
    }

    // Fallback for emoji or text
    return (
        <div className={`flex items-center justify-center rounded-lg ${className}`}>
            <span style={{ fontSize: '150%' }}>{icon}</span>
        </div>
    );
};

export default AppIcon;