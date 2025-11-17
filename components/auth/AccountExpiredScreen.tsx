import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { UserProfile } from '../../types.ts';

interface AccountExpiredScreenProps {
    user: UserProfile;
    onLogout: () => Promise<void>;
}

const AccountExpiredScreen: React.FC<AccountExpiredScreenProps> = ({ user, onLogout }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Account Expired</h1>
                <p className="mt-2 text-gray-600">
                    Hello, <span className="font-semibold">{user.name || user.email}</span>. Your account access has expired.
                </p>
                <p className="mt-1 text-gray-600">
                    Please contact an administrator to renew your access.
                </p>
                <div className="mt-8">
                    <button
                        onClick={onLogout}
                        className="w-full flex justify-center items-center py-3 px-4 text-white bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountExpiredScreen;