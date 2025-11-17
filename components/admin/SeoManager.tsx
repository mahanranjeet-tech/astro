





import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase.ts';
import { Save, Loader } from 'lucide-react';
import type { NotificationType, SeoState } from '../../types.ts';

interface SeoManagerProps {
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const staticPages = [
    { key: 'about', label: 'About Us' },
    { key: 'contact', label: 'Contact Us' },
    { key: 'pricing', label: 'Pricing Page' },
    { key: 'privacy', label: 'Privacy Policy' },
    { key: 'terms', label: 'Terms & Conditions' },
    { key: 'refund', label: 'Refund Policy' },
    { key: 'shipping', label: 'Shipping Policy' },
];


const SeoManager: React.FC<SeoManagerProps> = ({ showNotification }) => {
    const [seoData, setSeoData] = useState<SeoState>({ title: '', keywords: '', description: '', featuredImageUrl: '', staticPages: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchSeoData = useCallback(async () => {
        setIsLoading(true);
        try {
            const seoDocRef = db.collection('site_content').doc('seo');
            const docSnap = await seoDocRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                setSeoData({
                    title: data?.title || '',
                    keywords: data?.keywords || '',
                    description: data?.description || '',
                    featuredImageUrl: data?.featuredImageUrl || '',
                    staticPages: data?.staticPages || {},
                });
            }
        } catch (error) {
            console.error("Error fetching SEO data:", error);
            showNotification('Failed to load SEO data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchSeoData();
    }, [fetchSeoData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSeoData(prev => ({ ...prev, [name]: value }));
    };

    const handleStaticPageChange = (key: string, field: 'title' | 'description', value: string) => {
        setSeoData(prev => ({
            ...prev,
            staticPages: {
                ...prev.staticPages,
                [key]: {
                    ...(prev.staticPages?.[key] || { title: '', description: '' }),
                    [field]: value
                }
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const seoDocRef = db.collection('site_content').doc('seo');
            await seoDocRef.set(seoData, { merge: true });
            showNotification('SEO settings updated successfully!', 'success');
        } catch (error) {
            console.error("Error saving SEO data:", error);
            showNotification('Failed to save SEO settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-10">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">SEO Settings</h2>
                    <p className="text-gray-500 mt-1">Manage meta keywords and description for search engines.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 w-full sm:w-auto"
                >
                    {isSaving ? <Loader className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
                 <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Global SEO Settings</h3>
                    <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                        <div>
                            <label htmlFor="keywords" className="text-md font-semibold text-gray-700 block mb-2">Global Meta Keywords</label>
                            <textarea
                                id="keywords"
                                name="keywords"
                                value={seoData.keywords}
                                onChange={handleChange}
                                placeholder="powerful tools, user management, admin dashboard, saas"
                                className="w-full h-24 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-y bg-white text-gray-900 placeholder-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Enter a comma-separated list of keywords relevant to your entire site. These are used as a fallback.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Static Page SEO</h3>
                     <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r-lg mb-4">
                        <p className="font-bold">Note:</p>
                        <p className="text-sm">SEO for the main homepage is managed in the <strong>Homepage Builder</strong> tab. Use this section for other static pages like 'About Us', 'Pricing', etc.</p>
                    </div>
                    <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                        {staticPages.map(page => (
                            <div key={page.key} className="p-3 border-b last:border-b-0">
                                <h4 className="font-semibold text-gray-700 mb-2">{page.label} Page</h4>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={seoData.staticPages?.[page.key]?.title || ''}
                                        onChange={(e) => handleStaticPageChange(page.key, 'title', e.target.value)}
                                        placeholder="Meta Title"
                                        maxLength={70}
                                        className="w-full p-2 border rounded-lg bg-white"
                                    />
                                    <textarea
                                        value={seoData.staticPages?.[page.key]?.description || ''}
                                        onChange={(e) => handleStaticPageChange(page.key, 'description', e.target.value)}
                                        placeholder="Meta Description"
                                        maxLength={160}
                                        className="w-full p-2 border rounded-lg bg-white h-20 resize-y"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeoManager;