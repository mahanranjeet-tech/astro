




import React, { useState, useEffect, useCallback } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { Save, Loader, ArrowUp, ArrowDown, Trash2, Settings, Plus, ChevronDown, Megaphone, Home, RefreshCcw } from 'lucide-react';

import type { 
    HomePageDefinition, HomePageSection, HomePageSectionType, 
    AppDefinition, BlogPost, Review, VideoTestimonial,
    NotificationType,
    BaseHomePageSection,
    HomePageHeroSection,
    HomePageExpertSection,
    HomePageAppShowcaseTitleSection,
    HomePageAppItemSection,
    HomePageStatsSection,
    HomePageUpcomingAppsSection,
    HomePageVideoTestimonialsSection,
    HomePageTextReviewsSection,
    HomePageBlogSection
} from '../../types.ts';
import { defaultHomePageData } from '../../utils/defaultHomePageData.ts';

interface HomePageManagerProps {
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    apps: AppDefinition[];
    blogPosts: BlogPost[];
    allReviews: Review[];
    videoTestimonials: VideoTestimonial[];
}

interface SectionEditorProps {
    section: HomePageSection;
    updateSection: (id: string, updates: Partial<HomePageSection>) => void;
    availableApps: AppDefinition[];
    availablePosts: BlogPost[];
    availableReviews: Review[];
    availableTestimonials: VideoTestimonial[];
}


