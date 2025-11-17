import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PaymentOrder } from '../../types.ts';

interface DeleteManualSaleConfirmationModalProps {
    order: PaymentOrder;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

const DeleteManualSaleConfirmationModal: React.FC<DeleteManualSaleConfirmationModalProps> = ({ order, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Manual Sale Record</h3>
                <div className="mt-2 text-sm text-gray-500">
                    <p>Are you sure you want to delete this manual sale record for <strong className="font-bold">{order.userName}</strong>?</p>
                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg text-left">
                        <p className="font-bold">Important Warning:</p>
                        <p className="text-xs mt-1">This action will <strong className="underline">NOT</strong> automatically deduct credits from the user's account. You must go to the user's profile and manually adjust their credits after deleting this record.</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="w-full rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Confirm Delete</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteManualSaleConfirmationModal;