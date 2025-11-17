
import React from 'react';
import { User, TrendingDown, Clock } from 'lucide-react';
import type { UserProfile } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';

interface UserCreditSummaryCardProps {
    user: UserProfile;
    summary: {
        totalCredits: number;
        lastActivity?: any;
    };
    onClick: () => void;
}

const UserCreditSummaryCard: React.FC<UserCreditSummaryCardProps> = ({ user, summary, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-5 bg-white rounded-xl shadow-lg border border-gray-200 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="text-blue-500" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate" title={user.name}>{user.name}</p>
                    <p className="text-sm text-gray-500 truncate" title={user.email || ''}>{user.email}</p>
                </div>
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                    <div className="flex items-center gap-1.5">
                        <TrendingDown size={14} className="text-red-500" />
                        <span>Total Credits Used</span>
                    </div>
                    <span className="font-mono font-bold text-red-600">{summary.totalCredits}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                     <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <span>Last Activity</span>
                    </div>
                    <span className="font-mono text-xs">{formatTimestamp(summary.lastActivity)}</span>
                </div>
            </div>
        </button>
    );
};

export default UserCreditSummaryCard;