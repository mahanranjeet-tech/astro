import React, { useState, useEffect, useMemo } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { X, Save, Loader, ArrowUp, ArrowDown, Trash2, Settings, Plus, ChevronDown, Megaphone } from 'lucide-react';
import type { 
    AppDefinition,
    LandingPageDefinition, 
    NotificationType, 
    OfferPageSection,
    OfferPageSectionType,
    OfferPageOfferFeature,
    OfferPageOfferAddon,
    OfferPageCtaOption
} from '../../types.ts';

interface OfferPageEditorModalProps {
    app: AppDefinition;
    pageDef: LandingPageDefinition;
    onClose: () => void;
    onSave: (updatedPageDef: LandingPageDefinition) => Promise<void>;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const allPossibleSections: { type: OfferPageSectionType; label: string }[] = [
    { type: 'intro', label: 'Intro Header' },
    { type: 'challenge', label: 'Challenge vs. Solution' },
    { type: 'offer_card', label: 'Offer Card' },
    { type: 'final_cta', label: 'Final Call to Action' },
];

// FIX: Added a map to correctly resolve the content property name for each section type.
const contentKeyMap: Record<OfferPageSectionType, keyof OfferPageSection | null> = {
    'intro': 'introContent',
    'challenge': 'challengeContent',
    'offer_card': 'offerContent',
    'final_cta': 'finalCtaContent',
};

const SectionEditor: React.FC<{
    section: OfferPageSection,
    updateSection: (id: string, updates: Partial<OfferPageSection>) => void,
    app: AppDefinition,
}> = ({ section, updateSection, app }) => {

    const contentKey = contentKeyMap[section.type];

    // Effect for data migration of final_cta section
    useEffect(() => {
        if (section.type === 'final_cta' && section.finalCtaContent && !section.finalCtaContent.options && section.finalCtaContent.option1Title) {
            const cta = section.finalCtaContent;
            const newOptions: OfferPageCtaOption[] = [];
            if (cta.option1Title) {
                newOptions.push({
                    id: uuidv4(), type: 'instant', title: cta.option1Title,
                    steps: cta.option1Steps || [], buttonText: cta.option1ButtonText, isPrimary: true,
                });
            }
            if (cta.option2Title) {
                newOptions.push({
                    id: uuidv4(), type: 'qr', title: cta.option2Title,
                    note: cta.option2Note, isPrimary: false,
                    payeeName: 'Acharya Preeti Sharma',
                    qrImageUrl: 'https://i.ibb.co/G9jP42y/google-pay-qr-code.png',
                    qrText: cta.option2QrText || 'UPI ID: preeti3084@okicici',
                });
            }
            const { option1Title, option1Steps, option1ButtonText, option2Title, option2QrText, option2Note, ...rest } = cta;
            updateSection(section.id, { finalCtaContent: { ...rest, options: newOptions } });
        }
    }, [section.type, section.finalCtaContent, section.id, updateSection]);

    if (!contentKey) return null;
    const content = (section as any)[contentKey];

    const handleContentChange = (field: string, value: any) => {
        const currentContent = (section as any)[contentKey] || {};
        updateSection(section.id, { [contentKey]: { ...currentContent, [field]: value } });
    };

    const handleNestedChange = (field: string, index: number, subField: string, value: any) => {
        const currentContent = (section as any)[contentKey] || {};
        const newArray = [...(currentContent[field] || [])];
        newArray[index] = { ...newArray[index], [subField]: value };
        updateSection(section.id, { [contentKey]: { ...currentContent, [field]: newArray } });
    };
    
    const handleDeepNestedChange = (field: string, index: number, subField: string, subIndex: number, subSubField: string, value: any) => {
        const currentContent = (section as any)[contentKey] || {};
        const newArray = JSON.parse(JSON.stringify(currentContent[field] || []));
        if(newArray[index] && newArray[index][subField] && newArray[index][subField][subIndex]) {
            newArray[index][subField][subIndex][subSubField] = value;
            updateSection(section.id, { [contentKey]: { ...currentContent, [field]: newArray } });
        }
    };


    const addNestedItem = (field: string, newItem: any) => {
        const currentContent = (section as any)[contentKey] || {};
        const newArray = [...(currentContent[field] || []), { ...newItem, id: uuidv4() }];
        updateSection(section.id, { [contentKey]: { ...currentContent, [field]: newArray } });
    };
    
     const addDeepNestedItem = (field: string, index: number, subField: string, newItem: any) => {
        const currentContent = (section as any)[contentKey] || {};
        const newArray = JSON.parse(JSON.stringify(currentContent[field] || []));
        if(newArray[index]) {
            if(!newArray[index][subField]) {
                newArray[index][subField] = [];
            }
            newArray[index][subField].push({ ...newItem, id: uuidv4() });
            updateSection(section.id, { [contentKey]: { ...currentContent, [field]: newArray } });
        }
    };

    const removeNestedItem = (field: string, id: string) => {
        const currentContent = (section as any)[contentKey] || {};
        const newArray = (currentContent[field] || []).filter((item: any) => item.id !== id);
        updateSection(section.id, { [contentKey]: { ...currentContent, [field]: newArray } });
    };

    const removeDeepNestedItem = (field: string, index: number, subField: string, subId: string) => {
        const currentContent = (section as any)[contentKey] || {};
        const newArray = JSON.parse(JSON.stringify(currentContent[field] || []));
        if(newArray[index] && newArray[index][subField]) {
            newArray[index][subField] = newArray[index][subField].filter((item: any) => item.id !== subId);
            updateSection(section.id, { [contentKey]: { ...currentContent, [field]: newArray } });
        }
    };


    switch(section.type) {
        case 'intro':
            return (
                <div className="space-y-2 text-xs">
                    <input type="text" value={content?.mainHeadline || ''} onChange={e => handleContentChange('mainHeadline', e.target.value)} placeholder="Main Headline" className="w-full p-2 border rounded" />
                    <input type="text" value={content?.subHeadline || ''} onChange={e => handleContentChange('subHeadline', e.target.value)} placeholder="Subheadline" className="w-full p-2 border rounded" />
                    <input type="text" value={content?.scrollButtonText || ''} onChange={e => handleContentChange('scrollButtonText', e.target.value)} placeholder="Scroll Button Text" className="w-full p-2 border rounded" />
                </div>
            );
        case 'challenge':
            return (
                 <div className="space-y-2 text-xs">
                    <input type="text" value={content?.title || ''} onChange={e => handleContentChange('title', e.target.value)} placeholder="Section Title" className="w-full p-2 border rounded" />
                    <textarea value={content?.description || ''} onChange={e => handleContentChange('description', e.target.value)} placeholder="Description" className="w-full p-2 border rounded h-20" />
                    <h5 className="font-semibold text-gray-600 pt-2 border-t">Callouts</h5>
                    {content?.callouts.map((item: any, i: number) => (
                        <div key={item.id} className="p-2 border rounded bg-white space-y-1">
                            <input value={item.icon} onChange={e => handleNestedChange('callouts', i, 'icon', e.target.value)} placeholder="Icon (e.g., ⏱️)" className="w-full p-1 border" />
                            <input value={item.title} onChange={e => handleNestedChange('callouts', i, 'title', e.target.value)} placeholder="Title" className="w-full p-1 border" />
                            <input value={item.description} onChange={e => handleNestedChange('callouts', i, 'description', e.target.value)} placeholder="Description (HTML allowed)" className="w-full p-1 border" />
                            <button type="button" onClick={() => removeNestedItem('callouts', item.id)} className="text-red-500 text-xs">Remove</button>
                        </div>
                    ))}
                    <button type="button" onClick={() => addNestedItem('callouts', { icon: '', title: '', description: '' })} className="text-blue-600 text-xs">+ Add Callout</button>
                 </div>
            );
         case 'offer_card':
            const offer = content;
            if (!offer) return null;
            const specialTiers = app.pricingTiers?.filter(t => t.isWebinarAddon) || [];
            return (
                <div className="space-y-3 text-xs">
                    <input type="text" value={offer.title} onChange={e => handleContentChange('title', e.target.value)} placeholder="Offer Title" className="w-full p-2 border rounded" />
                    <textarea value={offer.description} onChange={e => handleContentChange('description', e.target.value)} placeholder="Offer Description" className="w-full p-2 border rounded h-20" />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={offer.creditsText || ''} onChange={e => handleContentChange('creditsText', e.target.value)} placeholder="Credits Text (e.g., 5 Credits)" className="w-full p-2 border rounded" />
                        <input type="number" value={offer.price ? offer.price / 100 : ''} onChange={e => handleContentChange('price', parseFloat(e.target.value) * 100)} placeholder="Price (in Rupees)" className="w-full p-2 border rounded" />
                        <input type="number" value={offer.originalPrice ? offer.originalPrice / 100 : ''} onChange={e => handleContentChange('originalPrice', parseFloat(e.target.value) * 100)} placeholder="Original Price (Optional)" className="w-full p-2 border rounded" />
                        <input type="text" value={offer.priceSubtitle || ''} onChange={e => handleContentChange('priceSubtitle', e.target.value)} placeholder="Price Subtitle" className="w-full p-2 border rounded" />
                    </div>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!!offer.isBestValue} onChange={e => handleContentChange('isBestValue', e.target.checked)} /> Mark as Best Value</label>
                    <input type="text" value={offer.buttonText} onChange={e => handleContentChange('buttonText', e.target.value)} placeholder="Button Text" className="w-full p-2 border rounded" />
                    
                    <div>
                        <label className="font-semibold text-gray-600">Main App Tier</label>
                        <select value={offer.mainAppTierId} onChange={e => handleContentChange('mainAppTierId', e.target.value)} required className="w-full p-2 border rounded font-mono bg-white">
                            <option value="">-- Select Special Offer Tier --</option>
                            {specialTiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name} (₹{tier.price/100})</option>)}
                        </select>
                    </div>

                    
                    <div className="pt-2 border-t">
                        <h5 className="font-semibold text-gray-600">Features</h5>
                        {(offer.features || []).map((f: OfferPageOfferFeature, i: number) => (
                             <div key={f.id} className="flex gap-2 items-center p-1 bg-white border rounded">
                                <input value={f.text} onChange={e => handleNestedChange('features', i, 'text', e.target.value)} placeholder="Feature Text (HTML allowed)" className="w-full p-1 border"/>
                                <input value={f.valueText || ''} onChange={e => handleNestedChange('features', i, 'valueText', e.target.value)} placeholder="Value Tag (optional)" className="w-1/2 p-1 border"/>
                                <button type="button" onClick={() => removeNestedItem('features', f.id)}><Trash2 size={14} className="text-red-500"/></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addNestedItem('features', {text: '', valueText: ''})}>+ Add Feature</button>
                    </div>
                     <div className="pt-2 border-t">
                        <h5 className="font-semibold text-gray-600">Add-ons</h5>
                        {(offer.addons || []).map((a: OfferPageOfferAddon, i: number) => (
                             <div key={a.id} className="p-2 bg-white border rounded space-y-1">
                                <input value={a.title} onChange={e => handleNestedChange('addons', i, 'title', e.target.value)} placeholder="Add-on Title" className="w-full p-1 border"/>
                                <input type="number" value={a.originalPrice/100} onChange={e => handleNestedChange('addons', i, 'originalPrice', parseFloat(e.target.value)*100)} placeholder="Original Price" className="w-full p-1 border"/>
                                <input type="number" value={a.offerPrice/100} onChange={e => handleNestedChange('addons', i, 'offerPrice', parseFloat(e.target.value)*100)} placeholder="Offer Price" className="w-full p-1 border"/>
                                <button type="button" onClick={() => removeNestedItem('addons', a.id)}><Trash2 size={14} className="text-red-500"/></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addNestedItem('addons', {key: 'course', title: '', originalPrice: 0, offerPrice: 0})}>+ Add Add-on</button>
                    </div>
                </div>
            );
        case 'final_cta':
            const cta = section.finalCtaContent;
            if (!cta) return null;
            const options = cta.options || [];

            return (
                 <div className="space-y-2 text-xs">
                    <input value={cta.urgencyHeadline} onChange={e=>handleContentChange('urgencyHeadline', e.target.value)} placeholder="Urgency Headline" className="w-full p-2 border"/>
                    <textarea value={cta.urgencySubheadline} onChange={e=>handleContentChange('urgencySubheadline', e.target.value)} placeholder="Urgency Subheadline" className="w-full p-2 border h-16"/>
                    <input value={cta.ctaTitle} onChange={e=>handleContentChange('ctaTitle', e.target.value)} placeholder="CTA Title" className="w-full p-2 border"/>
                    
                    <div className="pt-2 border-t">
                        <h5 className="font-semibold text-gray-600 mb-2">CTA Options</h5>
                        {options.map((opt, i) => (
                            <div key={opt.id} className="p-3 border rounded bg-white space-y-2 mb-2">
                                <div className="flex justify-between items-center">
                                    <h6 className="font-bold">Option #{i + 1}</h6>
                                    <button type="button" onClick={() => removeNestedItem('options', opt.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={14}/></button>
                                </div>
                                <input value={opt.title} onChange={e => handleNestedChange('options', i, 'title', e.target.value)} placeholder="Option Title" className="w-full p-1 border" />
                                <label className="flex items-center gap-2"><input type="checkbox" checked={!!opt.isPrimary} onChange={e => handleNestedChange('options', i, 'isPrimary', e.target.checked)} /> Mark as Primary</label>
                                <select value={opt.type} onChange={e => handleNestedChange('options', i, 'type', e.target.value)} className="w-full p-1 border bg-white">
                                    <option value="instant">Instant Access</option>
                                    <option value="qr">QR Code</option>
                                </select>
                                {opt.type === 'instant' && (
                                    <div className="pl-2 border-l-2 mt-2 space-y-1">
                                        <h6 className="font-semibold">Steps</h6>
                                        {(opt.steps || []).map((step, stepIndex) => (
                                            <div key={step.id} className="flex items-center gap-1">
                                                <input value={step.text} onChange={e => handleDeepNestedChange('options', i, 'steps', stepIndex, 'text', e.target.value)} className="w-full p-1 border" placeholder="Step text (HTML allowed)" />
                                                <button type="button" onClick={() => removeDeepNestedItem('options', i, 'steps', step.id)}><Trash2 size={12}/></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => addDeepNestedItem('options', i, 'steps', {text:''})}>+ Add Step</button>
                                        <input value={opt.buttonText || ''} onChange={e => handleNestedChange('options', i, 'buttonText', e.target.value)} placeholder="Button Text" className="w-full p-1 border mt-2"/>
                                    </div>
                                )}
                                {opt.type === 'qr' && (
                                    <div className="pl-2 border-l-2 mt-2 space-y-1">
                                        <input value={opt.payeeName || ''} onChange={e => handleNestedChange('options', i, 'payeeName', e.target.value)} placeholder="Payee Name" className="w-full p-1 border" />
                                        <input value={opt.qrImageUrl || ''} onChange={e => handleNestedChange('options', i, 'qrImageUrl', e.target.value)} placeholder="QR Code Image URL" className="w-full p-1 border" />
                                        <input value={opt.qrText || ''} onChange={e => handleNestedChange('options', i, 'qrText', e.target.value)} placeholder="Text below QR (e.g., UPI ID)" className="w-full p-1 border" />
                                        <textarea value={opt.note || ''} onChange={e => handleNestedChange('options', i, 'note', e.target.value)} placeholder="Note (HTML allowed)" className="w-full p-1 border h-16"/>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => addNestedItem('options', { type: 'instant', title: 'New Option', isPrimary: false, steps: [], buttonText: '', payeeName: 'Payee Name', qrImageUrl: '', qrText: 'UPI ID: example@upi' })}>+ Add Option</button>
                    </div>

                    <h5 className="font-semibold text-gray-600 pt-2 border-t">Footer</h5>
                    <input value={cta.footerText} onChange={e=>handleContentChange('footerText', e.target.value)} placeholder="Footer Text" className="w-full p-2 border"/>
                    <input value={cta.footerContact} onChange={e=>handleContentChange('footerContact', e.target.value)} placeholder="Footer Contact Info" className="w-full p-2 border"/>
                </div>
            );
        default: return null;
    }
};

const OfferPageEditorModal: React.FC<OfferPageEditorModalProps> = ({ app, pageDef, onClose, onSave, showNotification }) => {
    const [localPageDef, setLocalPageDef] = useState(pageDef);
    const [isSaving, setIsSaving] = useState(false);
    const [configuringSectionId, setConfiguringSectionId] = useState<string | null>(null);

    const setSections = (updater: (prev: OfferPageSection[]) => OfferPageSection[]) => {
        setLocalPageDef(prev => ({
            ...prev,
            offerPage: {
                ...(prev.offerPage!),
                sections: updater(prev.offerPage?.sections || [])
            }
        }));
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

    const addSection = (type: OfferPageSectionType) => {
        const newSection: OfferPageSection = { id: uuidv4(), type, order: (localPageDef.offerPage?.sections || []).length, enabled: true };
        
        const contentKey = contentKeyMap[type];
        if (!contentKey) return;
        
        const defaultContent: Record<string, any> = {
            'intro': { mainHeadline: 'New Intro', subHeadline: '' },
            'challenge': { title: 'New Challenge Section', description: '', callouts: [] },
            'offer_card': { id: `offer_${uuidv4().substring(0,4)}`, title: 'New Offer', description: '', price: 0, features: [], buttonText: 'Buy Now', mainAppTierId: '' },
            'final_cta': { urgencyHeadline: 'Act Fast!', options: [], ctaTitle: 'Choose Your Option' }
        };
        (newSection as any)[contentKey] = defaultContent[type];
        
        setSections(prev => [...prev, newSection]);
    };

    const removeSection = (id: string) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };

    const updateSection = (id: string, updates: Partial<OfferPageSection>) => {
        setSections(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    };
    
    const handleMetaChange = (field: 'metaTitle' | 'metaDescription', value: string) => {
        setLocalPageDef(prev => ({
            ...prev,
            offerPage: {
                ...(prev.offerPage!),
                [field]: value,
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(localPageDef);
        } catch (e) {
            // The parent component handles the error notification.
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center"><h3 className="text-2xl font-bold">Edit Offer Page</h3><button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button></div>
                </header>
                <main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2"><Megaphone size={16}/> SEO / Sharing Settings</h4>
                            <input type="text" value={localPageDef.offerPage?.metaTitle || ''} onChange={e => handleMetaChange('metaTitle', e.target.value)} placeholder="Meta Title for Sharing" className="w-full p-2 border rounded-md" />
                            <textarea value={localPageDef.offerPage?.metaDescription || ''} onChange={e => handleMetaChange('metaDescription', e.target.value)} placeholder="Meta Description" className="w-full p-2 border rounded-md h-20" />
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium mb-1 block">Page Sections</label>
                        <div className="p-3 bg-gray-50 rounded-lg border min-h-[300px]">
                            <div className="space-y-2">
                                {(localPageDef.offerPage?.sections || []).map((section, index) => (
                                    <div key={section.id} className="bg-white border rounded-md shadow-sm">
                                        <div className="flex items-center gap-2 p-2">
                                            <span className="flex-grow font-medium text-gray-700 text-sm">{allPossibleSections.find(s => s.type === section.type)?.label}</span>
                                            <div className="flex items-center">
                                                <button type="button" onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUp size={16} /></button>
                                                <button type="button" onClick={() => moveSection(index, 'down')} disabled={index === (localPageDef.offerPage?.sections || []).length - 1} className="p-1 disabled:opacity-30"><ArrowDown size={16} /></button>
                                                <button type="button" onClick={() => setConfiguringSectionId(configuringSectionId === section.id ? null : section.id)} className={`p-1 rounded-full ${configuringSectionId === section.id ? 'bg-blue-100 text-blue-600' : ''}`}><Settings size={16} /></button>
                                                <button type="button" onClick={() => removeSection(section.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        {configuringSectionId === section.id && (
                                            <div className="p-3 border-t bg-gray-50">
                                                <h5 className="font-semibold text-xs text-gray-600 mb-2">Configure '{allPossibleSections.find(s => s.type === section.type)?.label}'</h5>
                                                <SectionEditor section={section} updateSection={updateSection} app={app} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                             <div className="mt-3 relative">
                                <select onChange={e => addSection(e.target.value as OfferPageSectionType)} value="" className="w-full p-2 border rounded-md bg-white appearance-none text-sm font-semibold text-center text-blue-600 hover:bg-blue-50 cursor-pointer">
                                    <option value="" disabled>-- Add a new section --</option>
                                    {allPossibleSections.map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                            </div>
                        </div>
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                       {isSaving ? <Loader className="animate-spin mr-2" /> : <Save className="mr-2" />}
                       {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default OfferPageEditorModal;