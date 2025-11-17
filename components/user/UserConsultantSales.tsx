import React, { useState, useEffect, useMemo } from 'react';
import { db, functions, FieldValue } from '../../services/firebase.ts';
import firebase from "firebase/compat/app";
import type { UserProfile, NotificationType, PaymentOrder, ConsultantLedger, ConsultantPayout, Appointment, ConsultationPurchase } from '../../types.ts';
import { IndianRupee, BarChart3, TrendingUp, TrendingDown, Clock, User, Send, CheckCircle, Loader, Calendar } from 'lucide-react';
import { formatTimestamp } from '../../utils/date.ts';
import SummaryCard from '../admin/SummaryCard.tsx';

interface UserConsultantSalesProps {
    user: UserProfile;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const UserConsultantSales: React.FC<UserConsultantSalesProps> = ({ user, showNotification }) => {
    const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
    const [ledger, setLedger] = useState<ConsultantLedger | null>(null);
    const [payouts, setPayouts] = useState<ConsultantPayout[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutDetails, setPayoutDetails] = useState('');
    const [isRequestingPayout, setIsRequestingPayout] = useState(false);

    useEffect(() => {
        const consultantId = user.linkedConsultantId;
        if (!consultantId) {
            setIsLoading(false);
            return;
        }
    
        const unsubs: (() => void)[] = [];
        setIsLoading(true);
    
        const ordersQuery = db.collection('payment_orders')
            .where('consultantId', '==', consultantId)
            .where('status', 'in', ['completed', 'completed_manual']);
            
        const unsubOrders = ordersQuery.onSnapshot(snap => {
            const orders = snap.docs.map(doc => ({...doc.data(), id: doc.id} as PaymentOrder));
            setPaymentOrders(orders);
        }, (error) => {
            console.error("Error fetching consultant sales history:", error);
            // It's possible an index is required. This error will guide the user.
            showNotification("Could not load sales history. Check console for details.", "error");
        });
        unsubs.push(unsubOrders);
    
        unsubs.push(db.collection('consultant_ledgers').doc(consultantId).onSnapshot(doc => {
            setLedger(doc.exists ? doc.data() as ConsultantLedger : null);
        }));
    
        const payoutsQuery = db.collection('consultant_payouts').where('consultantId', '==', consultantId);
        unsubs.push(payoutsQuery.onSnapshot(snap => {
            const fetchedPayouts = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ConsultantPayout));
            // Sort client-side to avoid dependency on a composite index
            fetchedPayouts.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));
            setPayouts(fetchedPayouts);
        }));
    
        const appointmentsQuery = db.collection('appointments')
            .where('consultantId', '==', consultantId)
            .where('appointmentStart', '>=', new Date());
        unsubs.push(appointmentsQuery.onSnapshot(snap => {
            setAppointments(snap.docs.map(doc => doc.data() as Appointment));
        }));
    
        // A simple way to handle initial loading state
        const timer = setTimeout(() => setIsLoading(false), 1500);
        unsubs.push(() => clearTimeout(timer));
    
        return () => unsubs.forEach(unsub => unsub());
    }, [user.linkedConsultantId, showNotification]);

    const commercialOverview = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        let todaySales = 0;
        let monthSales = 0;
        let totalGross = 0;

        for (const order of paymentOrders) {
            const orderDate = order.createdAt?.toDate().getTime();
            if (!orderDate) continue;
            
            const orderTotal = order.totalAmount;
            totalGross += orderTotal;
            if (orderDate >= todayStart) todaySales += orderTotal;
            if (orderDate >= monthStart) monthSales += orderTotal;
        }
        
        return { todaySales, monthSales, totalGross };
    }, [paymentOrders]);

    const salesHistory = useMemo(() => {
        return [...paymentOrders].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    }, [paymentOrders]);

    const handleRequestPayout = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(payoutAmount) * 100;
        if (isNaN(amountNum) || amountNum <= 0) {
            showNotification("Invalid amount.", "error");
            return;
        }
        if (!payoutDetails.trim()) {
            showNotification("Payout details cannot be empty.", "error");
            return;
        }
        if (ledger && amountNum > ledger.balance) {
            showNotification("Requested amount exceeds your available balance.", "error");
            return;
        }

        setIsRequestingPayout(true);
        try {
            const requestPayoutFn = functions.httpsCallable('requestConsultantPayout');
            await requestPayoutFn({ amount: amountNum, payoutDetails });
            showNotification("Payout request submitted successfully!", "success");
            setPayoutAmount('');
            setPayoutDetails('');
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setIsRequestingPayout(false);
        }
    };
    
    if (isLoading) {
        return <div className="p-8 flex justify-center items-center h-full"><Loader className="animate-spin text-blue-500" size={32} /></div>;
    }

    return (
        <div className="h-full overflow-y-auto space-y-6">
            <section>
                <h4 className="text-lg font-bold text-gray-800 mb-4">Commercial Overview</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SummaryCard title="Today's Sales" value={formatCurrency(commercialOverview.todaySales)} icon={<IndianRupee size={24} />} />
                    <SummaryCard title="This Month's Sales" value={formatCurrency(commercialOverview.monthSales)} icon={<Calendar size={24} />} />
                    <SummaryCard title="Total Gross Earnings" value={formatCurrency(commercialOverview.totalGross)} icon={<BarChart3 size={24} />} />
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                    <p className="text-sm font-semibold text-green-800">Available Balance</p>
                    <p className="text-3xl font-bold text-green-700">{formatCurrency(ledger?.balance || 0)}</p>
                </div>
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                    <p className="text-sm font-semibold text-blue-800">Total Gross Earnings</p>
                    <p className="text-3xl font-bold text-blue-700">{formatCurrency(commercialOverview.totalGross)}</p>
                </div>
                <div className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
                    <p className="text-sm font-semibold text-orange-800">Total Paid Out</p>
                    <p className="text-3xl font-bold text-orange-700">{formatCurrency(ledger?.totalPaidOut || 0)}</p>
                </div>
            </section>
            
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <h4 className="font-semibold text-lg text-gray-800 mb-4">Request a Payout</h4>
                    <form onSubmit={handleRequestPayout} className="space-y-4">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                            <input type="number" step="0.01" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="Amount to Withdraw" className="w-full pl-6 p-2 border rounded-md" required />
                        </div>
                        <textarea value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} placeholder="Enter your UPI ID or Bank Account details here." className="w-full p-2 border rounded-md h-24" required></textarea>
                        <button type="submit" disabled={isRequestingPayout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400">
                            {isRequestingPayout ? <Loader className="animate-spin" /> : <Send size={16}/>}
                            Submit Request
                        </button>
                    </form>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <h4 className="font-semibold text-lg text-gray-800 mb-4">Payout History</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {payouts.length > 0 ? payouts.map(p => (
                            <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md">
                                <div>
                                    <p className="font-medium">{formatCurrency(p.amount)}</p>
                                    <p className="text-xs text-gray-500">{formatTimestamp(p.requestedAt)}</p>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-800' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{p.status}</span>
                            </div>
                        )) : <p className="text-sm text-gray-500 text-center italic py-4">No payout history.</p>}
                    </div>
                </div>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-md border">
                <h4 className="font-semibold text-lg text-gray-800 mb-4">Detailed Sales History</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Customer</th>
                                <th className="px-4 py-2">Package</th>
                                <th className="px-4 py-2 text-right">Sale Amount</th>
                                <th className="px-4 py-2 text-right">Platform Fee</th>
                                <th className="px-4 py-2 text-right">Your Earnings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesHistory.length > 0 ? salesHistory.map(order => (
                                <tr key={order.id} className="border-b last:border-b-0">
                                    <td className="px-4 py-3 whitespace-nowrap">{formatTimestamp(order.createdAt)}</td>
                                    <td className="px-4 py-3">{order.userName}</td>
                                    <td className="px-4 py-3">{order.items.map(i => i.appName).join(', ')}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(order.totalAmount)}</td>
                                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(order.platformFee || 0)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(order.totalAmount - (order.platformFee || 0))}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center italic py-8 text-gray-500">No sales with commission details found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default UserConsultantSales;