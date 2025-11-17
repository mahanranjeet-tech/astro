
import React, { useState } from 'react';
import { Key, Shield } from 'lucide-react';
import { auth, db } from '../../services/firebase.ts';
import type { UserProfile, NotificationType } from '../../types.ts';

interface ForcePasswordChangeProps {
    user: UserProfile;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ user, showNotification }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChanging, setIsChanging] = useState(false);

    const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showNotification('Password must be at least 6 characters long.', 'error');
            return;
        }

        setIsChanging(true);
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                await currentUser.updatePassword(newPassword);
                const userDocRef = db.collection("users").doc(user.id);
                await userDocRef.update({ mustChangePassword: false });
                showNotification('Password updated successfully! The app will now reload.', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                 showNotification('No authenticated user found. Please log in again.', 'error');
            }
        } catch (error: any) {
            showNotification(`Password update failed: ${error.message}. Please try logging in again.`, 'error');
            console.error(error);
        } finally {
            setIsChanging(false);
        }
    };
    
    return (
         <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <Shield size={48} className="mx-auto text-blue-600 mb-3" />
                    <h1 className="text-2xl font-bold text-gray-900">Set Your New Password</h1>
                    <p className="mt-2 text-gray-600">For security, you must change your temporary password before proceeding.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleChangePassword}>
                     <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="New Password"/>
                    </div>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="Confirm New Password"/>
                    </div>
                    <div>
                         <button type="submit" disabled={isChanging} className="w-full flex justify-center items-center py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:bg-blue-300">
                            {isChanging ? 'Updating...' : 'Set New Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChange;