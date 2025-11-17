import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { X, Save, Loader } from 'lucide-react';
import type { Expense, ExpenseCategory, NotificationType, UserProfile } from '../../types.ts';

interface ExpenseModalProps {
    expense: Expense | null;
    currentUser: UserProfile;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const categories: { value: ExpenseCategory, label: string }[] = [
    { value: 'portal_management', label: 'Portal Management' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'miscellaneous', label: 'Miscellaneous' },
];

const ExpenseModal: React.FC<ExpenseModalProps> = ({ expense, currentUser, onClose, showNotification }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'miscellaneous' as ExpenseCategory,
        description: '',
        amount: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (expense) {
            setFormData({
                date: expense.date,
                category: expense.category,
                description: expense.description,
                amount: (expense.amount / 100).toString(),
            });
        }
    }, [expense]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountInPaise = Math.round(parseFloat(formData.amount) * 100);
        if (isNaN(amountInPaise) || amountInPaise <= 0) {
            showNotification('Please enter a valid positive amount.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                amount: amountInPaise,
                updatedAt: FieldValue.serverTimestamp(),
            };

            if (expense) {
                await db.collection('expenses').doc(expense.id).update(dataToSave);
                showNotification('Expense updated successfully!', 'success');
            } else {
                await db.collection('expenses').add({
                    ...dataToSave,
                    createdAt: FieldValue.serverTimestamp(),
                    createdBy: currentUser.id,
                    createdByName: currentUser.name,
                });
                showNotification('Expense added successfully!', 'success');
            }
            onClose();
        } catch (error: any) {
            showNotification(`Error saving expense: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{expense ? 'Edit Expense' : 'Add New Expense'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                    </div>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="text-sm font-medium text-gray-700 block mb-1">Date</label>
                            <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} required className="w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label htmlFor="category" className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                            <select id="category" name="category" value={formData.category} onChange={handleChange} required className="w-full p-2 border rounded-lg bg-white">
                                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                        <textarea id="description" name="description" value={formData.description} onChange={handleChange} required placeholder="e.g., Monthly server costs" className="w-full p-2 border rounded-lg h-24" />
                    </div>
                    <div>
                        <label htmlFor="amount" className="text-sm font-medium text-gray-700 block mb-1">Amount (₹)</label>
                        <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} required min="0.01" step="0.01" placeholder="e.g., 5000.00" className="w-full p-2 border rounded-lg" />
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving && <Loader className="animate-spin mr-2" size={20} />}
                        {isSaving ? 'Saving...' : 'Save Expense'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default ExpenseModal;
