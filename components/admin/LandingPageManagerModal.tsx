import React, { useState } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { X, PlusCircle, Edit, Trash2, BookOpen, Link, Copy, CopyPlus } from 'lucide-react';
import type { AppDefinition, LandingPageDefinition, NotificationType } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';
import LandingPageEditorModal from './LandingPageEditorModal.tsx';
import DeleteLandingPageConfirmationModal from './DeleteLandingPageConfirmationModal.tsx';

interface LandingPageManagerModalProps {
    app: AppDefinition;
    landingPages: LandingPageDefinition[];
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const slugify = (text: string): string => {
    return text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const LandingPageManagerModal: React.FC<LandingPageManagerModalProps> = ({ app, landingPages, onClose, showNotification }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<LandingPageDefinition | null>(null);
    const [pageToDelete, setPageToDelete] = useState<LandingPageDefinition | null>(null);

    const handleOpenEditor = (page: LandingPageDefinition | null = null) => {
        setEditingPage(page);
        setIsEditorOpen(true);
    };

    const handleCopyLink = (slug: string) => {
        const url = `${window.location.origin}/app/${slug}`;
        navigator.clipboard.writeText(url);
        showNotification('Landing page link copied!', 'success');
    };

    const handleDuplicatePage = async (pageToDuplicate: LandingPageDefinition) => {
        if (!window.confirm(`Are you sure you want to duplicate the page "${pageToDuplicate.name}"?`)) {
          return;
        }
    
        const { id, ...pageDataToCopy } = pageToDuplicate;
    
        const newPageData = {
            ...pageDataToCopy,
            name: `Copy of ${pageToDuplicate.name}`,
            slug: `copy-of-${pageToDuplicate.slug}-${uuidv4().substring(0, 4)}`,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
    
        try {
            await db.collection('landingPages').add(newPageData);
            showNotification('Landing page duplicated successfully!', 'success');
        } catch (error: any) {
            showNotification(`Error duplicating page: ${error.message}`, 'error');
            console.error("Duplicate Page Error: ", error);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                    <header className="p-6 border-b flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800">Manage Landing Pages</h3>
                            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <p className="text-gray-500 mt-1">For <span className="font-semibold">{app.name}</span></p>
                    </header>
                    <main className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50/50">
                        {landingPages.length > 0 ? (
                            <div className="space-y-3">
                                {landingPages.map(page => (
                                    <div key={page.id} className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800">{page.name}</p>
                                            <p className="text-sm text-gray-500 font-mono">/app/{page.slug}</p>
                                            <p className="text-xs text-gray-400 mt-1">Last updated: {formatTimestamp(page.updatedAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-1 self-end sm:self-center">
                                            <a href={`/app/${page.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full" title="Open Page"><Link size={16} /></a>
                                            <button onClick={() => handleCopyLink(page.slug)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full" title="Copy Link"><Copy size={16} /></button>
                                            <button onClick={() => handleDuplicatePage(page)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-full" title="Duplicate Page"><CopyPlus size={16} /></button>
                                            <button onClick={() => handleOpenEditor(page)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => setPageToDelete(page)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                                <h4 className="text-xl font-semibold">No Custom Landing Pages</h4>
                                <p>Create a custom landing page to get started.</p>
                            </div>
                        )}
                    </main>
                    <footer className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-between items-center rounded-b-xl border-t">
                        <p className="text-xs text-gray-500 mt-2 sm:mt-0">Legacy landing page (if enabled): <a href={`/app/${app.slug}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline">{app.slug}</a></p>
                        <button onClick={() => handleOpenEditor()} className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            <PlusCircle className="mr-2 h-5 w-5" /> Create New Landing Page
                        </button>
                    </footer>
                </div>
            </div>

            {isEditorOpen && (
                <LandingPageEditorModal
                    app={app}
                    page={editingPage}
                    onClose={() => setIsEditorOpen(false)}
                    showNotification={showNotification}
                />
            )}
            
            {pageToDelete && (
                <DeleteLandingPageConfirmationModal
                    page={pageToDelete}
                    onClose={() => setPageToDelete(null)}
                    showNotification={showNotification}
                />
            )}
        </>
    );
};

export default LandingPageManagerModal;