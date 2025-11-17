
import React from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { AlertTriangle } from 'lucide-react';
import type { Consultant, NotificationType } from '../../types.ts';

interface DeleteConsultantConfirmationModalProps {
    consultant: Consultant;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const DeleteConsultantConfirmationModal: React.FC<DeleteConsultantConfirmationModalProps> = ({ consultant, onClose, showNotification }) => {

    const onConfirm = async () => {
        try {
            const batch = db.batch();
            const consultantRef = db.collection("consultants").doc(consultant.id);

            // Delete the consultant profile
            batch.delete(consultantRef);

            // If a user is linked to this consultant, update the user's profile to remove the link.
            if (consultant.linkedUserId) {
                const userRef = db.collection("users").doc(consultant.linkedUserId);
                batch.update(userRef, {
                    linkedConsultantId: FieldValue.delete()
                });
            }

            // Here you could add logic to delete subcollections if needed.
            
            await batch.commit();

            showNotification(`Consultant '${consultant.name}' and any user links have been deleted successfully.`, 'success');
            onClose();
        } catch (error: any) {
            showNotification(`Error deleting consultant: ${error.message}`, 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Consultant</h3>
                <div className="mt-2 text-sm text-gray-500">
                    <p>Are you sure you want to delete <strong className="font-bold">"{consultant.name}"</strong>?</p>
                    <p className="mt-2 text-xs text-red-600">This action will permanently delete their profile and unlink any associated user. This cannot be undone.</p>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="w-full rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Confirm Delete</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConsultantConfirmationModal;
