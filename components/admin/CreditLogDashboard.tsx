import React, { useState, useMemo } from 'react';
import { Search, ClipboardList } from 'lucide-react';
import type { UserProfile, AppDefinition, CreditLog } from '../../types.ts';
import UserCreditSummaryCard from './UserCreditSummaryCard.tsx';
import UserCreditDetailView from './UserCreditDetailView.tsx';

interface CreditLogDashboardProps {
    users: UserProfile[];
    apps: AppDefinition[];
    creditLogs: CreditLog[];
}

interface UserSummary {
    totalCredits: number;
    lastActivity?: any;
}

const CreditLogDashboard: React.FC<CreditLogDashboardProps> = ({ users, apps, creditLogs }) => {
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const userSummaries = useMemo(() => {
        const summaries: Record<string, UserSummary> = {};
        users.forEach(user => {
            summaries[user.id] = { totalCredits: 0 };
        });

        creditLogs.forEach(log => {
            if (summaries[log.userId]) {
                summaries[log.userId].totalCredits += log.creditsDeducted;
                if (!summaries[log.userId].lastActivity || log.timestamp > summaries[log.userId].lastActivity) {
                    summaries[log.userId].lastActivity = log.timestamp;
                }
            }
        });

        return summaries;
    }, [users, creditLogs]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowercasedTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            user.name.toLowerCase().includes(lowercasedTerm) ||
            (user.email && user.email.toLowerCase().includes(lowercasedTerm)) ||
            (user.phone && user.phone.includes(searchTerm))
        );
    }, [users, searchTerm]);


    if (selectedUser) {
        return (
            <UserCreditDetailView
                user={selectedUser}
                logs={creditLogs.filter(log => log.userId === selectedUser.id)}
                apps={apps}
                onBack={() => setSelectedUser(null)}
            />
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Credit Usage Reports</h2>
                    <p className="text-gray-500 mt-1">Select a user to view their detailed credit usage log and generate reports.</p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>
            </div>
            
            {filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map(user => (
                        <UserCreditSummaryCard
                            key={user.id}
                            user={user}
                            summary={userSummaries[user.id] || { totalCredits: 0 }}
                            onClick={() => setSelectedUser(user)}
                        />
                    ))}
                </div>
            ) : (
                 <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center text-gray-500">
                    <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold">No Users Found</h3>
                    <p>No users match your search criteria.</p>
                </div>
            )}
        </div>
    );
};

export default CreditLogDashboard;