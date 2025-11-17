import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { X, Save, Loader, ArrowUp, ArrowDown, Trash2, Settings, Plus, ChevronDown } from 'lucide-react';
import type { Consultant, ConsultantPackage, MediaFile, VideoTestimonial, NotificationType, ConsultantPageDefinition, ConsultantPageSection, ConsultantPageSectionType, HeroSectionContent, FeaturedInLogo, BenefitItem, ProblemItem, DelineationContent, DeliverableItem, AudienceItem, FaqItem, WebinarProduct } from '../../types.ts';
import { v4 as uuidv4 } from 'uuid';
import { defaultPageData } from '../../utils/defaultConsultantPageData.ts';

interface ConsultantPageEditorModalProps {
    consultant: Consultant;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    isUserManaged?: boolean;
    consultantPackages: ConsultantPackage[];
    adminMediaFiles?: MediaFile[];
    consultantMediaFiles?: MediaFile[];
    videoTestimonials: VideoTestimonial[];
}

const slugify = (text: string): string => {
    return text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const allPossibleSections: { type: ConsultantPageSectionType; label: string }[] = [
    { type: 'hero', label: 'Hero Section' },
    { type: 'featured_in', label: 'Featured In' },
    { type: 'packages', label: 'Pricing Packages' },
    { type: 'benefits', label: 'Benefits ("What You Gain")' },
    { type: 'problems', label: 'Problems ("Vastu Dosh")' },
    { type: 'delineation', label: 'Delineation ("Vastu vs Hybrid")' },
    { type: 'deliverables', label: 'Deliverables' },
    { type: 'audience', label: 'Audience ("Who Should Attend")' },
    { type: 'about_coach', label: 'About The Coach' },
    { type: 'faq', label: 'FAQ Section' },
    { type: 'webinar', label: 'Webinar' },
    { type: 'video_testimonials', label: 'Video Testimonials' },
    { type: 'social_connect', label: 'Social Media Connect' },
];


const ConsultantPageEditorModal: React.FC<ConsultantPageEditorModalProps> = ({ consultant, onClose, showNotification, isUserManaged, consultantPackages, adminMediaFiles, consultantMediaFiles, videoTestimonials }) => {
    const [pageDef, setPageDef] = useState<Partial<ConsultantPageDefinition>>({ brandName: '', sections: [], footerDisclaimer: '', whatsappGroupLink: '', facebookGroupLink: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [availableWebinars, setAvailableWebinars] = useState<WebinarProduct[]>([]);
    
    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const snapshot = await db.collection('webinar_products').orderBy('createdAt', 'desc').get();
                setAvailableWebinars(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WebinarProduct)));
            } catch (error) {
                showNotification("Could not load available webinars.", "error");
            }
        };
        fetchDependencies();
    }, [showNotification]);

    useEffect(() => {
        const fetchPageDef = async () => {
            setIsLoading(true);
            try {
                const docRef = db.collection('consultant_pages').doc(consultant.id);
                const docSnap = await docRef.get();
                if (docSnap.exists && docSnap.data()?.sections?.length > 0) {
                    setPageDef(docSnap.data() as ConsultantPageDefinition);
                } else {
                    // Pre-populate with default data if no sections exist
                    setPageDef({...defaultPageData, whatsappGroupLink: '', facebookGroupLink: ''});
                }
            } catch (error) {
                showNotification("Failed to load page definition.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPageDef();
    }, [consultant.id, showNotification]);

    const setSections = (updater: (prev: ConsultantPageSection[]) => ConsultantPageSection[]) => {
        setPageDef(prev => ({ ...prev, sections: updater(prev.sections || []) }));
    };
    
    // Generic repeatable field handler
    const handleRepeatableChange = (sectionId: string, path: string, index: number, field: string, value: string) => {
        setSections(prevSections => {
            return prevSections.map(section => {
                if (section.id === sectionId) {
                    // Deep copy to avoid direct state mutation, especially for nested objects
                    const newSection = JSON.parse(JSON.stringify(section));
                    const keys = path.split('.');
                    
                    let targetArray = newSection;
                    for (const key of keys) {
                        if (targetArray[key] === undefined) {
                            console.error(`Path ${path} not found in section`, section);
                            return section; // Return original section if path is invalid
                        }
                        targetArray = targetArray[key];
                    }
    
                    if (Array.isArray(targetArray) && targetArray[index]) {
                        targetArray[index][field] = value;
                        return newSection;
                    }
                }
                return section;
            });
        });
    };
    
    const handleRepeatablePointsChange = (sectionId: string, path: string, index: number, value: string) => {
        setSections(prevSections => {
            return prevSections.map(section => {
                if (section.id === sectionId) {
                    const newSection = JSON.parse(JSON.stringify(section));
                    const keys = path.split('.');
                    
                    let targetArray = newSection;
                     for (const key of keys) {
                        targetArray = targetArray[key];
                    }
    
                    if (Array.isArray(targetArray) && targetArray[index]) {
                        targetArray[index].points = value.split('\n');
                        return newSection;
                    }
                }
                return section;
            });
        });
    }

    const addRepeatableItem = (sectionId: string, path: string, newItem: any) => {
        setSections(prevSections => {
            return prevSections.map(section => {
                if (section.id === sectionId) {
                    const newSection = JSON.parse(JSON.stringify(section));
                    const keys = path.split('.');
                    
                    let targetObject = newSection;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!targetObject[keys[i]]) {
                             targetObject[keys[i]] = {}; // Create nested objects if they don't exist
                        }
                        targetObject = targetObject[keys[i]];
                    }
                    
                    const finalKey = keys[keys.length - 1];
                    if (!Array.isArray(targetObject[finalKey])) {
                        targetObject[finalKey] = [];
                    }

                    targetObject[finalKey].push({ ...newItem, id: uuidv4() });
                    return newSection;
                }
                return section;
            });
        });
    };
    
    const removeRepeatableItem = (sectionId: string, path: string, itemId: string) => {
        setSections(prevSections => {
            return prevSections.map(section => {
                if (section.id === sectionId) {
                    const newSection = JSON.parse(JSON.stringify(section));
                    const keys = path.split('.');
                    
                    let parent = newSection;
                    for(let i=0; i < keys.length - 1; i++) {
                        parent = parent[keys[i]];
                    }
                    
                    let array = parent[keys[keys.length - 1]];
                    if (Array.isArray(array)) {
                        parent[keys[keys.length - 1]] = array.filter((item: any) => item.id !== itemId);
                    }
                    
                    return newSection;
                }
                return section;
            });
        });
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

    const addSection = (type: ConsultantPageSectionType) => {
        const newSection: ConsultantPageSection = { 
            id: uuidv4(), 
            type, 
            order: (pageDef.sections || []).length 
        };
        // Add default content for sections that require it
        if(type === 'hero') newSection.heroContent = { id: uuidv4(), type: 'hero', processSteps: [{id: uuidv4(), title: 'Step 1', description: ''}] };
        if(type === 'delineation') newSection.delineationContent = { id: uuidv4(), type: 'delineation', mainHeadline: '', subHeadline: '', points: [{id: uuidv4(), title: 'Point 1', description: ''}] };
        if(type === 'social_connect') {
            newSection.socialConnectContent = {
                id: uuidv4(),
                title: 'Join Our Community',
                whatsappGroupLink: '',
                facebookGroupLink: ''
            };
        }
        setSections(prev => [...prev, newSection]);
    };
    
    const removeSection = (id: string) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const docRef = db.collection('consultant_pages').doc(consultant.id);
            const dataToSave = {
                consultantId: consultant.id,
                brandName: pageDef.brandName || '',
                footerDisclaimer: pageDef.footerDisclaimer || '',
                whatsappGroupLink: pageDef.whatsappGroupLink || '',
                facebookGroupLink: pageDef.facebookGroupLink || '',
                sections: (pageDef.sections || []).map((section, index) => ({ ...section, order: index })),
                updatedAt: FieldValue.serverTimestamp(),
            };
            await docRef.set(dataToSave, { merge: true });
            showNotification('Page layout saved!', 'success');
            onClose();
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const updateSection = (id: string, updates: Partial<ConsultantPageSection>) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const renderSectionEditor = (section: ConsultantPageSection) => {
         // A map to render specific editors for repeatable fields
        const editorMap: { [key: string]: { path: string, newItem: any, fields: any[] } } = {
            'hero': { path: 'heroContent.processSteps', newItem: { title: '', description: ''}, fields: [{name: 'title', ph: 'Step Title'}, {name: 'description', ph: 'Description', type: 'textarea'}] },
            'featured_in': { path: 'featuredInLogos', newItem: { imageUrl: '', altText: '' }, fields: [{ name: 'imageUrl', ph: 'Image URL'}, { name: 'altText', ph: 'Alt Text' }] },
            'benefits': { path: 'benefitsItems', newItem: { icon: '', title: '', description: '' }, fields: [{ name: 'icon', ph: 'Lucide Icon Name'}, { name: 'title', ph: 'Title' }, { name: 'description', ph: 'Description', type: 'textarea' }] },
            'problems': { path: 'problemsItems', newItem: { icon: '', title: '', points: [] }, fields: [{ name: 'icon', ph: 'Lucide Icon Name'}, { name: 'title', ph: 'Title'}, { name: 'points', ph: 'Points (one per line)', type: 'textarea-special' }] },
            'delineation': { path: 'delineationContent.points', newItem: { title: '', description: '' }, fields: [{name: 'title', ph: 'Point Title'}, {name: 'description', ph: 'Description', type: 'textarea'}]},
            'deliverables': { path: 'deliverablesItems', newItem: { icon: '', description: '' }, fields: [{ name: 'icon', ph: 'Lucide Icon Name'}, { name: 'description', ph: 'Description', type: 'textarea' }] },
            'audience': { path: 'audienceItems', newItem: { description: '' }, fields: [{ name: 'description', ph: 'Description (HTML allowed)', type: 'textarea' }] },
            'faq': { path: 'faqItems', newItem: { question: '', answer: '' }, fields: [{ name: 'question', ph: 'Question' }, { name: 'answer', ph: 'Answer', type: 'textarea' }] },
        };
        const editorConfig = editorMap[section.type];
        
        let items: any[] = [];
        if (editorConfig) {
            const keys = editorConfig.path.split('.');
            let current: any = section;
            for(const key of keys) {
                current = current ? current[key] : undefined;
            }
            items = current || [];
        }

        const handleSingleFieldChange = (sectionId: string, key: string, value: string) => {
            if(key.includes('.')) {
                const [mainKey, subKey] = key.split('.');
                updateSection(sectionId, { [mainKey]: { ...((section as any)[mainKey] || {}), [subKey]: value } });
            } else {
                updateSection(sectionId, { [key]: value });
            }
        };

        const renderSingleFields = () => {
             const fieldsMap: { [key: string]: any[] } = {
                'hero': [{name: 'heroContent.topBannerText', ph: 'Top Banner Text'}, {name: 'heroContent.mainHeadline', ph: 'Main Headline (HTML)'}, {name: 'heroContent.subHeadline', ph: 'Sub Headline'}],
                'packages': [{name: 'packagesTitle', ph: 'Section Title (HTML)'}, {name: 'packagesSubTitle', ph: 'Section Subtitle'}],
                'benefits': [{name: 'benefitsTitle', ph: 'Section Title (HTML)'}],
                'problems': [{name: 'problemsTitle', ph: 'Section Title (HTML)'}],
                'delineation': [{name: 'delineationContent.mainHeadline', ph: 'Main Headline (HTML)'}, {name: 'delineationContent.subHeadline', ph: 'Sub Headline'}],
                'deliverables': [{name: 'deliverablesTitle', ph: 'Section Title (HTML)'}],
                'audience': [{name: 'audienceTitle', ph: 'Section Title'}],
                'about_coach': [{name: 'aboutCoachTitle', ph: 'Section Title (HTML)'}],
                'faq': [{name: 'faqTitle', ph: 'Section Title'}],
                'webinar': [{name: 'webinarTitle', ph: 'Section Title (e.g., Join Our Exclusive Webinar)'}],
            };
            const fields = fieldsMap[section.type];
            
            if (section.type === 'webinar') {
                 return (
                    <div className="space-y-2">
                        <input type="text" value={(section as any)['webinarTitle'] || ''} onChange={e => handleSingleFieldChange(section.id, 'webinarTitle', e.target.value)} placeholder="Section Title (e.g., Join Our Exclusive Webinar)" className="w-full p-2 border rounded text-xs" />
                        <select value={section.webinarProductId || ''} onChange={e => updateSection(section.id, { webinarProductId: e.target.value })} className="w-full p-2 border rounded text-xs bg-white"><option value="">-- Select a Webinar --</option>{availableWebinars.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                    </div>
                );
            }

            if (section.type === 'video_testimonials') {
                return (
                    <div className="space-y-4">
                        <input type="text" value={section.videoTestimonialsTitle || ''} onChange={e => handleSingleFieldChange(section.id, 'videoTestimonialsTitle', e.target.value)} placeholder="Section Title (e.g., Hear from Our Clients)" className="w-full p-2 border rounded text-xs" />
                        
                        {!isUserManaged && (
                            <div className="pt-2">
                                <h5 className="text-xs font-semibold text-gray-600 mb-1">Select from Admin-Managed Testimonials</h5>
                                <div className="p-2 border bg-white rounded-md max-h-40 overflow-y-auto space-y-1">
                                    {videoTestimonials.map(t => (
                                        <label key={t.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                                            <input type="checkbox" checked={(section.videoTestimonialIds || []).includes(t.id)} onChange={() => {
                                                const currentIds = section.videoTestimonialIds || [];
                                                const newIds = currentIds.includes(t.id) ? currentIds.filter(id => id !== t.id) : [...currentIds, t.id];
                                                updateSection(section.id, { videoTestimonialIds: newIds });
                                            }} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                                            <span className="text-sm text-gray-800">{t.name} - {t.place}</span>
                                        </label>
                                    ))}
                                    {videoTestimonials.length === 0 && <p className="text-xs text-gray-500 italic">No video testimonials found in the admin library.</p>}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t">
                            <h5 className="text-xs font-semibold text-gray-600 mb-1">Your Custom Testimonials (YouTube Links)</h5>
                            <div className="space-y-2">
                                {(section.customVideoTestimonials || []).map((testimonial, index) => (
                                    <div key={testimonial.id} className="p-3 bg-white border rounded-md space-y-2">
                                        <div className="flex justify-end">
                                            <button type="button" onClick={() => removeRepeatableItem(section.id, 'customVideoTestimonials', testimonial.id)} className="p-1 text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                        <input type="text" value={testimonial.name} onChange={e => handleRepeatableChange(section.id, 'customVideoTestimonials', index, 'name', e.target.value)} placeholder="Client Name" className="w-full p-1 border rounded text-xs" />
                                        <input type="text" value={testimonial.place} onChange={e => handleRepeatableChange(section.id, 'customVideoTestimonials', index, 'place', e.target.value)} placeholder="Client Place (e.g., City, Country)" className="w-full p-1 border rounded text-xs" />
                                        <input type="url" value={testimonial.url} onChange={e => handleRepeatableChange(section.id, 'customVideoTestimonials', index, 'url', e.target.value)} placeholder="YouTube Video URL" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => addRepeatableItem(section.id, 'customVideoTestimonials', { name: '', place: '', url: '' })} className="text-xs font-semibold text-blue-600">+ Add Custom Testimonial</button>
                        </div>
                    </div>
                );
            }

            if (section.type === 'social_connect') {
                return (
                    <div className="space-y-2 text-xs">
                        <input type="text" value={section.socialConnectContent?.title || ''} onChange={e => handleSingleFieldChange(section.id, 'socialConnectContent.title', e.target.value)} placeholder="Section Title (e.g., Join Our Community)" className="w-full p-2 border rounded" />
                        <input type="url" value={section.socialConnectContent?.whatsappGroupLink || ''} onChange={e => handleSingleFieldChange(section.id, 'socialConnectContent.whatsappGroupLink', e.target.value)} placeholder="WhatsApp Group URL" className="w-full p-2 border rounded" />
                        <input type="url" value={section.socialConnectContent?.facebookGroupLink || ''} onChange={e => handleSingleFieldChange(section.id, 'socialConnectContent.facebookGroupLink', e.target.value)} placeholder="Facebook Group URL" className="w-full p-2 border rounded" />
                    </div>
                );
            }

            if(!fields) return null;

            return (
                <div className="space-y-2">
                    {fields.map(field => {
                        const value = field.name.includes('.') ? (section as any)[field.name.split('.')[0]]?.[field.name.split('.')[1]] || '' : (section as any)[field.name] || '';
                        return <input key={field.name} type="text" value={value} onChange={e => handleSingleFieldChange(section.id, field.name, e.target.value)} placeholder={field.ph} className="w-full p-2 border rounded text-xs" />
                    })}
                </div>
            )
        }
        
        return (
            <div className="p-3 border-t bg-gray-50 space-y-3">
                {renderSingleFields()}
                {editorConfig && <div className="space-y-2 pt-2 border-t">
                     {items.map((item, index) => (
                        <div key={item.id} className="p-2 bg-white border rounded-md space-y-2">
                             <div className="flex justify-end"><button type="button" onClick={() => removeRepeatableItem(section.id, editorConfig.path, item.id)} className="p-1 text-red-500"><Trash2 size={14}/></button></div>
                            {editorConfig.fields.map(field => {
                                if (field.type === 'textarea') {
                                    return <textarea key={field.name} value={item[field.name] || ''} onChange={e => handleRepeatableChange(section.id, editorConfig.path, index, field.name, e.target.value)} placeholder={field.ph} className="w-full p-1 border rounded text-xs h-20" />
                                } else if (field.type === 'textarea-special' && field.name === 'points') {
                                     return <textarea key={field.name} value={Array.isArray(item[field.name]) ? item[field.name].join('\n') : ''} onChange={e => handleRepeatablePointsChange(section.id, editorConfig.path, index, e.target.value)} placeholder={field.ph} className="w-full p-1 border rounded text-xs h-20" />
                                }
                                return <input key={field.name} type="text" value={item[field.name] || ''} onChange={e => handleRepeatableChange(section.id, editorConfig.path, index, field.name, e.target.value)} placeholder={field.ph} className="w-full p-1 border rounded text-xs" />
                            })}
                        </div>
                    ))}
                    <button type="button" onClick={() => addRepeatableItem(section.id, editorConfig.path, editorConfig.newItem)} className="text-xs font-semibold text-blue-600">+ Add Item</button>
                </div>}
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center"><h3 className="text-2xl font-bold text-gray-800">Edit Consultant Page</h3><button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button></div>
                    <p className="text-gray-500 mt-1">For <span className="font-semibold">{consultant.name}</span></p>
                </header>
                <main className="flex-grow p-6 grid md:grid-cols-2 gap-6 overflow-y-auto">
                    {isLoading ? <div className="md:col-span-2 flex justify-center items-center"><Loader className="animate-spin" /></div> : (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="font-semibold text-gray-700 text-sm mb-1 block">Brand Name</label>
                                    <input type="text" value={pageDef.brandName || ''} onChange={e => setPageDef(p => ({...p, brandName: e.target.value}))} placeholder="Brand name for header/footer" className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700 text-sm mb-1 block">WhatsApp Group Link</label>
                                    <input type="url" value={pageDef.whatsappGroupLink || ''} onChange={e => setPageDef(p => ({...p, whatsappGroupLink: e.target.value}))} placeholder="https://chat.whatsapp.com/..." className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700 text-sm mb-1 block">Facebook Group Link</label>
                                    <input type="url" value={pageDef.facebookGroupLink || ''} onChange={e => setPageDef(p => ({...p, facebookGroupLink: e.target.value}))} placeholder="https://www.facebook.com/groups/..." className="w-full p-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700 text-sm mb-1 block">Footer Disclaimer</label>
                                    <textarea value={pageDef.footerDisclaimer || ''} onChange={e => setPageDef(p => ({...p, footerDisclaimer: e.target.value}))} className="w-full p-2 border rounded-md h-20 text-sm" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Page Sections</h4>
                                <div className="p-3 bg-gray-50 rounded-lg border min-h-[200px] space-y-2">
                                    {(pageDef.sections || []).map((section, index) => (
                                        <div key={section.id} className="bg-white border rounded-md shadow-sm">
                                            <div className="flex items-center gap-2 p-2">
                                                <span className="flex-grow font-medium text-sm">{allPossibleSections.find(s => s.type === section.type)?.label || 'Unknown Section'}</span>
                                                <div className="flex items-center">
                                                    <button type="button" onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUp size={16} /></button>
                                                    <button type="button" onClick={() => moveSection(index, 'down')} disabled={index === (pageDef.sections || []).length - 1} className="p-1 disabled:opacity-30"><ArrowDown size={16} /></button>
                                                    <button type="button" onClick={() => removeSection(section.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            {renderSectionEditor(section)}
                                        </div>
                                    ))}
                                    <div className="mt-3 relative">
                                        <select onChange={e => addSection(e.target.value as ConsultantPageSectionType)} value="" className="w-full p-2 border rounded-md bg-white appearance-none text-sm font-semibold text-center text-blue-600 hover:bg-blue-50 cursor-pointer">
                                            <option value="" disabled>-- Add a new section --</option>
                                            {allPossibleSections.map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                       {isSaving ? <Loader className="animate-spin mr-2" /> : <Save className="mr-2" />}
                       {isSaving ? 'Saving...' : 'Save Page'}
                    </button>
                </footer>
            </form>
        </div>
    );
};
export default ConsultantPageEditorModal;