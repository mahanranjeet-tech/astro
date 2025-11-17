

import React, { useMemo, useState } from 'react';
import type { PaymentOrder, Consultant, ConsultantLedger, ConsultantPayout, NotificationType } from '../../types.ts';
import { IndianRupee, BarChart2, TrendingUp, TrendingDown, Clock, User, Send, CheckCircle, Loader } from 'lucide-react';
import { formatTimestamp } from '../../utils/date.ts';
import SummaryCard from './SummaryCard.tsx';
import { ProcessConsultantPayoutModal } from './ProcessConsultantPayoutModal.tsx';

const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ConsultantSalesDashboardProps {
    paymentOrders: PaymentOrder[];
    consultants: Consultant[];
    ledgers: ConsultantLedger[];
    payouts: ConsultantPayout[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const ConsultantSalesDashboard: React.FC<ConsultantSalesDashboardProps> = ({ paymentOrders, consultants, ledgers, payouts, showNotification }) => {
    const [payoutToProcess, setPayoutToProcess] = useState<ConsultantPayout | null>(null);

    const consultantMap = useMemo(() => new Map(consultants.map(c => [c.id, c.name])), [consultants]);

    const summaryStats = useMemo(() => {
        const totalSales = paymentOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalPlatformFees = paymentOrders.reduce((sum, order) => sum + (order.platformFee || 0), 0);
        const totalOutstanding = ledgers.reduce((sum, ledger) => sum + ledger.balance, 0);
        return { totalSales, totalPlatformFees, totalOutstanding };
    }, [paymentOrders, ledgers]);

    const pendingPayouts = useMemo(() => payouts.filter(p => p.status === 'pending'), [payouts]);
    const consultantBalances = useMemo(() => {
        return consultants.map(consultant => {
            const ledger = ledgers.find(l => l.id === consultant.id);
            return {
                id: consultant.id,
                name: consultant.name,
                balance: ledger?.balance || 0,
                totalEarnings: ledger?.totalEarnings || 0,
                totalPaidOut: ledger?.totalPaidOut || 0,
            };
        }).sort((a,b) => b.balance - a.balance);
    }, [consultants, ledgers]);

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Consultant Sales & Payouts</h2>
            
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard title="Total Consultant Sales" value={formatCurrency(summaryStats.totalSales)} icon={<BarChart2 size={24}/>} />
                <SummaryCard title="Total Platform Fees" value={formatCurrency(summaryStats.totalPlatformFees)} icon={<TrendingUp size={24}/>} />
                <SummaryCard title="Outstanding Payouts" value={formatCurrency(summaryStats.totalOutstanding)} icon={<TrendingDown size={24}/>} />
            </section>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Pending Payout Requests ({pendingPayouts.length})</h3>
                    {pendingPayouts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr><th className="px-4 py-2">Consultant</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-center">Action</th></tr></thead>
                                <tbody>
                                    {pendingPayouts.map(payout => (
                                        <tr key={payout.id} className="border-b">
                                            <td className="px-4 py-2 font-medium">{payout.consultantName}</td>
                                            <td className="px-4 py-2 text-right font-semibold text-green-600">{formatCurrency(payout.amount)}</td>
                                            <td className="px-4 py-2 text-center">
                                                <button onClick={() => setPayoutToProcess(payout)} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md flex items-center gap-1">
                                                    <Send size={12}/> Process
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4 italic">No pending payout requests.</p>
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Consultant Balances</h3>
                    <div className="overflow-y-auto max-h-64">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0"><tr><th className="px-4 py-2">Consultant</th><th className="px-4 py-2 text-right">Available Balance</th></tr></thead>
                            <tbody>
                                {consultantBalances.map(c => (
                                    <tr key={c.id} className="border-b">
                                        <td className="px-4 py-2 font-medium">{c.name}</td>
                                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(c.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Sales History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Consultant</th>
                                <th className="px-4 py-2">Customer</th>
                                <th className="px-4 py-2">Package</th>
                                <th className="px-4 py-2 text-right">Sale Amount</th>
                                <th className="px-4 py-2 text-right">Platform Fee</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentOrders.map(order => (
                                <tr key={order.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-2">{formatTimestamp(order.createdAt)}</td>
                                    <td className="px-4 py-2 font-medium">{consultantMap.get(order.consultantId!)}</td>
                                    <td className="px-4 py-2">{order.userName}</td>
                                    <td className="px-4 py-2">{order.items.map(i => i.appName).join(', ')}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-green-600">{formatCurrency(order.totalAmount)}</td>
                                    <td className="px-4 py-2 text-right text-orange-600">{formatCurrency(order.platformFee || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {paymentOrders.length === 0 && <p className="text-center text-gray-500 py-8 italic">No consultant sales yet.</p>}
                </div>
            </div>

            {payoutToProcess && (
                <ProcessConsultantPayoutModal
                    payout={payoutToProcess}
                    onClose={() => setPayoutToProcess(null)}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};

export default ConsultantSalesDashboard;