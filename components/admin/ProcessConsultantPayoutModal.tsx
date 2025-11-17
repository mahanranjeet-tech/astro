
import React, { useState } from 'react';
import type { ConsultantPayout, NotificationType } from '../../types.ts';
import { functions } from '../../services/firebase.ts';
import { X, Check, Loader } from 'lucide-react';

interface ProcessConsultantPayoutModalProps {
    payout: ConsultantPayout;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ProcessConsultantPayoutModal: React.FC<ProcessConsultantPayoutModalProps> = ({ payout, onClose, showNotification }) => {
    const [transactionId, setTransactionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleProcessPayout = async () => {
        setIsLoading(true);
        try {
            const processPayoutFunction = functions.httpsCallable('processConsultantPayout');
            await processPayoutFunction({ payoutId: payout.id, transactionId });
            showNotification('Payout marked as completed!', 'success');
            onClose();
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <header className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Process Consultant Payout</h3>
                    <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500">Consultant</p>
                        <p className="font-semibold">{payout.consultantName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-bold text-2xl text-green-600">{formatCurrency(payout.amount)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Payout Details</p>
                        <p className="whitespace-pre-wrap bg-gray-100 p-2 rounded-md">{payout.payoutDetails}</p>
                    </div>
                    <div>
                        <label htmlFor="transactionId" className="text-sm font-medium text-gray-700">Transaction ID (Optional)</label>
                        <input
                            id="transactionId"
                            type="text"
                            value={transactionId}
                            onChange={e => setTransactionId(e.target.value)}
                            className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500"
                            placeholder="Enter payment reference ID"
                        />
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg border-t">
                    <button onClick={onClose} disabled={isLoading} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Cancel</button>
                    <button onClick={handleProcessPayout} disabled={isLoading} className="w-48 flex justify-center items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-blue-400">
                        {isLoading ? <Loader className="animate-spin"/> : <><Check size={18}/> Mark as Completed</>}
                    </button>
                </footer>
            </div>
        </div>
    );
};
