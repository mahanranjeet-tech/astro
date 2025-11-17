





import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { Save, Loader, PlusCircle, Edit, Trash2, Mail } from 'lucide-react';
import type { EmailTemplate, EmailAssignments, NotificationType } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';
import EmailTemplateModal from './EmailTemplateModal.tsx';
import DeleteEmailTemplateConfirmationModal from './DeleteEmailTemplateConfirmationModal.tsx';

interface EmailTemplateManagerProps {
    templates: EmailTemplate[];
    assignments: EmailAssignments | null;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const triggerKeys: { key: keyof EmailAssignments, label: string }[] = [
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

const EmailTemplateManager: React.FC<EmailTemplateManagerProps> = ({ templates, assignments, showNotification }) => {
    const [localAssignments, setLocalAssignments] = useState<Partial<EmailAssignments>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

    useEffect(() => {
        setLocalAssignments(assignments || {});
    }, [assignments]);

    const handleAssignmentChange = (trigger: keyof EmailAssignments, templateId: string) => {
        setLocalAssignments(prev => ({ ...prev, [trigger]: templateId }));
    };

    const handleSaveAssignments = async () => {
        setIsSaving(true);
        try {
            await db.collection('site_content').doc('email_assignments').set(localAssignments, { merge: true });
            showNotification('Email assignments saved!', 'success');
        } catch (error: any) {
            showNotification(`Error saving assignments: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenModal = (template: EmailTemplate | null) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Email Template Management</h2>
                    <p className="text-gray-500 mt-1">Configure automated emails sent to users.</p>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
                <h3 className="text-xl font-bold text-gray-800">Trigger Assignments</h3>
                <p className="text-sm text-gray-500 -mt-4">Assign a template to each automated email trigger.</p>
                <div className="space-y-4">
                    {triggerKeys.map(({ key, label }) => (
                        <div key={key} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                            <label htmlFor={key} className="font-semibold text-gray-700">{label}:</label>
                            <select
                                id={key}
                                value={localAssignments[key] || ''}
                                onChange={(e) => handleAssignmentChange(key, e.target.value)}
                                className="w-full sm:col-span-2 p-2 border rounded-lg bg-white appearance-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- No Template (Email Disabled) --</option>
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
                    <h3 className="text-xl font-bold text-gray-800">Email Templates</h3>
                    <button onClick={() => handleOpenModal(null)} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-5 w-5" /> Create New Template
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Template Name</th>
                                <th className="px-6 py-3">Subject</th>
                                <th className="px-6 py-3">Last Updated</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map(template => (
                                <tr key={template.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{template.name}</td>
                                    <td className="px-6 py-4">{template.subject}</td>
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
                     {templates.length === 0 && <p className="text-center text-gray-500 py-8 italic">No email templates created yet.</p>}
                </div>
            </div>
            
            {isModalOpen && (
                <EmailTemplateModal
                    template={editingTemplate}
                    onClose={() => setIsModalOpen(false)}
                    showNotification={showNotification}
                />
            )}

            {templateToDelete && (
                <DeleteEmailTemplateConfirmationModal
                    template={templateToDelete}
                    onClose={() => setTemplateToDelete(null)}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};
export default EmailTemplateManager;