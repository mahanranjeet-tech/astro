import React from 'react';

interface SummaryCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, description }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-start gap-4">
            <div className="bg-blue-100 text-blue-600 rounded-full p-3 flex-shrink-0">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider truncate">{title}</p>
                <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
                {description && <p className="text-sm text-gray-500 mt-2 truncate">{description}</p>}
            </div>
        </div>
    );
};

export default SummaryCard;