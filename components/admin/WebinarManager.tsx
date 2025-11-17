
import React, { useState, useMemo } from 'react';
import { PlusCircle, Search, Edit, Trash2, Video } from 'lucide-react';
import { db } from '../../services/firebase.ts';
import type { WebinarProduct, NotificationType, AppDefinition } from '../../types.ts';
import { formatTimestamp, formatDate } from '../../utils/date.ts';
import WebinarModal from './WebinarModal.tsx';
import DeleteWebinarConfirmationModal from './DeleteWebinarConfirmationModal.tsx';

interface WebinarManagerProps {
    webinarProducts: WebinarProduct[];
    apps: AppDefinition[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const WebinarManager: React.FC<WebinarManagerProps> = ({ webinarProducts, apps, showNotification }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWebinar, setEditingWebinar] = useState<WebinarProduct | null>(null);
    const [webinarToDelete, setWebinarToDelete] = useState<WebinarProduct | null>(null);

    const filteredWebinars = useMemo(() => {
        if (!searchTerm) return webinarProducts;
        const lowercasedTerm = searchTerm.toLowerCase();
        return webinarProducts.filter(w => w.name.toLowerCase().includes(lowercasedTerm));
    }, [webinarProducts, searchTerm]);

    const handleOpenModal = (webinar: WebinarProduct | null = null) => {
        setEditingWebinar(webinar);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (webinar: WebinarProduct) => {
        setWebinarToDelete(webinar);
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by webinar name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Create New Webinar
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-semibold">Webinar Name</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Date & Time</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Price</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Link</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Expires On</th>
                                <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWebinars.length > 0 ? filteredWebinars.map(webinar => (
                                <tr key={webinar.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{webinar.name}</td>
                                    <td className="px-6 py-4">{formatDate(webinar.webinarDate)} @ {webinar.webinarTime}</td>
                                    <td className="px-6 py-4 font-semibold">₹{(webinar.price / 100).toFixed(2)}</td>
                                    <td className="px-6 py-4"><a href={webinar.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-xs block">{webinar.link}</a></td>
                                    <td className="px-6 py-4">{formatDate(webinar.expiryDate)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-1">
                                            <button onClick={() => handleOpenModal(webinar)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" aria-label="Edit webinar"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteClick(webinar)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" aria-label="Delete webinar"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        <Video size={32} className="mx-auto text-gray-300 mb-2" />
                                        No webinar products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isModalOpen && (
                <WebinarModal
                    webinar={editingWebinar}
                    apps={apps}
                    onClose={() => setIsModalOpen(false)}
                    showNotification={showNotification}
                />
            )}
            
            {webinarToDelete && (
                <DeleteWebinarConfirmationModal
                    webinar={webinarToDelete}
                    onClose={() => setWebinarToDelete(null)}
                    showNotification={showNotification}
                />
            )}
        </section>
    );
};

export default WebinarManager;