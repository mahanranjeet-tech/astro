import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader, User, AppWindow, Tag, IndianRupee, Calendar } from 'lucide-react';
import { functions } from '../../services/firebase.ts';
import type { UserProfile, AppDefinition, PricingTier, NotificationType, PaymentOrder } from '../../types.ts';

interface LogSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: UserProfile[];
    apps: AppDefinition[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    existingOrder?: PaymentOrder | null;
}

const LogSaleModal: React.FC<LogSaleModalProps> = ({ isOpen, onClose, users, apps, showNotification, existingOrder = null }) => {
    const [userId, setUserId] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [appId, setAppId] = useState('');
    const [tierId, setTierId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isEditMode = !!existingOrder;

    useEffect(() => {
        if (isEditMode && existingOrder) {
            setUserId(existingOrder.userId || '');
            const user = users.find(u => u.id === existingOrder.userId);
            if (user) {
                setUserSearch(`${user.name} (${user.email})`);
            }
            const item = existingOrder.items[0];
            if (item) {
                setAppId(item.appId);
                // Use a timeout to ensure `availableTiers` is populated based on the new `appId`
                setTimeout(() => setTierId(item.tierId), 0);
            }
            setAmount((existingOrder.totalAmount / 100).toString());
            const date = existingOrder.createdAt.toDate();
            const dateString = date.toISOString().split('T')[0];
            setPaymentDate(dateString);
            setNotes((existingOrder.notes || '').replace(/^\(Edited\) /, ''));
        } else {
            // Reset for create mode
            setUserId('');
            setUserSearch('');
            setAppId('');
            setTierId('');
            setAmount('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setNotes('');
        }
    }, [existingOrder, isEditMode, users]);

    const availableTiers = useMemo(() => {
        if (!appId) return [];
        const selectedApp = apps.find(app => app.id === appId);
        return selectedApp?.pricingTiers || [];
    }, [appId, apps]);
    
    const filteredUsersForDropdown = useMemo(() => {
        if (!userSearch || userId) {
            return [];
        }
        const lowercasedTerm = userSearch.toLowerCase();
        return users.filter(user =>
            user.name.toLowerCase().includes(lowercasedTerm) ||
            (user.email && user.email.toLowerCase().includes(lowercasedTerm)) ||
            (user.phone && user.phone.includes(userSearch))
        ).slice(0, 100);
    }, [userSearch, users, userId]);


    useEffect(() => {
        if (!isEditMode) {
            if (tierId) {
                const selectedTier = availableTiers.find(tier => tier.id === tierId);
                if (selectedTier) {
                    setAmount((selectedTier.price / 100).toString());
                }
            } else {
                setAmount('');
            }
        }
    }, [tierId, availableTiers, isEditMode]);
    
    useEffect(() => {
        if (!isEditMode) {
            setTierId('');
        }
    }, [appId, isEditMode]);

    const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserSearch(e.target.value);
        setUserId(''); // Clear selected user ID when search text changes
        setIsUserDropdownOpen(true);
    };

    const handleUserSelect = (selectedUser: UserProfile) => {
        setUserId(selectedUser.id);
        setUserSearch(`${selectedUser.name} (${selectedUser.email})`);
        setIsUserDropdownOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalAmount = parseFloat(amount) * 100;

        if (!userId || !appId || !tierId || isNaN(finalAmount) || finalAmount < 0) {
            showNotification('Please fill all required fields correctly.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (isEditMode) {
                const updateSaleFunction = functions.httpsCallable('updateManualSale');
                await updateSaleFunction({
                    orderId: existingOrder!.id,
                    amount: finalAmount,
                    paymentDate,
                    notes,
                });
                showNotification('Manual sale updated!', 'success');
            } else {
                const logSaleFunction = functions.httpsCallable('logManualSale');
                await logSaleFunction({
                    userId,
                    appId,
                    tierId,
                    amount: finalAmount,
                    paymentDate,
                    notes,
                });
                showNotification('Manual sale logged successfully!', 'success');
            }
            onClose();
        } catch (error: any) {
            console.error("Error saving manual sale:", error);
            showNotification(error.message || 'An unknown error occurred.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <header className="p-6 border-b flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Manual Sale' : 'Log Manual Sale'}</h3>
                            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <p className="text-gray-500 mt-1 text-sm">{isEditMode ? 'Correct the details of a previously logged sale.' : 'Record an offline payment and automatically update user credits.'}</p>
                    </header>
                    <main className="p-6 space-y-4 overflow-y-auto">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            <input
                                type="text"
                                value={userSearch}
                                onChange={handleUserSearchChange}
                                onFocus={() => setIsUserDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsUserDropdownOpen(false), 200)}
                                placeholder="Search for a user by name, email, or phone..."
                                required
                                disabled={isEditMode}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            {isUserDropdownOpen && filteredUsersForDropdown.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filteredUsersForDropdown.map(user => (
                                        <div
                                            key={user.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onMouseDown={() => handleUserSelect(user)}
                                        >
                                            <p className="font-semibold">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email} - {user.phone || 'No phone'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <AppWindow className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                <select value={appId} onChange={e => setAppId(e.target.value)} required disabled={isEditMode} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white appearance-none focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed">
                                    <option value="" disabled>Select an App</option>
                                    {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                <select value={tierId} onChange={e => setTierId(e.target.value)} required disabled={!appId || isEditMode} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white appearance-none focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed">
                                    <option value="" disabled>Select Tier</option>
                                    {availableTiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name} ({tier.credits === 0 ? 'Unlimited' : `${tier.credits} credits`})</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0" step="0.01" placeholder="Amount (₹)" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 transition"/>
                            </div>
                             <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 transition"/>
                            </div>
                        </div>
                        <div>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (e.g., Transaction ID, payment method)" className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-none h-24 bg-white text-gray-900 placeholder-gray-500"/>
                        </div>
                    </main>
                    <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t flex-shrink-0">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold" disabled={isSaving}>Cancel</button>
                        <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                           {isSaving && <Loader className="animate-spin mr-2" size={20} />}
                           {isSaving ? 'Saving...' : (isEditMode ? 'Update Sale' : 'Log Sale')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default LogSaleModal;