
import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { X, Save, Loader } from 'lucide-react';
import type { WhatsAppTemplate, NotificationType } from '../../types.ts';

interface WhatsAppTemplateModalProps {
    template: WhatsAppTemplate | null;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const VariableReference: React.FC = () => (
    <div className="space-y-3 text-xs text-gray-600 bg-gray-100 p-3 rounded-md">
        <h4 className="font-bold text-sm text-gray-800">How Variables Work</h4>
        <p>Your message body should match your Meta-approved template. Use curly braces for variables (e.g., {'{userName}'}).</p>
        <p>The system will automatically find these variables and send them to WhatsApp in the required {'{{1}}'}, {'{{2}}'} format based on their order in the text.</p>
        <p className="font-semibold">Example:</p>
        <code className="block bg-gray-200 p-2 rounded text-black">Hi {'{userName}'}, your OTP is {'{otp}'}.</code>
        <p>This will be sent to WhatsApp with `{'{{1}}'}` as the user's name and `{'{{2}}'}` as the OTP.</p>
        <p className="font-bold mt-2">Available Variables:</p>
        <p>See the full list in the Email Template manager. Most variables are shared.</p>
    </div>
);

const WhatsAppTemplateModal: React.FC<WhatsAppTemplateModalProps> = ({ template, onClose, showNotification }) => {
    const [formData, setFormData] = useState({ name: '', templateName: '', body: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (template) {
            setFormData({ name: template.name, templateName: template.templateName, body: template.body });
        } else {
            setFormData({ name: '', templateName: '', body: '' });
        }
    }, [template]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                updatedAt: FieldValue.serverTimestamp(),
            };

            if (template) {
                await db.collection('whatsApp_templates').doc(template.id).update(dataToSave);
                showNotification('Template updated successfully!', 'success');
            } else {
                await db.collection('whatsApp_templates').add({
                    ...dataToSave,
                    createdAt: FieldValue.serverTimestamp(),
                });
                showNotification('Template created successfully!', 'success');
            }
            onClose();
        } catch (error: any) {
            showNotification(`Error saving template: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{template ? 'Edit WhatsApp Template' : 'Create New WhatsApp Template'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Template Name (for your reference)" required className="w-full p-3 border rounded-lg text-lg font-semibold" />
                        <input type="text" name="templateName" value={formData.templateName} onChange={handleChange} placeholder="Meta Template Name (e.g., order_confirmation)" required className="w-full p-3 border rounded-lg font-mono text-sm" />
                        <textarea name="body" value={formData.body} onChange={handleChange} placeholder="Enter message body with {variables}..." required className="w-full p-3 border rounded-lg h-64 resize-y font-mono" />
                    </div>
                    <div className="md:col-span-1">
                        <VariableReference />
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                       {isSaving && <Loader className="animate-spin mr-2" size={20} />}
                       {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default WhatsAppTemplateModal;
