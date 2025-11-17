import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../services/firebase.ts';
import { Search, Users, Trash2, ChevronDown, ChevronRight, Loader, Download } from 'lucide-react';
import type { WebinarPurchase, NotificationType } from '../../types.ts';
import { formatTimestamp, formatDate, formatTime } from '../../utils/date.ts';
import DeleteWebinarPurchaseConfirmationModal from './DeleteWebinarPurchaseConfirmationModal.tsx';
import DeleteBulkWebinarPurchaseConfirmationModal from './DeleteBulkWebinarPurchaseConfirmationModal.tsx';

interface WebinarPurchasesDashboardProps {
    purchases: WebinarPurchase[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const WebinarPurchasesDashboard: React.FC<WebinarPurchasesDashboardProps> = ({ purchases, showNotification }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [purchaseToDelete, setPurchaseToDelete] = useState<WebinarPurchase | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const groupedPurchases = useMemo(() => {
        const filtered = searchTerm
            ? purchases.filter(p =>
                p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.webinarName.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : purchases;
        
        const groups: { [key: string]: WebinarPurchase[] } = {};
        const sortedPurchases = [...filtered].sort((a, b) => {
            const dateA = new Date(a.webinarDate).getTime();
            const dateB = new Date(b.webinarDate).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return a.webinarName.localeCompare(b.webinarName);
        });

        for (const purchase of sortedPurchases) {
            const key = `${purchase.webinarName} (${formatDate(purchase.webinarDate)})`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(purchase);
        }
        return groups;
    }, [purchases, searchTerm]);

    useEffect(() => {
        const groupKeys = Object.keys(groupedPurchases);
        if (groupKeys.length > 0 && !groupKeys.some(key => expandedGroups.has(key))) {
            setExpandedGroups(new Set([groupKeys[0]]));
        } else if (groupKeys.length === 0) {
            setExpandedGroups(new Set());
        }
    }, [searchTerm, groupedPurchases]);


    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) newSet.delete(groupKey);
            else newSet.add(groupKey);
            return newSet;
        });
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectGroup = (groupPurchases: WebinarPurchase[]) => {
        const groupIds = groupPurchases.map(p => p.id);
        const allSelectedInGroup = groupIds.every(id => selectedIds.has(id));

        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (allSelectedInGroup) {
                groupIds.forEach(id => newSet.delete(id));
            } else {
                groupIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    const handleDeleteSingle = async () => {
        if (!purchaseToDelete) return;
        try {
            await db.collection('webinar_purchases').doc(purchaseToDelete.id).delete();
            showNotification('Webinar purchase record deleted.', 'success');
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(purchaseToDelete.id);
                return newSet;
            });
        } catch (error) {
            showNotification('Failed to delete record.', 'error');
        } finally {
            setPurchaseToDelete(null);
        }
    };
    
    const handleConfirmBulkDelete = async () => {
        const idsToDelete = Array.from(selectedIds);
        if (idsToDelete.length === 0) return;
        
        setIsBulkDeleteModalOpen(false);

        const batches = [];
        for (let i = 0; i < idsToDelete.length; i += 500) {
            const batch = db.batch();
            const chunk = idsToDelete.slice(i, i + 500);
            chunk.forEach(id => batch.delete(db.collection('webinar_purchases').doc(id)));
            batches.push(batch);
        }
        
        try {
            await Promise.all(batches.map(b => b.commit()));
            showNotification(`${idsToDelete.length} record(s) deleted successfully.`, 'success');
            setSelectedIds(new Set());
        } catch (error) {
            showNotification('An error occurred during bulk deletion.', 'error');
        }
    };

    const handleExportGroup = (groupKey: string, groupData: WebinarPurchase[]) => {
        if (groupData.length === 0) {
            showNotification('No data to export for this group.', 'info');
            return;
        }

        const headers = ['Name', 'Phone', 'Email'];
        // Simple CSV escape function
        const escapeCsv = (str: string | undefined | null): string => {
            if (str === undefined || str === null) return '';
            const s = String(str);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const csvContent = [
            headers.join(','),
            ...groupData.map(p => [
                escapeCsv(p.userName),
                escapeCsv(p.userPhone),
                escapeCsv(p.userEmail),
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        // Sanitize filename
        const fileName = `${groupKey.replace(/[^a-z0-9]/gi, '_')}_attendees.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by user or webinar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                </div>
                {selectedIds.size > 0 && (
                     <button
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                        className="flex items-center justify-center bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto"
                    >
                        <Trash2 className="mr-2 h-5 w-5" /> Delete Selected ({selectedIds.size})
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {Object.keys(groupedPurchases).length > 0 ? (
                    Object.entries(groupedPurchases).map(([groupKey, groupData]) => {
                        const isExpanded = expandedGroups.has(groupKey);
                        const groupIds = groupData.map(p => p.id);
                        const selectedInGroupCount = groupIds.filter(id => selectedIds.has(id)).length;
                        const allSelectedInGroup = selectedInGroupCount === groupIds.length;
                        const someSelectedInGroup = selectedInGroupCount > 0 && !allSelectedInGroup;

                        return (
                            <div key={groupKey} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                <div
                                    className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => toggleGroup(groupKey)}
                                >
                                    {isExpanded ? <ChevronDown size={20} className="text-gray-500"/> : <ChevronRight size={20} className="text-gray-500"/>}
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 mx-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={allSelectedInGroup}
                                        ref={input => { if(input) input.indeterminate = someSelectedInGroup; }}
                                        onChange={() => handleSelectGroup(groupData)}
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <h3 className="font-bold text-gray-800">{groupKey}</h3>
                                    <span className="ml-2 text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{groupData.length} users</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportGroup(groupKey, groupData);
                                        }}
                                        className="ml-auto text-xs font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-md px-2 py-1 flex items-center gap-1"
                                        title="Export this group to CSV"
                                    >
                                        <Download size={14} />
                                        Export
                                    </button>
                                </div>
                                {isExpanded && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                <tr>
                                                    <th className="p-4 w-4"></th>
                                                    <th className="px-6 py-3">Purchase Date</th>
                                                    <th className="px-6 py-3">Time</th>
                                                    <th className="px-6 py-3">User Name</th>
                                                    <th className="px-6 py-3">Email / Phone</th>
                                                    <th className="px-6 py-3 text-right">Amount Paid</th>
                                                    <th className="px-6 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupData.map(purchase => (
                                                    <tr key={purchase.id} className={`border-t ${selectedIds.has(purchase.id) ? 'bg-blue-50' : 'bg-white'}`}>
                                                        <td className="px-4 py-4">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                checked={selectedIds.has(purchase.id)}
                                                                onChange={() => handleSelectOne(purchase.id)}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">{formatTimestamp(purchase.purchaseDate)}</td>
                                                        <td className="px-6 py-4">{formatTime(purchase.purchaseDate)}</td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">{purchase.userName}</td>
                                                        <td className="px-6 py-4"><div>{purchase.userEmail}</div><div className="text-xs text-gray-500">{purchase.userPhone}</div></td>
                                                        <td className="px-6 py-4 text-right font-semibold">₹{(purchase.amountPaid / 100).toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button onClick={() => setPurchaseToDelete(purchase)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" aria-label="Delete purchase">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-16 text-gray-500 bg-white rounded-xl shadow-lg border border-gray-200">
                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold">No Webinar Purchases Found</h3>
                        <p>No records match your current search criteria.</p>
                    </div>
                )}
            </div>

            {purchaseToDelete && (
                <DeleteWebinarPurchaseConfirmationModal
                    purchase={purchaseToDelete}
                    onClose={() => setPurchaseToDelete(null)}
                    onConfirm={handleDeleteSingle}
                />
            )}
            
            <DeleteBulkWebinarPurchaseConfirmationModal
                count={selectedIds.size}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleConfirmBulkDelete}
                isOpen={isBulkDeleteModalOpen}
            />
        </section>
    );
};

export default WebinarPurchasesDashboard;
