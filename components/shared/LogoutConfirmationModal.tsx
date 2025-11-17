import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';

interface LogoutConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                 <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Are you sure you want to logout?</h3>
                <div className="mt-2 text-sm text-gray-500">
                    <p>All your data in the current session will be lost.</p>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="w-full rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 flex items-center justify-center gap-2">
                        <LogOut size={16}/> Yes, Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmationModal;