const SectionEditor: React.FC<SectionEditorProps> = ({ section, updateSection, availableApps, availablePosts, availableReviews, availableTestimonials }) => {
    const handleChange = (field: string, value: any) => {
        updateSection(section.id, { [field]: value } as Partial<HomePageSection>);
    };
    
    const handleNestedChange = (arrayField: string, index: number, itemField: string, value: string) => {
        const items = (section as any)[arrayField] ? [...(section as any)[arrayField]] : [];
        items[index] = { ...items[index], [itemField]: value };
        updateSection(section.id, { [arrayField]: items } as Partial<HomePageSection>);
    };

    const addNestedItem = (arrayField: string, newItem: object) => {
        const items = (section as any)[arrayField] ? [...(section as any)[arrayField]] : [];
        items.push({ ...newItem, id: uuidv4() });
        updateSection(section.id, { [arrayField]: items } as Partial<HomePageSection>);
    };

    const removeNestedItem = (arrayField: string, id: string) => {
        const items = (section as any)[arrayField] ? [...(section as any)[arrayField]] : [];
        updateSection(section.id, { [arrayField]: items.filter((item: any) => item.id !== id) } as Partial<HomePageSection>);
    };
    
    const handleMultiSelectChange = (field: string, id: string) => {
        const currentIds = (section as any)[field] || [];
        const newIds = currentIds.includes(id) ? currentIds.filter((i: string) => i !== id) : [...currentIds, id];
        updateSection(section.id, { [field]: newIds } as Partial<HomePageSection>);
    };


    switch (section.type) {
        case 'hero':
            return <div className="space-y-2"><input type="text" value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Title (HTML allowed)" className="w-full p-1 border rounded" /><textarea value={section.subtitle} onChange={e => handleChange('subtitle', e.target.value)} placeholder="Subtitle" className="w-full p-1 border rounded h-20" /><input type="text" value={section.ctaText} onChange={e => handleChange('ctaText', e.target.value)} placeholder="CTA Button Text" className="w-full p-1 border rounded" /><input type="text" value={section.ctaLink} onChange={e => handleChange('ctaLink', e.target.value)} placeholder="CTA Button Link" className="w-full p-1 border rounded" /></div>;
        case 'expert':
            return <div className="space-y-2"><input value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Section Title" className="w-full p-1 border rounded" /><input value={section.imageUrl} onChange={e => handleChange('imageUrl', e.target.value)} placeholder="Image URL" className="w-full p-1 border rounded" /><input value={section.name} onChange={e => handleChange('name', e.target.value)} placeholder="Name" className="w-full p-1 border rounded" /><input value={section.role} onChange={e => handleChange('role', e.target.value)} placeholder="Role" className="w-full p-1 border rounded" /><input value={section.qualifications} onChange={e => handleChange('qualifications', e.target.value)} placeholder="Qualifications" className="w-full p-1 border rounded" /><input value={section.subheading} onChange={e => handleChange('subheading', e.target.value)} placeholder="Subheading" className="w-full p-1 border rounded" /><div>{section.achievements.map((ach, i) => <div key={ach.id} className="flex gap-1 mb-1"><textarea value={ach.text} onChange={e => handleNestedChange('achievements', i, 'text', e.target.value)} className="w-full p-1 border rounded text-xs h-16" /><button type="button" onClick={() => removeNestedItem('achievements', ach.id)} className="p-1 text-red-500"><Trash2 size={14}/></button></div>)}<button type="button" onClick={() => addNestedItem('achievements', {text:''})} className="text-blue-600 text-xs">+ Add Achievement</button></div></div>;
        case 'app_showcase_title':
            return <input type="text" value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Section Title (HTML allowed)" className="w-full p-1 border rounded" />;
        case 'app_item':
            return <div className="space-y-2">
                <select value={section.appId} onChange={e => handleChange('appId', e.target.value)} className="w-full p-1 border rounded bg-white"><option value="">-- Select App to Feature --</option>{availableApps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                <input value={section.customTitle} onChange={e => handleChange('customTitle', e.target.value)} placeholder="Custom Title (optional)" className="w-full p-1 border rounded" />
                <textarea value={section.customDescription} onChange={e => handleChange('customDescription', e.target.value)} placeholder="Custom Description (HTML)" className="w-full p-1 border rounded h-20" />
                <input value={section.customCtaText} onChange={e => handleChange('customCtaText', e.target.value)} placeholder="Custom Button Text" className="w-full p-1 border rounded" />
                <div>
                    <h5 className="text-xs font-semibold mt-2">Image URLs (for carousel)</h5>
                    {(section.imageOverrideUrls || []).map((url, i) => (
                        <div key={i} className="flex gap-1 mb-1">
                            <input 
                                value={url} 
                                onChange={e => {
                                    const newUrls = [...(section.imageOverrideUrls || [])];
                                    newUrls[i] = e.target.value;
                                    handleChange('imageOverrideUrls', newUrls);
                                }} 
                                placeholder="Image URL or 'svg'"
                                className="w-full p-1 border rounded"
                            />
                            <button type="button" onClick={() => {const newUrls = (section.imageOverrideUrls || []).filter((_, idx) => idx !== i); handleChange('imageOverrideUrls', newUrls);}} className="p-1 text-red-500"><Trash2 size={14}/></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => {const newUrls = [...(section.imageOverrideUrls || []), '']; handleChange('imageOverrideUrls', newUrls);}} className="text-blue-600 text-xs">+ Add Image URL</button>
                </div>
                <select value={section.layout} onChange={e => handleChange('layout', e.target.value)} className="w-full p-1 border rounded bg-white"><option value="image_left">Image Left</option><option value="image_right">Image Right</option></select>
                <div className="pt-2 border-t">
                    <label htmlFor={`speed-${section.id}`} className="text-xs font-semibold text-gray-600 block mb-1">Image Carousel Speed (ms)</label>
                    <input
                        id={`speed-${section.id}`}
                        type="number"
                        value={section.imageCarouselSpeed || 1000}
                        onChange={e => handleChange('imageCarouselSpeed', parseInt(e.target.value, 10) || 1000)}
                        className="w-full p-1 border rounded"
                        step="100"
                        min="100"
                    />
                     <p className="text-gray-500 text-xs mt-1">Time in milliseconds between image changes (e.g., 1000 = 1 second).</p>
                </div>
                <div>
                    <h5 className="text-xs font-semibold mt-2">Features</h5>
                    {section.customFeatures.map((f, i) => (
                         <div key={f.id} className="p-2 border rounded bg-gray-100 space-y-1 mt-1">
                            <div className="flex gap-1">
                                <input value={f.icon} onChange={e => handleNestedChange('customFeatures', i, 'icon', e.target.value)} placeholder="Icon Name" className="w-1/3 p-1 border rounded" />
                                <input value={f.title} onChange={e => handleNestedChange('customFeatures', i, 'title', e.target.value)} placeholder="Feature Title" className="w-2/3 p-1 border rounded" />
                                <button type="button" onClick={() => removeNestedItem('customFeatures', f.id)} className="p-1 text-red-500"><Trash2 size={14}/></button>
                            </div>
                            <textarea value={f.description} onChange={e => handleNestedChange('customFeatures', i, 'description', e.target.value)} placeholder="Feature Description" className="w-full p-1 border rounded h-12 text-xs" />
                        </div>
                    ))}
                    <button type="button" onClick={() => addNestedItem('customFeatures', {icon:'', title:'', description: ''})} className="text-blue-600 text-xs mt-1">+ Add Feature</button>
                </div>
            </div>;
        case 'stats':
            return <div className="space-y-2"><input value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Section Title" className="w-full p-1 border rounded" /><div>{section.metrics.map((m, i) => <div key={m.id} className="flex gap-1 mb-1"><input value={m.value} onChange={e => handleNestedChange('metrics', i, 'value', e.target.value)} placeholder="Value" className="w-1/2 p-1 border rounded" /><input value={m.label} onChange={e => handleNestedChange('metrics', i, 'label', e.target.value)} placeholder="Label" className="w-1/2 p-1 border rounded" /><button type="button" onClick={() => removeNestedItem('metrics', m.id)}><Trash2 size={14}/></button></div>)}<button type="button" onClick={() => addNestedItem('metrics', {value:'', label:''})} className="text-blue-600 text-xs">+ Add Metric</button></div></div>;
        case 'upcoming_apps':
            return <div className="space-y-2"><input value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Section Title (HTML)" className="w-full p-1 border rounded" /><input value={section.subtitle} onChange={e => handleChange('subtitle', e.target.value)} placeholder="Subtitle" className="w-full p-1 border rounded" /><div>{section.apps.map((app, i) => <div key={app.id} className="p-2 border rounded bg-white space-y-1 mb-1"><input value={app.icon} onChange={e => handleNestedChange('apps', i, 'icon', e.target.value)} placeholder="Icon" className="w-full p-1 border"/><input value={app.title} onChange={e => handleNestedChange('apps', i, 'title', e.target.value)} placeholder="Title" className="w-full p-1 border"/><textarea value={app.description} onChange={e => handleNestedChange('apps', i, 'description', e.target.value)} placeholder="Description" className="w-full p-1 border h-16"/><button type="button" onClick={() => removeNestedItem('apps', app.id)}><Trash2 size={14}/></button></div>)}<button type="button" onClick={() => addNestedItem('apps', {icon:'', title:'', description:''})} className="text-blue-600 text-xs">+ Add App</button></div></div>;
        case 'video_testimonials': {
            const testimonialIds = section.testimonialIds || [];
            if (!availableTestimonials) {
                return <p className="text-xs text-gray-500 italic">Loading testimonials...</p>;
            }
            return <div className="space-y-2"><input value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Section Title (HTML)" className="w-full p-1 border rounded" /><div className="p-2 border bg-white rounded-md max-h-40 overflow-y-auto space-y-1">{availableTestimonials.map(t => <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={testimonialIds.includes(t.id)} onChange={() => handleMultiSelectChange('testimonialIds', t.id)}/>{t.name} - {t.place}</label>)}</div></div>;
        }
        case 'text_reviews': {
            const reviewIds = section.reviewIds || [];
            if (!availableReviews) {
                 return <p className="text-xs text-gray-500 italic">Loading reviews...</p>;
            }
            return <div className="space-y-2"><input value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Section Title (HTML)" className="w-full p-1 border rounded" /><div className="p-2 border bg-white rounded-md max-h-40 overflow-y-auto space-y-1">{availableReviews.map(r => <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={reviewIds.includes(r.id)} onChange={() => handleMultiSelectChange('reviewIds', r.id)}/>"{r.review.substring(0, 30)}..." - {r.userName}</label>)}</div></div>;
        }
        case 'blog': {
            const postIds = section.postIds || [];
             if (!availablePosts) {
                 return <p className="text-xs text-gray-500 italic">Loading posts...</p>;
            }
            return <div className="space-y-2"><input value={section.title} onChange={e => handleChange('title', e.target.value)} placeholder="Section Title (HTML)" className="w-full p-1 border rounded" /><div className="p-2 border bg-white rounded-md max-h-40 overflow-y-auto space-y-1">{availablePosts.map(p => <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={postIds.includes(p.id)} onChange={() => handleMultiSelectChange('postIds', p.id)}/>{p.title}</label>)}</div></div>;
        }
        default: {
            const _exhaustiveCheck: never = section;
            return <p className="text-xs text-gray-500 italic">This section type has no specific configuration options.</p>;
        }
    }
}

const HomePageManager: React.FC<HomePageManagerProps> = ({ showNotification, apps, blogPosts, allReviews, videoTestimonials }) => {
    const [pageDef, setPageDef] = useState<HomePageDefinition | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        try {
            const docRef = db.collection('site_content').doc('homepage');
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                setPageDef(docSnap.data() as HomePageDefinition);
            } else {
                const emptyDef: HomePageDefinition = { id: 'homepage', sections: [] };
                await docRef.set(emptyDef);
                setPageDef(emptyDef);
            }
        } catch (error) {
            console.error("Error fetching homepage content:", error);
            showNotification('Failed to load homepage content.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);


    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleRestoreDefaults = async () => {
        if (window.confirm('Are you sure you want to restore the default homepage layout? All your current changes will be lost and replaced with the sample data.')) {
            setIsSaving(true);
            try {
                setPageDef(defaultHomePageData);
                showNotification('Default layout restored. Click "Save Homepage" to apply changes.', 'info', 4000);
            } catch (error) {
                console.error("Error restoring defaults:", error);
                showNotification('Failed to restore default homepage.', 'error');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleSave = async () => {
        if (!pageDef) return;
        setIsSaving(true);
        try {
            const docRef = db.collection('site_content').doc('homepage');
            const dataToSave = {
                ...pageDef,
                sections: pageDef.sections.map((section, index) => ({ ...section, order: index })),
                updatedAt: FieldValue.serverTimestamp()
            };
            await docRef.set(dataToSave, { merge: true });
            showNotification('Homepage updated successfully!', 'success');
        } catch (error) {
            console.error("Error saving homepage content:", error);
            showNotification('Failed to save homepage content.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const setSections = (updater: (prev: HomePageSection[]) => HomePageSection[]) => {
        if (!pageDef) return;
        setPageDef(prev => ({ ...prev!, sections: updater(prev!.sections || []) }));
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        setSections(prev => {
            const newOrder = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newOrder.length) return newOrder;
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
            return newOrder;
        });
    };

// FIX: The function was causing a TypeScript inference error. This rewritten version
// returns the object literals directly with hardcoded `type` properties, ensuring that
// TypeScript correctly identifies it as a member of the HomePageSection union type.
const createSection = (type: HomePageSectionType): HomePageSection => {
    const id = uuidv4();
    const enabled = true;

    switch (type) {
        case 'hero':
            return { id, enabled, type: 'hero', title: '', subtitle: '', ctaText: '', ctaLink: '' };
        case 'expert':
            return { id, enabled, type: 'expert', title: '', imageUrl: '', name: '', role: '', qualifications: '', subheading: '', achievements: [] };
        case 'app_showcase_title':
            return { id, enabled, type: 'app_showcase_title', title: 'Our Core Digital Applications' };
        case 'app_item':
            return { id, enabled, type: 'app_item', appId: '', customTitle: '', customDescription: '', customFeatures: [], customCtaText: '', customCtaLink: '', imageOverrideUrls: [], layout: 'image_left', imageCarouselSpeed: 1000 };
        case 'stats':
            return { id, enabled, type: 'stats', title: 'Our Impact in Numbers', metrics: [] };
        case 'upcoming_apps':
            return { id, enabled, type: 'upcoming_apps', title: 'Future Innovations', subtitle: '', apps: [] };
        case 'video_testimonials':
            return { id, enabled, type: 'video_testimonials', title: 'Client Video Testimonials', testimonialIds: [] };
        case 'text_reviews':
            return { id, enabled, type: 'text_reviews', title: 'What Our Clients Say', reviewIds: [] };
        case 'blog':
            return { id, enabled, type: 'blog', title: 'Insights from Our Expert Blog', postIds: [] };
        default: {
            // This will cause a compile-time error if a new HomePageSectionType is added but not handled.
            const _exhaustiveCheck: never = type;
            throw new Error(`Unhandled section type: ${_exhaustiveCheck}`);
        }
    }
};

    const addSection = (type: HomePageSectionType) => {
        const newSection = createSection(type);
        setSections(prev => [...prev, newSection]);
    };

    const removeSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));
    const updateSection = (id: string, updates: Partial<HomePageSection>) => setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    
    if (isLoading) return <div className="flex items-center justify-center p-10"><Loader className="animate-spin text-blue-500" size={48} /></div>;
    if (!pageDef) return <div className="p-10 text-center">Could not load homepage data.</div>;

    const allSectionTypes: HomePageSectionType[] = ['hero', 'expert', 'app_showcase_title', 'app_item', 'stats', 'upcoming_apps', 'video_testimonials', 'text_reviews', 'blog'];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Home size={24} /> Homepage Builder</h2>
                    <p className="text-gray-500 mt-1">Drag, drop, and edit the sections of your main landing page.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={handleRestoreDefaults} disabled={isSaving} className="flex items-center justify-center bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-yellow-300">
                        <RefreshCcw className="mr-2" size={20} />
                        Restore Default
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                        {isSaving ? <Loader className="animate-spin mr-2" /> : <Save className="mr-2" />} {isSaving ? 'Saving...' : 'Save Homepage'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold">Page Sections</h3>
                     <div className="p-3 bg-gray-50 rounded-lg border min-h-[300px] space-y-2">
                        {pageDef.sections.map((section, index) => (
                            <div key={section.id} className="bg-white border rounded-md shadow-sm">
                                <div className="flex items-center gap-2 p-2">
                                    <span className="flex-grow font-medium text-gray-700 text-sm">{section.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                    <label className="flex items-center cursor-pointer"><input type="checkbox" checked={section.enabled} onChange={e => updateSection(section.id, { enabled: e.target.checked })} className="h-4 w-4" /><span className="text-xs ml-1">On</span></label>
                                    <div className="flex items-center border-l ml-2 pl-2">
                                        <button type="button" onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUp size={16} /></button>
                                        <button type="button" onClick={() => moveSection(index, 'down')} disabled={index === pageDef.sections.length - 1} className="p-1 disabled:opacity-30"><ArrowDown size={16} /></button>
                                        <button type="button" onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)} className={`p-1 rounded-full ${editingSectionId === section.id ? 'bg-blue-100 text-blue-600' : ''}`}><Settings size={16} /></button>
                                        <button type="button" onClick={() => removeSection(section.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                {editingSectionId === section.id && (
                                    <div className="p-3 border-t bg-gray-50 text-xs">
                                        <SectionEditor section={section} updateSection={updateSection} availableApps={apps} availablePosts={blogPosts} availableReviews={allReviews} availableTestimonials={videoTestimonials} />
                                    </div>
                                )}
                            </div>
                        ))}
                     </div>
                    <div className="mt-3 relative">
                        <select onChange={e => addSection(e.target.value as HomePageSectionType)} value="" className="w-full p-2 border rounded-md bg-white appearance-none text-sm font-semibold text-center text-blue-600 hover:bg-blue-50 cursor-pointer">
                            <option value="" disabled>-- Add a new section --</option>
                            {allSectionTypes.map(type => <option key={type} value={type as HomePageSectionType}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                    </div>
                </div>

                <div className="space-y-4">
                     <h3 className="text-lg font-semibold">SEO & Sharing</h3>
                     <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
                        <input type="text" value={pageDef.metaTitle || ''} onChange={e => setPageDef(p => ({...p!, metaTitle: e.target.value}))} placeholder="Meta Title for Sharing" className="w-full p-2 border rounded-md" />
                        <textarea value={pageDef.metaDescription || ''} onChange={e => setPageDef(p => ({...p!, metaDescription: e.target.value}))} placeholder="Meta Description" className="w-full p-2 border rounded-md h-24" />
                        <input type="url" value={pageDef.featuredImageUrl || ''} onChange={e => setPageDef(p => ({...p!, featuredImageUrl: e.target.value}))} placeholder="Featured Image URL (for sharing)" className="w-full p-2 border rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePageManager;
