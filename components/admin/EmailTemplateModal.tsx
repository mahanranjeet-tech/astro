







import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { X, Save, Loader, Code, Eye, Link as LinkIcon, Trash2 } from 'lucide-react';
import type { EmailTemplate, NotificationType } from '../../types.ts';

interface EmailTemplateModalProps {
    template: EmailTemplate | null;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const VariableReference: React.FC = () => (
    <div className="space-y-3 text-xs text-gray-600 bg-gray-100 p-3 rounded-md">
        <h4 className="font-bold text-sm text-gray-800">Available Variables</h4>
        <div>
            <p className="font-semibold">OTP Verification:</p>
            <code>{'{userName}'}, {'{otp}'}</code>
        </div>
        <div>
            <p className="font-semibold">New Purchase / Sign Up (Guest):</p>
            <code className="block break-words">{'{userName}'}, {'{userEmail}'}, {'{userPhone}'}, {'{password}'}, {'{itemsList}'}, {'{totalAmount}'}, {'{orderId}'}, {'{loginLink}'}</code>
        </div>
        <div>
            <p className="font-semibold">Existing User Credit Purchase:</p>
            <code className="block break-words">{'{userName}'}, {'{userEmail}'}, {'{userPhone}'}, {'{itemsList}'}, {'{totalAmount}'}, {'{orderId}'}, {'{loginLink}'}</code>
        </div>
        <div>
            <p className="font-semibold">Webinar Purchase (Success/Auto-Registered):</p>
            <code className="block break-words">
                {'{userName}'}, {'{webinarName}'}, {'{webinarDate}'}, {'{webinarTime}'},
                <strong className="text-blue-600"> {'{joiningLink}'}</strong> (unique),
                <strong className="text-blue-600"> {'{webinarPasscode}'}</strong>,
                <strong className="text-blue-600"> {'{webinarId}'}</strong>
            </code>
        </div>
        <div>
            <p className="font-semibold mt-2">Webinar Purchase (Fallback/Manual):</p>
            <code className="block break-words">
                {'{userName}'}, {'{userEmail}'}, {'{userPhone}'}, {'{webinarName}'}, {'{webinarDate}'}, {'{webinarTime}'}, {'{webinarLink}'} (pre-filled),
                <strong className="text-blue-600"> {'{webinarPasscode}'}</strong>,
                <strong className="text-blue-600"> {'{webinarId}'}</strong>
            </code>
        </div>
        <div>
            <p className="font-semibold">New Appointment Booked (for User):</p>
            <code className="block break-words">{'{userName}'}, {'{consultantName}'}, {'{appointmentDate}'}, {'{appointmentTime}'}, {'{meetingLink}'}, {'{rescheduleLink}'}</code>
        </div>
        <div>
            <p className="font-semibold">New Appointment Booked (for Consultant):</p>
            <code className="block break-words">{'{userName}'}, {'{userEmail}'}, {'{userPhone}'}, {'{consultantName}'}, {'{appointmentDate}'}, {'{appointmentTime}'}, {'{meetingLink}'}, {'{rescheduleLink}'}</code>
        </div>
         <div>
            <p className="font-semibold">Appointment Rescheduled (for User):</p>
            <code className="block break-words">{'{userName}'}, {'{consultantName}'}, {'{oldAppointmentDate}'}, {'{oldAppointmentTime}'}, {'{newAppointmentDate}'}, {'{newAppointmentTime}'}, {'{meetingLink}'}, {'{rescheduleLink}'}</code>
        </div>
        <div>
            <p className="font-semibold">Appointment Rescheduled (for Consultant):</p>
            <code className="block break-words">{'{userName}'}, {'{userEmail}'}, {'{userPhone}'}, {'{consultantName}'}, {'{oldAppointmentDate}'}, {'{oldAppointmentTime}'}, {'{newAppointmentDate}'}, {'{newAppointmentTime}'}, {'{meetingLink}'}, {'{rescheduleLink}'}</code>
        </div>
        <div>
            <p className="font-semibold">Global Site Variables:</p>
            <code className="block break-words">{'{facebookLink}'}, {'{instagramLink}'}, {'{youtubeLink}'}, {'{xLink}'}, {'{linkedinLink}'}</code>
            <p className="mt-1 text-gray-500 italic">Note: These variables will be replaced with colorful social media icons linked to the URLs you set in Site Content.</p>
        </div>
         <p className="mt-2 pt-2 border-t text-gray-500 italic">Note: <code>{'{itemsList}'}</code> renders an HTML list with the app name, tier, and credits for each purchased item.</p>
         <p className="mt-1 text-gray-500 italic">Note: <code>{'{meetingLink}'}</code> is the raw URL for the Google Meet call. You should use it in an HTML anchor tag like: &lt;a href="{'{meetingLink}'}"&gt;Join Meeting&lt;/a&gt;</p>
    </div>
);

// This function generates the full HTML for the email preview, matching the backend structure.
const getPreviewHtml = (body: string, bannerUrl?: string): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Email Preview</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f4; font-family: sans-serif; }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #f4f4f4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td bgcolor="#f4f4f4" align="center" style="padding: 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td bgcolor="#ffffff" align="left" style="padding: 0; border-radius: 8px; overflow: hidden;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${bannerUrl ? `
                <tr>
                  <td align="center" style="font-size: 0; line-height: 0;">
                    <a href="#" target="_blank">
                      <img src="${bannerUrl}" alt="Banner" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;">
                    </a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td align="left" style="padding: 20px 30px; font-size: 16px; line-height: 24px; color: #333; text-align: left;">
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};


const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({ template, onClose, showNotification }) => {
    const [formData, setFormData] = useState({ name: '', subject: '', body: '', bannerImageUrl: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');

    useEffect(() => {
        if (template) {
            setFormData({ name: template.name, subject: template.subject, body: template.body, bannerImageUrl: template.bannerImageUrl || '' });
        }
    }, [template]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleRemoveBanner = () => {
       setFormData(prev => ({ ...prev, bannerImageUrl: '' }));
       showNotification('Banner URL removed.', 'info');
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
                await db.collection('email_templates').doc(template.id).update(dataToSave);
                showNotification('Template updated successfully!', 'success');
            } else {
                await db.collection('email_templates').add({
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{template ? 'Edit Email Template' : 'Create New Template'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Template Name (for your reference)" required className="w-full p-3 border rounded-lg text-lg font-semibold" />
                        <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Email Subject" required className="w-full p-3 border rounded-lg" />
                        
                         <div>
                            <label htmlFor="bannerImageUrl" className="text-sm font-medium text-gray-700 mb-1 block">Banner Image URL (Optional)</label>
                             <div className="p-3 bg-gray-50 border rounded-lg space-y-2">
                                <div className="flex items-center gap-2">
                                     <LinkIcon className="text-gray-400 flex-shrink-0" size={20} />
                                    <input
                                        id="bannerImageUrl"
                                        name="bannerImageUrl"
                                        type="url"
                                        value={formData.bannerImageUrl}
                                        onChange={handleChange}
                                        placeholder="https://example.com/banner.png"
                                        className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                {formData.bannerImageUrl && (
                                    <div className="relative group">
                                        <img src={formData.bannerImageUrl} alt="Banner Preview" className="w-full h-auto max-h-40 object-contain rounded-md border"/>
                                        <button
                                            type="button"
                                            onClick={handleRemoveBanner}
                                            className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove Banner"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-1">Paste a direct link to a publicly hosted image. Recommended width: 600px.</p>
                             </div>
                        </div>

                        <div>
                            <div className="flex border-b">
                                <button type="button" onClick={() => setEditorMode('code')} className={`flex items-center gap-2 py-2 px-4 text-sm font-semibold ${editorMode === 'code' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}><Code size={16}/> Code (HTML)</button>
                                <button type="button" onClick={() => setEditorMode('visual')} className={`flex items-center gap-2 py-2 px-4 text-sm font-semibold ${editorMode === 'visual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}><Eye size={16}/> Visual Preview</button>
                            </div>
                            {editorMode === 'code' ? (
                                <textarea name="body" value={formData.body} onChange={handleChange} placeholder="Enter email body HTML here..." required className="w-full p-3 border-0 rounded-b-lg h-96 resize-y font-mono bg-gray-800 text-green-400" />
                            ) : (
                                <div className="p-3 border rounded-b-lg h-96 overflow-y-auto bg-gray-50">
                                    <iframe srcDoc={getPreviewHtml(formData.body, formData.bannerImageUrl)} title="Email Preview" className="w-full h-full border-0 bg-white" />
                                </div>
                            )}
                        </div>
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

export default EmailTemplateModal;