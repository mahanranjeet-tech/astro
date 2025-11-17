import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase.ts';
import { IndianRupee, PlusCircle, Search } from 'lucide-react';
import type { UserProfile, Expense, NotificationType } from '../../types.ts';
import { formatTimestamp, formatDate } from '../../utils/date.ts';
import ExpenseModal from './ExpenseModal.tsx';
import DeleteExpenseConfirmationModal from './DeleteExpenseConfirmationModal.tsx';

interface ExpenseManagerProps {
    currentUser: UserProfile;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ currentUser, showNotification }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = db.collection('expenses').orderBy('date', 'desc').onSnapshot(snapshot => {
            setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
            setIsLoading(false);
        }, error => {
            console.error("Error fetching expenses:", error);
            showNotification('Failed to load expenses.', 'error');
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [showNotification]);

    const filteredExpenses = useMemo(() => {
        if (!searchTerm) return expenses;
        const lowercasedTerm = searchTerm.toLowerCase();
        return expenses.filter(expense =>
            expense.description.toLowerCase().includes(lowercasedTerm) ||
            expense.category.toLowerCase().includes(lowercasedTerm)
        );
    }, [expenses, searchTerm]);

    const handleOpenModal = (expense: Expense | null = null) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by description or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Expense
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-semibold">Date</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Category</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Description</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Added By</th>
                                <th scope="col" className="px-6 py-3 font-semibold text-right">Amount</th>
                                <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-8">Loading expenses...</td></tr>
                            ) : filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
                                <tr key={expense.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(expense.date)}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 capitalize">
                                            {expense.category.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{expense.description}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{expense.createdByName}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-red-600">{formatCurrency(expense.amount)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-1">
                                            <button onClick={() => handleOpenModal(expense)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full">Edit</button>
                                            <button onClick={() => setExpenseToDelete(expense)} className="p-2 text-red-600 hover:bg-red-100 rounded-full">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        <IndianRupee size={32} className="mx-auto text-gray-300 mb-2" />
                                        No expenses recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <ExpenseModal
                    expense={editingExpense}
                    currentUser={currentUser}
                    onClose={() => setIsModalOpen(false)}
                    showNotification={showNotification}
                />
            )}
            {expenseToDelete && (
                <DeleteExpenseConfirmationModal
                    expense={expenseToDelete}
                    onClose={() => setExpenseToDelete(null)}
                    showNotification={showNotification}
                />
            )}
        </section>
    );
};

export default ExpenseManager;
