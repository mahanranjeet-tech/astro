import React, { useState } from 'react';

interface TruncatedTextProps {
    text: string;
    maxLength?: number;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({ text, maxLength = 80 }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text || text.length <= maxLength) {
        return <p className="text-sm text-gray-600 mb-4 min-h-[3rem]">{text || 'No description provided.'}</p>;
    }

    const toggleExpansion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const displayedText = isExpanded ? text : `${text.substring(0, maxLength)}...`;

    return (
        <div className="text-sm text-gray-600 mb-4 min-h-[3rem]">
            <p>{displayedText}</p>
            <button onClick={toggleExpansion} className="text-blue-600 hover:underline font-semibold text-xs mt-1">
                {isExpanded ? 'Read less' : 'Read more'}
            </button>
        </div>
    );
};

export default TruncatedText;
