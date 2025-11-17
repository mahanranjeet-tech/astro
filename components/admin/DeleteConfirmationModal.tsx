import React from 'react';
import type { UserProfile } from '../../types.ts';

interface DeleteConfirmationModalProps {
    user: UserProfile | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ user, onClose, onConfirm }) => {
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                 <h3 className="text-lg font-medium text-gray-900 mt-4">Delete User Record</h3>
                <div className="mt-2 text-sm text-gray-500">
                    <p>Are you sure you want to delete the database record for <strong className="font-bold">{user.name}</strong> ({user.email})?</p>
                    <p className="mt-2 text-xs text-red-600">This action cannot be undone and only removes the profile, not the login credentials from Firebase Auth.</p>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="w-full rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Confirm Delete</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;