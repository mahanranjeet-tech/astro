
import React, { useMemo, useState } from 'react';
import { IndianRupee, BarChart2, Calendar, ArrowUp, ArrowDown, PlusCircle, TrendingUp } from 'lucide-react';
import type { PaymentOrder, AppDefinition, UserProfile, Expense } from '../../types.ts';
import SummaryCard from './SummaryCard.tsx';
import LogSaleModal from './LogSaleModal.tsx';
import { formatDate, formatTime, formatTimestamp } from '../../utils/date.ts';
import MonthlySalesDetailModal from './MonthlySalesDetailModal.tsx';


// Helper to format currency from paise
const formatCurrency = (amountInPaise: number | null | undefined) => {
    const amount = amountInPaise || 0;
    return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface CommercialDashboardProps {
    paymentOrders: PaymentOrder[];
    apps: AppDefinition[];
    users: UserProfile[]; // Add users to props
    showNotification: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void; // Add showNotification
    expenses: Expense[];
}

type SortKeys = 'month' | 'sales' | 'transactions' | 'expenses' | 'profit';

const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ paymentOrders, apps, users, showNotification, expenses }) => {
    
    const [sortConfig, setSortConfig] = useState<{ key: SortKeys, direction: 'ascending' | 'descending' }>({ key: 'month', direction: 'descending' });
    const [isLogSaleModalOpen, setIsLogSaleModalOpen] = useState(false);
    
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedMonthData, setSelectedMonthData] = useState<{ month: string, orders: PaymentOrder[], expenses: Expense[] } | null>(null);

    const salesData = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
        
        const dayOfWeek = now.getDay(); // Sunday - 0, Monday - 1, ...
        const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
        startOfWeek.setHours(0,0,0,0);

        const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        const endOfLastWeek = new Date(startOfWeek.getTime() - 1);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let todaySales = 0;
        let yesterdaySales = 0;
        let weekSales = 0;
        let lastWeekSales = 0;
        let monthSales = 0;
        let totalSales = 0;
        const todaySalesByItem: { [key: string]: { name: string; sales: number } } = {};
        const monthlyReport: { [month: string]: { sales: number, transactions: number, expenses?: number, profit?: number } } = {};

        const completedOrders = paymentOrders.filter(o => o.status === 'completed' || o.status === 'completed_manual');

        completedOrders.forEach(order => {
            if (!order.createdAt) return;
            if (!order.items || !Array.isArray(order.items)) return;

            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt as any);
            const orderTotal = order.totalAmount || 0;
            totalSales += orderTotal;

            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyReport[monthKey]) {
                monthlyReport[monthKey] = { sales: 0, transactions: 0 };
            }
            monthlyReport[monthKey].sales += orderTotal;
            monthlyReport[monthKey].transactions++;

            if (orderDate >= startOfMonth) monthSales += orderTotal;
            if (orderDate >= startOfWeek) weekSales += orderTotal;
            if (orderDate >= startOfLastWeek && orderDate <= endOfLastWeek) lastWeekSales += orderTotal;
            if (orderDate >= startOfYesterday && orderDate < startOfToday) yesterdaySales += orderTotal;
            
            if (orderDate >= startOfToday) {
                todaySales += orderTotal;

                // FIX: Pro-rate the total amount across items for accurate by-product sales,
                // especially for manual sales where totalAmount might not equal the sum of item prices.
                const orderSubtotal = order.subtotal || order.items.reduce((sum, i) => sum + (i.price || 0), 0);

                order.items.forEach(item => {
                    const price = item.price || 0;
                    let itemValue = price;

                    if (orderSubtotal > 0 && order.totalAmount !== orderSubtotal) {
                        const proportion = price / orderSubtotal;
                        itemValue = order.totalAmount * proportion;
                    }
                    
                    let key = '';
                    let name = 'Unknown Item';

                    if (item.isWebinar) {
                        key = `webinar_${item.appId}`; // appId is webinarId
                        name = item.webinarDate ? `${item.appName} (${formatDate(item.webinarDate)})` : item.appName;
                    } else if (item.isConsultation) {
                        key = `package_${item.packageId}`; // packageId is the unique package id
                        name = item.consultantName ? `${item.appName} (${item.consultantName})` : item.appName;
                    } else {
                        key = `app_${item.appId}`;
                        name = item.appName;
                    }

                    if (!todaySalesByItem[key]) {
                        todaySalesByItem[key] = { name, sales: 0 };
                    }
                    todaySalesByItem[key].sales += itemValue;
                });
            }
        });
        
        // --- Expense Calculations ---
        let todayExpenses = 0;
        let monthExpenses = 0;
        let totalExpenses = 0;
        const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' format

        expenses.forEach(expense => {
            const expenseAmount = expense.amount || 0;
            totalExpenses += expenseAmount;

            const expenseMonthKey = expense.date.substring(0, 7); // 'YYYY-MM'
            const currentMonthKey = todayStr.substring(0, 7);

            if (expenseMonthKey === currentMonthKey) {
                monthExpenses += expenseAmount;
            }
            if (expense.date === todayStr) {
                todayExpenses += expenseAmount;
            }

            if (!monthlyReport[expenseMonthKey]) {
                monthlyReport[expenseMonthKey] = { sales: 0, transactions: 0, expenses: 0 };
            }
            monthlyReport[expenseMonthKey].expenses = (monthlyReport[expenseMonthKey].expenses || 0) + expenseAmount;
        });

        const monthlyReportArray = Object.entries(monthlyReport).map(([month, data]) => ({ month, ...data }));
        
        monthlyReportArray.forEach(item => {
            item.profit = item.sales - (item.expenses || 0);
        });

        monthlyReportArray.sort((a, b) => {
            const { key, direction } = sortConfig;
            const dir = direction === 'ascending' ? 1 : -1;

            if (key === 'month') {
                return a[key].localeCompare(b[key]) * dir;
            }

            const aValue = (a as any)[key] || 0;
            const bValue = (b as any)[key] || 0;

            if (aValue < bValue) return -1 * dir;
            if (aValue > bValue) return 1 * dir;
            return 0;
        });
        
        const sortedTodaySalesByItem = Object.entries(todaySalesByItem).sort(([, a], [, b]) => b.sales - a.sales);

        return { 
            todaySales, yesterdaySales, weekSales, lastWeekSales, monthSales, totalSales, 
            sortedTodaySalesByItem, sortedMonthlyReport: monthlyReportArray,
            todayExpenses, monthExpenses, totalExpenses,
            todayProfit: todaySales - todayExpenses,
            monthProfit: monthSales - monthExpenses,
            totalProfit: totalSales - totalExpenses
        };
    }, [paymentOrders, expenses, sortConfig]);

    const maxTodayItemSale = salesData.sortedTodaySalesByItem[0]?.[1]?.sales || 0;

    const recentTransactions = useMemo(() => {
        return [...paymentOrders]
            .filter(order =>
                (order.status === 'completed' || order.status === 'completed_manual') &&
                order.createdAt
            )
            .sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime()) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime()))
            .slice(0, 5);
    }, [paymentOrders]);

    const handleSortRequest = (key: SortKeys) => {
        const isCurrentKey = sortConfig.key === key;
        const direction = isCurrentKey && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
        setSortConfig({ key, direction });
    };

    const handleMonthClick = (monthKey: string) => {
        const monthOrders = paymentOrders.filter(order => {
            if (!order.createdAt) return false;
            if (order.status !== 'completed' && order.status !== 'completed_manual') return false;
            
            let orderDate: Date;
            if (typeof (order.createdAt as any).toDate === 'function') {
                orderDate = (order.createdAt as any).toDate();
            } else if (order.createdAt instanceof Date) {
                orderDate = order.createdAt;
            } else if (typeof order.createdAt === 'string') {
                orderDate = new Date(order.createdAt);
            } else {
                return false;
            }
            
            const orderMonthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            return orderMonthKey === monthKey;
        });

        // Use robust string comparison to avoid timezone issues.
        const monthExpenses = expenses.filter(expense => {
            return expense.date.substring(0, 7) === monthKey;
        });

        setSelectedMonthData({ month: monthKey, orders: monthOrders, expenses: monthExpenses });
        setIsDetailModalOpen(true);
    };
    
    const SortIcon: React.FC<{ columnKey: SortKeys }> = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return <div className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100"><ArrowDown size={14} /></div>;
        }
        if (sortConfig.direction === 'ascending') {
            return <ArrowUp className="text-blue-600" size={14} />;
        }
        return <ArrowDown className="text-blue-600" size={14} />;
    };


    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h2 className="text-2xl font-bold text-gray-800">Commercial Overview</h2>
                 <button
                    onClick={() => setIsLogSaleModalOpen(true)}
                    className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                >
                    <PlusCircle className="mr-2 h-5 w-5" /> Log Manual Sale
                </button>
            </div>
            
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <SummaryCard title="Today's Sales" value={formatCurrency(salesData.todaySales)} icon={<IndianRupee size={24}/>} />
                <SummaryCard title="Yesterday's Sales" value={formatCurrency(salesData.yesterdaySales)} icon={<IndianRupee size={24}/>} />
                <SummaryCard title="This Month's Sales" value={formatCurrency(salesData.monthSales)} icon={<Calendar size={24}/>} />
                <SummaryCard title="This Month's Profit" value={formatCurrency(salesData.monthProfit)} icon={<TrendingUp size={24}/>} />
                <SummaryCard title="All-Time Profit" value={formatCurrency(salesData.totalProfit)} icon={<BarChart2 size={24}/>} />
            </section>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Today's Sales by Product</h3>
                    {salesData.sortedTodaySalesByItem.length > 0 ? (
                        <div className="space-y-4">
                            {salesData.sortedTodaySalesByItem.map(([key, { name, sales }]) => (
                                <div key={key} className="flex items-center gap-4">
                                    <p className="w-1/2 md:w-1/3 truncate text-sm font-medium text-gray-600" title={name}>
                                        {name}
                                    </p>
                                    <div className="flex-grow bg-gray-200 rounded-full h-6">
                                        <div 
                                            className="bg-blue-600 h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-bold"
                                            style={{ width: `${maxTodayItemSale > 0 ? (sales / maxTodayItemSale) * 100 : 0}%`, minWidth: '4rem' }}
                                        >
                                           {formatCurrency(sales)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic text-center py-8">No sales recorded today.</p>
                    )}
                </section>
                
                <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Transactions</h3>
                     {recentTransactions.length > 0 ? (
                        <ul className="space-y-3">
                            {recentTransactions.map(order => (
                                <li key={order.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                                    <div className="flex-grow truncate">
                                        <p className="font-medium text-gray-800 truncate">{order.userName}</p>
                                        <p className="text-xs text-gray-500">{formatTimestamp(order.createdAt)}</p>
                                    </div>
                                    <p className="font-bold text-green-600 ml-4">{formatCurrency(order.totalAmount)}</p>
                                </li>
                            ))}
                        </ul>
                     ) : (
                         <p className="text-gray-500 italic text-center py-8">No transactions found.</p>
                     )}
                </section>
            </div>

            <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Profit & Loss Statement</h3>
                {salesData.sortedMonthlyReport.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        <button onClick={() => handleSortRequest('month')} className="group flex items-center gap-2 font-semibold">
                                            Month <SortIcon columnKey='month' />
                                        </button>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right">
                                        <button onClick={() => handleSortRequest('sales')} className="group flex items-center gap-2 font-semibold float-right">
                                            Total Sales <SortIcon columnKey='sales' />
                                        </button>
                                    </th>
                                     <th scope="col" className="px-6 py-3 text-right">
                                        <button onClick={() => handleSortRequest('expenses')} className="group flex items-center gap-2 font-semibold float-right">
                                            Total Expenses <SortIcon columnKey='expenses' />
                                        </button>
                                    </th>
                                     <th scope="col" className="px-6 py-3 text-right">
                                        <button onClick={() => handleSortRequest('profit')} className="group flex items-center gap-2 font-semibold float-right">
                                            Profit / Loss <SortIcon columnKey='profit' />
                                        </button>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right">
                                        <button onClick={() => handleSortRequest('transactions')} className="group flex items-center gap-2 font-semibold float-right">
                                            Transactions <SortIcon columnKey='transactions' />
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesData.sortedMonthlyReport.map(({ month, sales, transactions, expenses, profit }) => (
                                    <tr key={month} className="bg-white border-b hover:bg-blue-50 cursor-pointer" onClick={() => handleMonthClick(month)}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{month}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-green-600">{formatCurrency(sales)}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-orange-600">{formatCurrency(expenses)}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${(profit || 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatCurrency(profit)}</td>
                                        <td className="px-6 py-4 text-right">{transactions}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 italic text-center py-8">No monthly sales data available.</p>
                )}
            </section>
             {isLogSaleModalOpen && (
                <LogSaleModal
                    isOpen={isLogSaleModalOpen}
                    onClose={() => setIsLogSaleModalOpen(false)}
                    users={users.filter(u => u.role === 'user')}
                    apps={apps}
                    showNotification={showNotification}
                />
            )}
            {isDetailModalOpen && selectedMonthData && (
                <MonthlySalesDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    month={selectedMonthData.month}
                    orders={selectedMonthData.orders}
                    expenses={selectedMonthData.expenses}
                    users={users}
                    apps={apps}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};
export default CommercialDashboard;
