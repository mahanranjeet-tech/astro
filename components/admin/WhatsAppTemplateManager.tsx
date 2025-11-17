

import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { Save, Loader, PlusCircle, Edit, Trash2, MessageSquare as WhatsAppIcon, Settings } from 'lucide-react';
import type { WhatsAppTemplate, WhatsAppAssignments, NotificationType, WhatsAppSettings } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';
import WhatsAppTemplateModal from './WhatsAppTemplateModal.tsx';
import DeleteWhatsAppTemplateConfirmationModal from './DeleteWhatsAppTemplateConfirmationModal.tsx';

interface WhatsAppTemplateManagerProps {
    templates: WhatsAppTemplate[];
    assignments: WhatsAppAssignments | null;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const triggerKeys: { key: keyof WhatsAppAssignments, label: string }[] = [
    { key: 'onNewPurchase', label: 'New Purchase / Sign Up (Guest)' },
    { key: 'onCreditPurchase', label: 'Existing User Credit Purchase' },
    { key: 'onNewWebinarPurchase', label: 'New Webinar Purchase (Fallback/Manual)' },
    { key: 'onNewWebinarPurchaseSuccess', label: 'New Webinar Purchase (Auto-Registered)' },
    { key: 'onOtpVerification', label: 'OTP Verification' },
    { key: 'onNewAppointmentBooked', label: 'New Appointment Booked (for User)' },
    { key: 'onNewAppointmentBookedForConsultant', label: 'New Appointment Booked (for Consultant)' },
    { key: 'onAppointmentRescheduled', label: 'Appointment Rescheduled (for User)' },
    { key: 'onAppointmentRescheduledForConsultant', label: 'Appointment Rescheduled (for Consultant)' },
];

const WhatsAppTemplateManager: React.FC<WhatsAppTemplateManagerProps> = ({ templates, assignments, showNotification }) => {
    const [localAssignments, setLocalAssignments] = useState<Partial<WhatsAppAssignments>>({});
    const [settings, setSettings] = useState<WhatsAppSettings>({ enabled: true, otpService: 'fallback' });
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<WhatsAppTemplate | null>(null);

    useEffect(() => {
        setLocalAssignments(assignments || {});
    }, [assignments]);

    useEffect(() => {
        const settingsRef = db.collection('site_content').doc('whatsApp_settings');
        const unsubscribe = settingsRef.onSnapshot(doc => {
            if (doc.exists) {
                setSettings(doc.data() as WhatsAppSettings);
            } else {
                // If settings don't exist, create them with defaults
                settingsRef.set({ enabled: true, otpService: 'fallback' });
            }
        });
        return () => unsubscribe();
    }, []);

    const handleAssignmentChange = (trigger: keyof WhatsAppAssignments, templateId: string) => {
        setLocalAssignments(prev => ({ ...prev, [trigger]: templateId }));
    };

    const handleSaveAssignments = async () => {
        setIsSaving(true);
        try {
            await db.collection('site_content').doc('whatsApp_assignments').set(localAssignments, { merge: true });
            showNotification('WhatsApp assignments saved!', 'success');
        } catch (error: any) {
            showNotification(`Error saving assignments: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSettingsChange = <K extends keyof WhatsAppSettings>(key: K, value: WhatsAppSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await db.collection('site_content').doc('whatsApp_settings').set(settings, { merge: true });
            showNotification('WhatsApp settings saved!', 'success');
        } catch (error: any) {
            showNotification(`Error saving settings: ${error.message}`, 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleOpenModal = (template: WhatsAppTemplate | null) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">WhatsApp Template Management</h2>
                    <p className="text-gray-500 mt-1">Configure automated WhatsApp messages sent to users.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Settings size={20}/> Global WhatsApp Settings</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium text-gray-800">Enable WhatsApp Messaging</span>
                        <button
                            type="button"
                            onClick={() => handleSettingsChange('enabled', !settings.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                            aria-pressed={settings.enabled}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    <div>
                        <label className="font-medium text-gray-800">Send OTP via:</label>
                        <div className="mt-2 flex flex-col sm:flex-row gap-4">
                            {(['whatsapp', 'sms', 'fallback'] as const).map(option => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="otpService"
                                        value={option}
                                        checked={settings.otpService === option}
                                        onChange={() => handleSettingsChange('otpService', option)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">{option === 'whatsapp' ? 'WhatsApp Only' : option === 'sms' ? 'SMS Only' : 'WhatsApp then SMS (Fallback)'}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end">
                     <button onClick={handleSaveSettings} disabled={isSavingSettings} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                        {isSavingSettings ? <Loader className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        {isSavingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
                <h3 className="text-xl font-bold text-gray-800">Trigger Assignments</h3>
                <p className="text-sm text-gray-500 -mt-4">Assign a template to each automated WhatsApp message trigger.</p>
                <div className="space-y-4">
                    {triggerKeys.map(({ key, label }) => (
                        <div key={key} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                            <label htmlFor={`wa-${key}`} className="font-semibold text-gray-700">{label}:</label>
                            <select
                                id={`wa-${key}`}
                                value={localAssignments[key] || ''}
                                onChange={(e) => handleAssignmentChange(key, e.target.value)}
                                className="w-full sm:col-span-2 p-2 border rounded-lg bg-white appearance-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- No Template (Message Disabled) --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end">
                     <button onClick={handleSaveAssignments} disabled={isSaving} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                        {isSaving ? <Loader className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        {isSaving ? 'Saving...' : 'Save Assignments'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-800">WhatsApp Templates</h3>
                    <button onClick={() => handleOpenModal(null)} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-5 w-5" /> Create New Template
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Template Name (Internal)</th>
                                <th className="px-6 py-3">Meta Template Name</th>
                                <th className="px-6 py-3">Last Updated</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map(template => (
                                <tr key={template.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{template.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{template.templateName}</td>
                                    <td className="px-6 py-4">{formatTimestamp(template.updatedAt)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-1">
                                            <button onClick={() => handleOpenModal(template)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="Edit"><Edit size={18} /></button>
                                            <button onClick={() => setTemplateToDelete(template)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Delete"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {templates.length === 0 && <p className="text-center text-gray-500 py-8 italic">No WhatsApp templates created yet.</p>}
                </div>
            </div>
            
            {isModalOpen && (
                <WhatsAppTemplateModal
                    template={editingTemplate}
                    onClose={() => setIsModalOpen(false)}
                    showNotification={showNotification}
                />
            )}

            {templateToDelete && (
                <DeleteWhatsAppTemplateConfirmationModal
                    template={templateToDelete}
                    onClose={() => setTemplateToDelete(null)}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};
export default WhatsAppTemplateManager;