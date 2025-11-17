import React, { useState, useEffect, useMemo } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { X, Save, Loader } from 'lucide-react';
import type { WebinarProduct, NotificationType, AppDefinition, PricingTier } from '../../types.ts';

interface WebinarModalProps {
    webinar: WebinarProduct | null;
    apps: AppDefinition[];
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const WebinarModal: React.FC<WebinarModalProps> = ({ webinar, apps, onClose, showNotification }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        link: '',
        webinarDate: '',
        webinarTime: '',
        expiryDate: '',
        price: '',
        addOnAppId: '',
        language: '',
        venue: '',
        zoomWebinarId: '',
        passcode: '',
        webhookUrl: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (webinar) {
            setFormData({
                name: webinar.name,
                description: webinar.description,
                link: webinar.link,
                webinarDate: webinar.webinarDate,
                webinarTime: webinar.webinarTime,
                expiryDate: webinar.expiryDate,
                price: (webinar.price / 100).toString(),
                addOnAppId: webinar.addOnAppId || '',
                language: webinar.language || '',
                venue: webinar.venue || '',
                zoomWebinarId: webinar.zoomWebinarId || '',
                passcode: webinar.passcode || '',
                webhookUrl: webinar.webhookUrl || '',
            });
        }
    }, [webinar]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const priceInPaise = Math.round(parseFloat(formData.price) * 100);
            if (isNaN(priceInPaise) || priceInPaise < 0) {
                throw new Error("Invalid price entered.");
            }

            const { ...dataToSaveBase } = formData;
            
            const dataToSave = {
                ...dataToSaveBase,
                price: priceInPaise,
                updatedAt: FieldValue.serverTimestamp(),
            };

            if (webinar) {
                await db.collection('webinar_products').doc(webinar.id).update(dataToSave);
                showNotification('Webinar updated successfully!', 'success');
            } else {
                await db.collection('webinar_products').add({
                    ...dataToSave,
                    createdAt: FieldValue.serverTimestamp(),
                });
                showNotification('Webinar created successfully!', 'success');
            }
            onClose();
        } catch (error: any) {
            showNotification(`Error saving webinar: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const hasAddonTiers = useMemo(() => {
        if (!formData.addOnAppId) return false;
        const selectedApp = apps.find(app => app.id === formData.addOnAppId);
        return selectedApp?.pricingTiers?.some(tier => tier.isWebinarAddon) || false;
    }, [formData.addOnAppId, apps]);


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{webinar ? 'Edit Webinar' : 'Create Webinar'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 space-y-4 overflow-y-auto">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Webinar Name" required className="w-full p-3 border rounded-lg" />
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required className="w-full p-3 border rounded-lg h-24 resize-y" />
                    <input type="url" name="link" value={formData.link} onChange={handleChange} placeholder="Webinar Link (e.g., Zoom, Meet)" required className="w-full p-3 border rounded-lg" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" name="zoomWebinarId" value={formData.zoomWebinarId} onChange={handleChange} placeholder="Zoom Webinar ID (for auto-registration)" className="w-full p-3 border rounded-lg" />
                        <input type="text" name="passcode" value={formData.passcode} onChange={handleChange} placeholder="Webinar Passcode" className="w-full p-3 border rounded-lg" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="date" name="webinarDate" value={formData.webinarDate} onChange={handleChange} required className="w-full p-3 border rounded-lg" title="Webinar Date" />
                        <input type="time" name="webinarTime" value={formData.webinarTime} onChange={handleChange} required className="w-full p-3 border rounded-lg" title="Webinar Time" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" name="language" value={formData.language} onChange={handleChange} placeholder="Language (e.g., Hindi)" className="w-full p-3 border rounded-lg" />
                        <input type="text" name="venue" value={formData.venue} onChange={handleChange} placeholder="Venue (e.g., Live)" className="w-full p-3 border rounded-lg" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} required className="w-full p-3 border rounded-lg" title="Purchase Expiry Date" />
                        <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price (₹)" required min="0" step="0.01" className="w-full p-3 border rounded-lg" />
                    </div>
                     <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                        <h4 className="font-semibold text-gray-700">Automation & Integration</h4>
                        <div>
                            <label htmlFor="webhookUrl" className="text-sm font-medium text-gray-600">Specific Webhook URL (Optional)</label>
                            <input
                                id="webhookUrl"
                                type="url"
                                name="webhookUrl"
                                value={formData.webhookUrl}
                                onChange={handleChange}
                                placeholder="https://your-crm.com/webinar-a-flow"
                                className="w-full p-2 mt-1 border rounded-md font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">If filled, purchases of THIS webinar will go to this URL, overriding the global setting.</p>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                        <h4 className="font-semibold text-gray-700">Optional App Add-on</h4>
                        <p className="text-xs text-gray-500 -mt-2">Select an app to offer its "Webinar Add-on" tiers during this webinar's checkout.</p>
                        <div className="grid grid-cols-1">
                             <select name="addOnAppId" value={formData.addOnAppId} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white appearance-none">
                                <option value="">No Add-on</option>
                                {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                            </select>
                        </div>
                         {!hasAddonTiers && formData.addOnAppId && <p className="text-xs text-red-500">Warning: The selected app has no 'Webinar Add-on' tiers configured in the App Manager.</p>}
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                       {isSaving ? <Loader className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                       {isSaving ? 'Saving...' : 'Save Webinar'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default WebinarModal;