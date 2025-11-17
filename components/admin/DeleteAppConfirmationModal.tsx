import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AppDefinition } from '../../types.ts';

interface DeleteAppConfirmationModalProps {
    app: AppDefinition | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

const DeleteAppConfirmationModal: React.FC<DeleteAppConfirmationModalProps> = ({ app, onClose, onConfirm }) => {
    if (!app) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Application</h3>
                <div className="mt-2 text-sm text-gray-500">
                    <p>Are you sure you want to delete the application <strong className="font-bold">{app.name}</strong>?</p>
                    <p className="mt-2 text-xs text-red-600">This action cannot be undone and will remove the app from the portal. It will not remove it from users' assigned app lists.</p>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="w-full rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Confirm Delete</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAppConfirmationModal;