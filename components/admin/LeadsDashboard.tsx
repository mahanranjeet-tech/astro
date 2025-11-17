import React, { useState } from 'react';
import { db } from '../../services/firebase.ts';
import { ClipboardList, Trash2, Search } from 'lucide-react';
import type { Lead, NotificationType, CartItem } from '../../types.ts';
import { formatTimestamp, formatTime } from '../../utils/date.ts';

interface LeadsDashboardProps {
    leads: Lead[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toFixed(2)}`;

const LeadsDashboard: React.FC<LeadsDashboardProps> = ({ leads, showNotification }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
        try {
            await db.collection('leads').doc(leadId).update({ status: newStatus });
            showNotification('Lead status updated.', 'success');
        } catch (error) {
            console.error("Error updating lead status:", error);
            showNotification('Failed to update status.', 'error');
        }
    };

    const handleDelete = async (leadId: string) => {
        if (window.confirm('Are you sure you want to delete this lead? This cannot be undone.')) {
            try {
                await db.collection('leads').doc(leadId).delete();
                showNotification('Lead deleted.', 'success');
            } catch (error) {
                console.error("Error deleting lead:", error);
                showNotification('Failed to delete lead.', 'error');
            }
        }
    };

    return (
        <section className="space-y-4">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                />
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-semibold">Date Captured</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Time</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Name</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Email</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Phone</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Cart Content</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                                <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.length > 0 ? filteredLeads.map(lead => (
                                <tr key={lead.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{formatTimestamp(lead.createdAt)}</td>
                                    <td className="px-6 py-4">{formatTime(lead.createdAt)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                                    <td className="px-6 py-4">{lead.email}</td>
                                    <td className="px-6 py-4">{lead.phone || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <ul className="text-xs">
                                            {(lead.cart || []).map((item, index) => (
                                                <li key={index}>- {item.appName} ({item.tierName}) @ {formatCurrency(item.price)}</li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={lead.status}
                                            onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead['status'])}
                                            className="p-1 border rounded-md text-xs bg-white focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="converted">Converted</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(lead.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" aria-label="Delete lead">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        <ClipboardList size={32} className="mx-auto text-gray-300 mb-2" />
                                        No leads found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};
export default LeadsDashboard;