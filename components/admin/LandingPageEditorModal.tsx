import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { v4 as uuidv4 } from 'uuid';
import { X, Save, Loader, ArrowUp, ArrowDown, Trash2, Settings, Plus, ChevronDown, Megaphone } from 'lucide-react';
import type { 
    AppDefinition, 
    LandingPageDefinition, 
    NotificationType, 
    LandingPageSection, 
    LandingPageSectionType,
    WebinarProduct,
    VideoTestimonial
} from '../../types.ts';
import { defaultPageData } from '../../utils/defaultLandingPageData.ts';
import { defaultOfferPageData } from '../../utils/defaultOfferPageData.ts';
import OfferPageEditorModal from './OfferPageEditorModal.tsx';


interface LandingPageEditorModalProps {
    app: AppDefinition;
    page: LandingPageDefinition | null;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const slugify = (text: string): string => {
    return text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const allPossibleSections: { type: LandingPageSectionType; label: string }[] = [
    { type: 'hero', label: 'Hero Section' },
    { type: 'featured_in', label: 'Featured In' },
    { type: 'benefits', label: 'Benefits ("Why Attend")' },
    { type: 'vastu_assistant_hero', label: 'Vastu Assistant (Hero)' },
    { type: 'vastu_assistant_features', label: 'Vastu Assistant (Features)' },
    { type: 'text_block', label: 'Text Block ("Energy of Home")' },
    { type: 'problems', label: 'Problems ("Vastu Dosh")' },
    { type: 'delineation', label: 'Delineation ("Vastu vs Hybrid")' },
    { type: 'what_you_learn', label: 'What You Learn (Deliverables)' },
    { type: 'audience', label: 'Audience ("Who Must Attend")' },
    { type: 'about_coach', label: 'About The Coach' },
    { type: 'faq', label: 'FAQ Section' },
    { type: 'reviews', label: 'Reviews (Testimonials)' },
    { type: 'videoTestimonials', label: 'Video Testimonials' },
    { type: 'webinar', label: 'Webinar (Simple)' },
    { type: 'whatItDoes', label: 'App: What It Does' },
    { type: 'video', label: 'App: Marketing Video' },
    { type: 'training', label: 'App: Training Videos' },
    { type: 'pricing', label: 'App: Pricing Tiers' },
    { type: 'social_connect', label: 'Social Media Connect' },
];

const SectionConfig: React.FC<{
    section: LandingPageSection;
    updateSection: (id: string, updates: Partial<LandingPageSection>) => void;
    app: AppDefinition;
    availableWebinars: WebinarProduct[];
    availableTestimonials: VideoTestimonial[];
}> = ({ section, updateSection, app, availableWebinars, availableTestimonials }) => {

    const handleSingleFieldChange = (key: string, value: string) => {
        if (key.includes('.')) {
            const [mainKey, subKey] = key.split('.');
            const currentMain = (section as any)[mainKey] || {};
            updateSection(section.id, { [mainKey]: { ...currentMain, [subKey]: value } });
        } else {
            updateSection(section.id, { [key]: value as any });
        }
    };
    
     const handleCheckboxChange = (field: 'trainingVideoUrlsOverride' | 'pricingTierIdsOverride' | 'videoTestimonialIds', value: string) => {
        const currentValues = (section as any)[field] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter((v: string) => v !== value)
            : [...currentValues, value];
        updateSection(section.id, { [field]: newValues });
    };

    const handleRepeatableChange = (path: string, index: number, field: string, value: string | string[]) => {
        const keys = path.split('.');
        const newSection = JSON.parse(JSON.stringify(section));
        let target = newSection;
        for (const key of keys) {
            if (!target) return; // Path is invalid
            target = target[key];
        }
        if (Array.isArray(target) && target[index]) {
            target[index][field] = value;
            updateSection(section.id, newSection);
        }
    };

    const addRepeatableItem = (path: string, newItem: any) => {
        const keys = path.split('.');
        const newSection = JSON.parse(JSON.stringify(section));
        let parent = newSection;
        for (let i = 0; i < keys.length - 1; i++) {
            parent = parent[keys[i]];
        }
        const arrayKey = keys[keys.length - 1];
        if (!Array.isArray(parent[arrayKey])) {
            parent[arrayKey] = [];
        }
        parent[arrayKey].push({ ...newItem, id: uuidv4() });
        updateSection(section.id, newSection);
    };

    const removeRepeatableItem = (path: string, itemId: string) => {
        const keys = path.split('.');
        const newSection = JSON.parse(JSON.stringify(section));
        let parent = newSection;
        for (let i = 0; i < keys.length - 1; i++) {
            parent = parent[keys[i]];
        }
        const arrayKey = keys[keys.length - 1];
        if (Array.isArray(parent[arrayKey])) {
            parent[arrayKey] = parent[arrayKey].filter((item: any) => item.id !== itemId);
        }
        updateSection(section.id, newSection);
    };


    switch (section.type) {
        case 'hero': 
            return (
                <div className="space-y-2 text-xs">
                    {['topBannerText', 'mainHeadline', 'subHeadline', 'coachProfilePictureUrl', 'coachName', 'coachExperience', 'coachQualifications'].map(f => (
                        <input 
                            key={f} 
                            type="text" 
                            value={(section.heroContent as any)?.[f] || ''} 
                            onChange={e => handleSingleFieldChange(`heroContent.${f}`, e.target.value)} 
                            placeholder={f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} 
                            className="w-full p-2 border rounded"
                        />
                    ))}
                    <h5 className="font-semibold text-gray-600 pt-2 border-t">Registration Box</h5>
                     <input 
                        type="text" 
                        value={(section.heroContent as any)?.registrationCtaTitle || ''} 
                        onChange={e => handleSingleFieldChange('heroContent.registrationCtaTitle', e.target.value)} 
                        placeholder="Registration CTA Title (e.g. Secure Your Spot!)" 
                        className="w-full p-2 border rounded"
                    />
                    <input 
                        type="text" 
                        value={(section.heroContent as any)?.registrationCtaSubtext || ''} 
                        onChange={e => handleSingleFieldChange('heroContent.registrationCtaSubtext', e.target.value)} 
                        placeholder="Registration Subtext (e.g. Hurry up...)" 
                        className="w-full p-2 border rounded"
                    />
                    <input 
                        type="text" 
                        value={(section.heroContent as any)?.priceText || ''} 
                        onChange={e => handleSingleFieldChange('heroContent.priceText', e.target.value)} 
                        placeholder="Price Text (e.g. FREE)" 
                        className="w-full p-2 border rounded"
                    />
                    <h5 className="font-semibold text-gray-600 pt-2 border-t">Webinar Description / Freebies</h5>
                    <input 
                        type="text" 
                        value={(section.heroContent as any)?.webinarDescriptionTitle || ''} 
                        onChange={e => handleSingleFieldChange('heroContent.webinarDescriptionTitle', e.target.value)} 
                        placeholder="Description Title (e.g. Freebies for Attendees)" 
                        className="w-full p-2 border rounded"
                    />
                    <textarea 
                        value={(section.heroContent as any)?.webinarDescription || ''} 
                        onChange={e => handleSingleFieldChange(`heroContent.webinarDescription`, e.target.value)} 
                        placeholder="Description Content (use new lines for list)" 
                        className="w-full p-2 border rounded h-24 text-xs" 
                    />
                    <h5 className="font-semibold text-gray-600 pt-2 border-t">Webinar Product</h5>
                    <select value={section.heroContent?.webinarId || ''} onChange={e => handleSingleFieldChange('heroContent.webinarId', e.target.value)} className="w-full p-2 border rounded bg-white">
                        <option value="">-- Select Webinar --</option>
                        {availableWebinars.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
            );
        case 'featured_in': return <div className="space-y-2">{section.featuredInLogos?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><input value={item.imageUrl} onChange={e => handleRepeatableChange('featuredInLogos', i, 'imageUrl', e.target.value)} placeholder="Logo URL" className="w-full p-1 border rounded text-xs"/><input value={item.altText} onChange={e => handleRepeatableChange('featuredInLogos', i, 'altText', e.target.value)} placeholder="Alt Text" className="w-full p-1 border rounded text-xs"/><button type="button" onClick={() => removeRepeatableItem('featuredInLogos', item.id)} className="text-red-500 text-xs">Remove</button></div>))}<button type="button" onClick={() => addRepeatableItem('featuredInLogos', {imageUrl: '', altText: ''})} className="text-blue-600 text-xs">+ Add Logo</button></div>;
        case 'benefits': return <div className="space-y-2"><input value={section.benefitsTitle || ''} onChange={e => handleSingleFieldChange('benefitsTitle', e.target.value)} placeholder="Section Title" className="w-full p-2 border rounded text-xs"/>{section.benefitsItems?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><input value={item.icon} onChange={e => handleRepeatableChange('benefitsItems', i, 'icon', e.target.value)} placeholder="Icon Name" className="w-full p-1 border rounded text-xs"/><input value={item.title} onChange={e => handleRepeatableChange('benefitsItems', i, 'title', e.target.value)} placeholder="Title" className="w-full p-1 border rounded text-xs"/><textarea value={item.description} onChange={e => handleRepeatableChange('benefitsItems', i, 'description', e.target.value)} placeholder="Description" className="w-full p-1 border rounded text-xs h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('benefitsItems', {icon: '', title: '', description: ''})} className="text-blue-600 text-xs">+ Add Benefit</button></div>;
        case 'vastu_assistant_hero': return <div className="space-y-2 text-xs"><input value={section.vastuAssistantHeroContent?.title || ''} onChange={e => handleSingleFieldChange('vastuAssistantHeroContent.title', e.target.value)} placeholder="Title" className="w-full p-2 border rounded"/><textarea value={section.vastuAssistantHeroContent?.description || ''} onChange={e => handleSingleFieldChange('vastuAssistantHeroContent.description', e.target.value)} placeholder="Description" className="w-full p-2 border rounded h-24"/><input value={section.vastuAssistantHeroContent?.ctaText || ''} onChange={e => handleSingleFieldChange('vastuAssistantHeroContent.ctaText', e.target.value)} placeholder="CTA Button Text" className="w-full p-2 border rounded"/></div>;
        case 'vastu_assistant_features': return <div className="space-y-2 text-xs"><input value={section.vastuAssistantFeaturesContent?.keyBenefitsTitle || ''} onChange={e => handleSingleFieldChange('vastuAssistantFeaturesContent.keyBenefitsTitle', e.target.value)} placeholder="Key Benefits Title" className="w-full p-2 border rounded"/>{section.vastuAssistantFeaturesContent?.keyBenefits.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><input value={item.icon} onChange={e => handleRepeatableChange('vastuAssistantFeaturesContent.keyBenefits', i, 'icon', e.target.value)} placeholder="Icon" className="w-full p-1 border"/><input value={item.title} onChange={e => handleRepeatableChange('vastuAssistantFeaturesContent.keyBenefits', i, 'title', e.target.value)} placeholder="Title" className="w-full p-1 border"/><textarea value={item.description} onChange={e => handleRepeatableChange('vastuAssistantFeaturesContent.keyBenefits', i, 'description', e.target.value)} placeholder="Description" className="w-full p-1 border h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('vastuAssistantFeaturesContent.keyBenefits', {icon: '', title: '', description: ''})}>+ Add Benefit</button><input value={section.vastuAssistantFeaturesContent?.modulesTitle || ''} onChange={e => handleSingleFieldChange('vastuAssistantFeaturesContent.modulesTitle', e.target.value)} placeholder="Modules Title" className="w-full p-2 border rounded mt-2"/>{section.vastuAssistantFeaturesContent?.modules.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><input value={item.icon} onChange={e => handleRepeatableChange('vastuAssistantFeaturesContent.modules', i, 'icon', e.target.value)} placeholder="Icon" className="w-full p-1 border"/><input value={item.title} onChange={e => handleRepeatableChange('vastuAssistantFeaturesContent.modules', i, 'title', e.target.value)} placeholder="Title" className="w-full p-1 border"/><textarea value={item.description} onChange={e => handleRepeatableChange('vastuAssistantFeaturesContent.modules', i, 'description', e.target.value)} placeholder="Description" className="w-full p-1 border h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('vastuAssistantFeaturesContent.modules', {icon: '', title: '', description: ''})}>+ Add Module</button><input value={section.vastuAssistantFeaturesContent?.ctaText || ''} onChange={e => handleSingleFieldChange('vastuAssistantFeaturesContent.ctaText', e.target.value)} placeholder="CTA Text" className="w-full p-2 border rounded mt-2"/></div>;
        case 'text_block': return <div className="space-y-2 text-xs"><input value={section.textBlockContent?.title || ''} onChange={e => handleSingleFieldChange('textBlockContent.title', e.target.value)} placeholder="Title" className="w-full p-2 border rounded"/><textarea value={section.textBlockContent?.content || ''} onChange={e => handleSingleFieldChange('textBlockContent.content', e.target.value)} placeholder="Content" className="w-full p-2 border rounded h-24"/><input value={section.textBlockContent?.ctaButtonText || ''} onChange={e => handleSingleFieldChange('textBlockContent.ctaButtonText', e.target.value)} placeholder="CTA Button Text" className="w-full p-2 border rounded"/></div>;
        case 'problems': return <div className="space-y-2"><input value={section.problemsTitle || ''} onChange={e => handleSingleFieldChange('problemsTitle', e.target.value)} placeholder="Section Title" className="w-full p-2 border rounded text-xs"/>{section.problemsItems?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><input value={item.icon} onChange={e => handleRepeatableChange('problemsItems', i, 'icon', e.target.value)} placeholder="Icon Name" className="w-full p-1 border rounded text-xs"/><input value={item.title} onChange={e => handleRepeatableChange('problemsItems', i, 'title', e.target.value)} placeholder="Title" className="w-full p-1 border rounded text-xs"/><textarea value={(item.points || []).join('\n')} onChange={e => handleRepeatableChange('problemsItems', i, 'points', e.target.value.split('\n'))} placeholder="Points (one per line)" className="w-full p-1 border rounded text-xs h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('problemsItems', {icon: '', title: '', points: []})} className="text-blue-600 text-xs">+ Add Problem</button></div>;
        case 'delineation': return <div className="space-y-2 text-xs"><input value={section.delineationContent?.mainHeadline || ''} onChange={e => handleSingleFieldChange('delineationContent.mainHeadline', e.target.value)} placeholder="Main Headline (HTML allowed)" className="w-full p-2 border rounded"/><input value={section.delineationContent?.subHeadline || ''} onChange={e => handleSingleFieldChange('delineationContent.subHeadline', e.target.value)} placeholder="Sub Headline" className="w-full p-2 border rounded"/><div className="pt-2 border-t"><h6 className="font-semibold text-gray-600 mb-1">Points</h6>{section.delineationContent?.points?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1 mb-2"><input value={item.title} onChange={e => handleRepeatableChange('delineationContent.points', i, 'title', e.target.value)} placeholder="Point Title" className="w-full p-1 border rounded"/><textarea value={item.description} onChange={e => handleRepeatableChange('delineationContent.points', i, 'description', e.target.value)} placeholder="Description" className="w-full p-1 border rounded h-16"/><button type="button" onClick={() => removeRepeatableItem('delineationContent.points', item.id)} className="text-red-500 text-xs">Remove Point</button></div>))}<button type="button" onClick={() => addRepeatableItem('delineationContent.points', { title: '', description: '' })} className="text-blue-600 text-xs">+ Add Point</button></div></div>;
        case 'what_you_learn': return <div className="space-y-2"><input value={section.whatYouLearnTitle || ''} onChange={e => handleSingleFieldChange('whatYouLearnTitle', e.target.value)} placeholder="Section Title" className="w-full p-2 border rounded text-xs"/>{section.whatYouLearnItems?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><input value={item.icon} onChange={e => handleRepeatableChange('whatYouLearnItems', i, 'icon', e.target.value)} placeholder="Icon Name" className="w-full p-1 border rounded text-xs"/><textarea value={item.description} onChange={e => handleRepeatableChange('whatYouLearnItems', i, 'description', e.target.value)} placeholder="Description" className="w-full p-1 border rounded text-xs h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('whatYouLearnItems', {icon: '', description: ''})} className="text-blue-600 text-xs">+ Add Item</button></div>;
        case 'audience': return <div className="space-y-2"><input value={section.audienceTitle || ''} onChange={e => handleSingleFieldChange('audienceTitle', e.target.value)} placeholder="Section Title" className="w-full p-2 border rounded text-xs"/>{section.audienceItems?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><textarea value={item.description} onChange={e => handleRepeatableChange('audienceItems', i, 'description', e.target.value)} placeholder="Description (HTML allowed)" className="w-full p-1 border rounded text-xs h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('audienceItems', {description: ''})} className="text-blue-600 text-xs">+ Add Audience</button></div>;
        case 'about_coach': return <div className="space-y-2"><input value={section.aboutCoachTitle || ''} onChange={e => handleSingleFieldChange('aboutCoachTitle', e.target.value)} placeholder="Section Title" className="w-full p-2 border rounded text-xs"/>{section.aboutCoachAchievements?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><textarea value={item.text} onChange={e => handleRepeatableChange('aboutCoachAchievements', i, 'text', e.target.value)} placeholder="Achievement text" className="w-full p-1 border rounded text-xs h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('aboutCoachAchievements', {text: ''})} className="text-blue-600 text-xs">+ Add Achievement</button></div>;
        case 'faq': return <div className="space-y-2"><input value={section.faqTitle || ''} onChange={e => handleSingleFieldChange('faqTitle', e.target.value)} placeholder="Section Title" className="w-full p-2 border rounded text-xs"/>{section.faqItems?.map((item, i) => (<div key={item.id} className="p-2 border rounded bg-white space-y-1"><input value={item.question} onChange={e => handleRepeatableChange('faqItems', i, 'question', e.target.value)} placeholder="Question" className="w-full p-1 border rounded text-xs"/><textarea value={item.answer} onChange={e => handleRepeatableChange('faqItems', i, 'answer', e.target.value)} placeholder="Answer" className="w-full p-1 border rounded text-xs h-16"/></div>))}<button type="button" onClick={() => addRepeatableItem('faqItems', {question: '', answer: ''})} className="text-blue-600 text-xs">+ Add FAQ</button></div>;
        case 'whatItDoes': return <textarea value={section.whatItDoesOverride || ''} onChange={e => updateSection(section.id, { whatItDoesOverride: e.target.value })} placeholder="Override 'What it Does' content (HTML allowed)" className="w-full p-2 border rounded-md h-24 resize-y font-mono text-sm" />;
        case 'webinar': return <select value={section.webinarProductId || ''} onChange={e => updateSection(section.id, { webinarProductId: e.target.value })} className="w-full p-2 border rounded-md bg-white"><option value="">-- Select a Webinar --</option>{availableWebinars.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>;
        case 'training': if (!app.trainingVideos || app.trainingVideos.length === 0) return <p className="text-xs text-gray-500 italic">No training videos available on the app to select.</p>; return <div className="p-2 border bg-white rounded-md max-h-40 overflow-y-auto space-y-1">{app.trainingVideos.map(video => (<label key={video.url} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer"><input type="checkbox" checked={(section.trainingVideoUrlsOverride || []).includes(video.url)} onChange={() => handleCheckboxChange('trainingVideoUrlsOverride', video.url)} className="h-4 w-4"/><span className="text-sm">{video.name}</span></label>))}</div>;
        case 'pricing': if (!app.pricingTiers || app.pricingTiers.length === 0) return <p className="text-xs text-gray-500 italic">No pricing tiers available on the app to select.</p>; return <div className="p-2 border bg-white rounded-md max-h-40 overflow-y-auto space-y-1">{app.pricingTiers.map(tier => (<label key={tier.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer"><input type="checkbox" checked={(section.pricingTierIdsOverride || []).includes(tier.id)} onChange={() => handleCheckboxChange('pricingTierIdsOverride', tier.id)} className="h-4 w-4"/><span className="text-sm">{tier.name}</span></label>))}</div>;
        case 'videoTestimonials': if (availableTestimonials.length === 0) return <p className="text-xs text-gray-500 italic">No video testimonials available.</p>; return <div className="p-2 border bg-white rounded-md max-h-40 overflow-y-auto space-y-1">{availableTestimonials.map(t => (<label key={t.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer"><input type="checkbox" checked={(section.videoTestimonialIds || []).includes(t.id)} onChange={() => handleCheckboxChange('videoTestimonialIds', t.id)} className="h-4 w-4"/><span className="text-sm">{t.name}</span></label>))}</div>;
        case 'social_connect':
            return (
                <div className="space-y-2 text-xs">
                    <input
                        type="text"
                        value={section.socialConnectContent?.title || ''}
                        onChange={e => handleSingleFieldChange('socialConnectContent.title', e.target.value)}
                        placeholder="Section Title (e.g., Join Our Community)"
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="url"
                        value={section.socialConnectContent?.whatsappGroupLink || ''}
                        onChange={e => handleSingleFieldChange('socialConnectContent.whatsappGroupLink', e.target.value)}
                        placeholder="WhatsApp Group URL"
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="url"
                        value={section.socialConnectContent?.facebookGroupLink || ''}
                        onChange={e => handleSingleFieldChange('socialConnectContent.facebookGroupLink', e.target.value)}
                        placeholder="Facebook Group URL"
                        className="w-full p-2 border rounded"
                    />
                </div>
            );
        default: return <p className="text-xs text-gray-500 italic">This section uses default app content and has no specific settings.</p>;
    }
};

const LandingPageEditorModal: React.FC<LandingPageEditorModalProps> = ({ app, page, onClose, showNotification }) => {
    const [formData, setFormData] = useState<Partial<LandingPageDefinition>>({});
    const [configuringSectionId, setConfiguringSectionId] = useState<string | null>(null);
    const [isOfferPageEditorOpen, setIsOfferPageEditorOpen] = useState(false);

    const [availableWebinars, setAvailableWebinars] = useState<WebinarProduct[]>([]);
    const [availableTestimonials, setAvailableTestimonials] = useState<VideoTestimonial[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const webinarsSnap = await db.collection('webinar_products').orderBy('createdAt', 'desc').get();
                setAvailableWebinars(webinarsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as WebinarProduct)));
                const contentSnap = await db.collection('site_content').doc('live').get();
                if(contentSnap.exists) setAvailableTestimonials(contentSnap.data()?.videoTestimonials || []);
            } catch (error) {
                showNotification("Could not load dependencies.", "error");
            }
        };
        fetchDependencies();
    }, [showNotification]);

    useEffect(() => {
        if (page) {
            let sections = page.sections || [];
            if ((!page.sections || page.sections.length === 0) && page.sectionOrder) {
                sections = page.sectionOrder.map((type, index) => ({
                    id: uuidv4(),
                    order: index,
                    type: type,
                    whatItDoesOverride: type === 'whatItDoes' ? page.whatItDoesOverride : undefined,
                    trainingVideoUrlsOverride: type === 'training' ? page.trainingVideoUrlsOverride : undefined,
                    pricingTierIdsOverride: type === 'pricing' ? page.pricingTierIdsOverride : undefined,
                    videoTestimonialIds: type === 'videoTestimonials' ? page.videoTestimonialIdsOverride : undefined,
                    webinarProductId: type === 'webinar' ? page.webinarProductId : undefined,
                }));
            }
            setFormData({ ...page, sections });
        } else {
            // For new pages, prepopulate with default data
            setFormData({
                appId: app.id,
                appName: app.name,
                name: `New ${app.name} Page`,
                slug: `new-${slugify(app.name)}`,
                ...defaultPageData,
            });
        }
    }, [page, app]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'name' && !page) { // Only auto-slug on creation
            setFormData(prev => ({ ...prev, name: value, slug: slugify(value) }));
        } else if (name === 'hasOfferPage') {
            const shouldPopulate = checked && (!formData.offerPage || Object.keys(formData.offerPage).length === 0);
            if (shouldPopulate) {
                setFormData(prev => ({ 
                    ...prev, 
                    hasOfferPage: true, 
                    offerPage: { 
                        ...defaultOfferPageData, 
                        id: page?.id || '' 
                    } 
                }));
            } else {
                setFormData(prev => ({ ...prev, hasOfferPage: checked }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };
    
    const setSections = (updater: (prev: LandingPageSection[]) => LandingPageSection[]) => {
        setFormData(prev => ({ ...prev, sections: updater(prev.sections || []) }));
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

    const addSection = (type: LandingPageSectionType) => {
        const newSection: LandingPageSection = { id: uuidv4(), type, order: (formData.sections || []).length };
        if (type === 'social_connect') {
            newSection.socialConnectContent = { id: uuidv4(), title: 'Join Our Community', whatsappGroupLink: '', facebookGroupLink: '' };
        }
        setSections(prev => [...prev, newSection]);
    };

    const removeSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));
    const updateSection = (id: string, updates: Partial<LandingPageSection>) => setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    
    const handleSave = async (dataToSave: Partial<LandingPageDefinition>): Promise<boolean> => {
        setIsSaving(true);
        try {
            const { sectionOrder, whatItDoesOverride, trainingVideoUrlsOverride, pricingTierIdsOverride, videoTestimonialIdsOverride, webinarProductId, ...restOfData } = dataToSave;
            
            const cleanSections = (restOfData.sections || []).map((section, index) => {
                const { ...rest } = section;
                const cleanSection: Partial<LandingPageSection> = { id: rest.id, type: rest.type, order: index };
                Object.keys(rest).forEach(key => {
                    const value = (rest as any)[key];
                    if (value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : value !== '')) {
                        (cleanSection as any)[key] = value;
                    }
                });
                return cleanSection as LandingPageSection;
            });
            
            const finalData: Partial<LandingPageDefinition> = {
                ...restOfData,
                appId: app.id, appName: app.name,
                slug: slugify(restOfData.slug || ''),
                sections: cleanSections,
                updatedAt: FieldValue.serverTimestamp(),
            };

            // FIX: Ensure the 'order' property for offer page sections is updated based on array index before saving.
            if (finalData.offerPage && Array.isArray(finalData.offerPage.sections)) {
                finalData.offerPage.sections = finalData.offerPage.sections.map((section, index) => ({
                    ...section,
                    order: index,
                }));
            }

            if (page) {
                if (finalData.offerPage) {
                    finalData.offerPage.id = page.id;
                }
                await db.collection('landingPages').doc(page.id).set(finalData, { merge: true });
            } else {
                const newDocRef = db.collection('landingPages').doc();
                finalData.id = newDocRef.id;
                if (finalData.offerPage) {
                    finalData.offerPage.id = newDocRef.id;
                }
                await newDocRef.set({ ...finalData, createdAt: FieldValue.serverTimestamp() });
            }
            showNotification('Landing page saved successfully!', 'success');
            return true;
        } catch (error: any) {
            showNotification(`Error saving page: ${error.message}`, 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleMainFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleSave(formData);
        if (success) {
            onClose();
        }
    };

    const handleOfferPageSave = async (updatedPageDef: LandingPageDefinition) => {
        const success = await handleSave(updatedPageDef);
        if (success) {
            setFormData(updatedPageDef);
            setIsOfferPageEditorOpen(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
                <form onSubmit={handleMainFormSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <header className="p-6 border-b flex-shrink-0">
                        <div className="flex justify-between items-center"><h3 className="text-2xl font-bold">{page ? 'Edit Landing Page' : 'Create Landing Page'}</h3><button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button></div>
                    </header>
                    <main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                        <div className="space-y-4">
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Internal Name" required className="w-full p-3 border rounded-lg" />
                            <input type="text" name="slug" value={formData.slug || ''} onChange={handleChange} placeholder="URL Slug" required className="w-full p-2 border rounded-lg bg-gray-100 font-mono text-sm" />
                            
                            <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="hasOfferPage"
                                        checked={!!formData.hasOfferPage}
                                        onChange={handleChange}
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-700">Enable Special Offer Page</span>
                                        {formData.hasOfferPage && (
                                            <p className="text-xs text-gray-500 font-mono">/app/{formData.slug}/offers</p>
                                        )}
                                    </div>
                                </label>
                                {formData.hasOfferPage && (
                                    <button type="button" onClick={() => setIsOfferPageEditorOpen(true)} className="text-sm font-semibold text-blue-600 hover:underline">Edit Offer Page</button>
                                )}
                                <div className="pt-3 border-t">
                                    <label htmlFor="offerPageDisabledMessage" className="text-sm font-medium text-gray-700 mb-1 block">"Offer Not Available" Message</label>
                                    <textarea
                                        id="offerPageDisabledMessage"
                                        name="offerPageDisabledMessage"
                                        value={formData.offerPageDisabledMessage || ''}
                                        onChange={handleChange}
                                        placeholder="e.g., This special offer has expired. Check back during our next webinar!"
                                        className="w-full p-2 border rounded-md h-20 text-xs"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">This message is shown to users if they visit the offer URL when this page is disabled. Basic HTML is allowed.</p>
                                </div>
                            </div>

                            <input type="url" name="backgroundImageUrlOverride" value={formData.backgroundImageUrlOverride || ''} onChange={handleChange} placeholder="Background Image URL (Optional)" className="w-full p-2 border rounded-md" />
                            <input type="url" name="whatsappGroupLink" value={formData.whatsappGroupLink || ''} onChange={handleChange} placeholder="WhatsApp Group Link (Optional)" className="w-full p-2 border rounded-md" />
                            <input type="url" name="facebookGroupLink" value={formData.facebookGroupLink || ''} onChange={handleChange} placeholder="Facebook Group Link (Optional)" className="w-full p-2 border rounded-md" />

                            <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                                <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2"><Megaphone size={16}/> SEO / Sharing Settings</h4>
                                <input type="text" name="metaTitle" value={formData.metaTitle || ''} onChange={handleChange} placeholder="Meta Title for Sharing" className="w-full p-2 border rounded-md" />
                                <textarea name="metaDescription" value={formData.metaDescription || ''} onChange={handleChange} placeholder="Meta Description (for sharing preview)" className="w-full p-2 border rounded-md h-20" />
                                <input type="url" name="featuredImageUrl" value={formData.featuredImageUrl || ''} onChange={handleChange} placeholder="Featured Image URL (for sharing)" className="w-full p-2 border rounded-md" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Page Sections</label>
                            <div className="p-3 bg-gray-50 rounded-lg border min-h-[300px]">
                                <div className="space-y-2">
                                    {(formData.sections || []).map((section, index) => (
                                        <div key={section.id} className="bg-white border rounded-md shadow-sm">
                                            <div className="flex items-center gap-2 p-2">
                                                <span className="flex-grow font-medium text-gray-700 text-sm">{allPossibleSections.find(s => s.type === section.type)?.label}</span>
                                                <div className="flex items-center">
                                                    <button type="button" onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUp size={16} /></button>
                                                    <button type="button" onClick={() => moveSection(index, 'down')} disabled={index === (formData.sections || []).length - 1} className="p-1 disabled:opacity-30"><ArrowDown size={16} /></button>
                                                    <button type="button" onClick={() => setConfiguringSectionId(configuringSectionId === section.id ? null : section.id)} className={`p-1 rounded-full ${configuringSectionId === section.id ? 'bg-blue-100 text-blue-600' : ''}`}><Settings size={16} /></button>
                                                    <button type="button" onClick={() => removeSection(section.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            {configuringSectionId === section.id && (
                                                <div className="p-3 border-t bg-gray-50">
                                                    <h5 className="font-semibold text-xs text-gray-600 mb-2">Configure '{allPossibleSections.find(s => s.type === section.type)?.label}'</h5>
                                                    <SectionConfig section={section} updateSection={updateSection} app={app} availableWebinars={availableWebinars} availableTestimonials={availableTestimonials} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(formData.sections || []).length === 0 && <p className="text-center text-xs text-gray-400 italic py-4">No sections added yet.</p>}
                                </div>
                                 <div className="mt-3 relative">
                                    <select onChange={e => addSection(e.target.value as LandingPageSectionType)} value="" className="w-full p-2 border rounded-md bg-white appearance-none text-sm font-semibold text-center text-blue-600 hover:bg-blue-50 cursor-pointer">
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
                           {isSaving ? 'Saving...' : 'Save Page'}
                        </button>
                    </footer>
                </form>
            </div>
            {isOfferPageEditorOpen && formData.offerPage && (
                <OfferPageEditorModal
                    app={app}
                    pageDef={formData as LandingPageDefinition}
                    onClose={() => setIsOfferPageEditorOpen(false)}
                    onSave={handleOfferPageSave}
                    showNotification={showNotification}
                />
            )}
        </>
    );
};

export default LandingPageEditorModal;