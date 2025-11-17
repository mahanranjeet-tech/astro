import React, { useState, useMemo } from 'react';
import { X, Calendar, User, ShoppingBag, IndianRupee, Edit, Trash2 } from 'lucide-react';
import firebase from "firebase/compat/app";
import type { PaymentOrder, UserProfile, AppDefinition, NotificationType, Expense } from '../../types.ts';
import { functions } from '../../services/firebase.ts';
import { formatTimestamp } from '../../utils/date.ts';
import LogSaleModal from './LogSaleModal.tsx';
import DeleteManualSaleConfirmationModal from './DeleteManualSaleConfirmationModal.tsx';

const formatCurrency = (amountInPaise: number | null | undefined) => {
    const amount = amountInPaise || 0;
    return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface MonthlySalesDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    month: string; // YYYY-MM
    orders: PaymentOrder[];
    expenses: Expense[];
    users: UserProfile[];
    apps: AppDefinition[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const MonthlySalesDetailModal: React.FC<MonthlySalesDetailModalProps> = ({ isOpen, onClose, month, orders, expenses, users, apps, showNotification }) => {
    if (!isOpen) return null;

    const [orderToEdit, setOrderToEdit] = useState<PaymentOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<PaymentOrder | null>(null);

    const monthDate = new Date(`${month}-01T00:00:00`);
    const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const transactions = useMemo(() => {
        const salesTransactions = orders.map(order => ({
            id: order.id,
            date: order.createdAt,
            type: 'Sale' as const,
            description: order.userName,
            details: (order.items || []).map(item => {
                if (!item) return 'Unknown Item';
                if (item.isWebinar) return `${item.appName} (Webinar)`;
                if (item.isConsultation) return `${item.appName} (${item.consultantName})`;
                return `${item.appName} - ${item.tierName}`;
            }).join(', '),
            amount: order.totalAmount,
            isManual: order.status === 'completed_manual',
            originalOrder: order,
        }));

        const expenseTransactions = expenses.map(expense => ({
            id: expense.id,
            date: new Date(expense.date), // Parses 'YYYY-MM-DD' as UTC midnight for stable sorting
            type: 'Expense' as const,
            description: expense.description,
            details: expense.category.replace(/_/g, ' '),
            amount: -expense.amount,
            isManual: false,
            originalOrder: expense,
        }));

        const allTransactions = [...salesTransactions, ...expenseTransactions];

        allTransactions.sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date.getTime() : (a.date as firebase.firestore.Timestamp)?.toMillis() || 0;
            const dateB = b.date instanceof Date ? b.date.getTime() : (b.date as firebase.firestore.Timestamp)?.toMillis() || 0;
            return dateB - dateA;
        });

        return allTransactions;
    }, [orders, expenses]);

    const handleConfirmDelete = async () => {
        if (!orderToDelete) return;
        try {
            const deleteFn = functions.httpsCallable('deleteManualSale');
            await deleteFn({ orderId: orderToDelete.id });
            showNotification('Manual sale record deleted. Remember to adjust user credits if needed.', 'success', 6000);
            onClose(); // Close the main modal to force a refresh of data
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setOrderToDelete(null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <header className="p-6 border-b flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">Transaction Details</h3>
                                <p className="text-gray-500 mt-1">Showing all transactions for <span className="font-semibold">{monthName}</span></p>
                            </div>
                            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                    </header>
                    <main className="flex-grow p-6 overflow-y-auto">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                        <th scope="col" className="px-6 py-3">Type</th>
                                        <th scope="col" className="px-6 py-3">Description</th>
                                        <th scope="col" className="px-6 py-3">Details</th>
                                        <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                        <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={`${tx.type}-${tx.id}`} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">{formatTimestamp(tx.date)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    tx.type === 'Sale' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{tx.description}</td>
                                            <td className="px-6 py-4 text-gray-500 capitalize">{tx.details}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(tx.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {tx.type === 'Sale' && tx.isManual && (
                                                    <div className="flex justify-end items-center gap-1">
                                                        <button onClick={() => setOrderToEdit(tx.originalOrder as PaymentOrder)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="Edit Sale"><Edit size={16} /></button>
                                                        <button onClick={() => setOrderToDelete(tx.originalOrder as PaymentOrder)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Delete Sale"><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </main>
                    <footer className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-xl border-t">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Close</button>
                    </footer>
                </div>
            </div>
            {orderToEdit && (
                <LogSaleModal
                    isOpen={!!orderToEdit}
                    onClose={() => { setOrderToEdit(null); onClose(); }}
                    users={users}
                    apps={apps}
                    showNotification={showNotification}
                    existingOrder={orderToEdit}
                />
            )}
            {orderToDelete && (
                <DeleteManualSaleConfirmationModal
                    order={orderToDelete}
                    onClose={() => setOrderToDelete(null)}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </>
    );
};

export default MonthlySalesDetailModal;