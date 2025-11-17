import React, { useState, useEffect } from 'react';
import { X, Loader, Plus, Youtube, UploadCloud, Trash2, Tag, Percent, Calendar } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { AppDefinition, NotificationType, PricingTier, Coupon, TrainingVideo, FaqItem, FairUsePolicy } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';

/**
 * Recursively removes any properties with `undefined` values from an object or an array of objects.
 * Firestore does not support `undefined` field values, so this function cleans the data before saving.
 * @param obj The object or array to clean.
 * @returns A new object or array with all `undefined` values stripped out.
 */
const removeUndefinedFields = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefinedFields(item));
    }
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value !== undefined) {
                const cleanedValue = removeUndefinedFields(value);
                if (cleanedValue !== undefined) {
                    newObj[key] = cleanedValue;
                }
            }
        }
    }
    return newObj;
};


type AppFormData = Omit<AppDefinition, 'id'>;

const slugify = (text: string): string => {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '') // remove non-word chars
        .replace(/[\s_-]+/g, '-') // swap any length of whitespace, underscore, hyphen with a single -
        .replace(/^-+|-+$/g, ''); // remove leading, trailing -
};


const defaultFormData: AppFormData = {
    name: '',
    url: '',
    icon: '',
    description: '',
    totalUsage: 0,
    trainingVideos: [],
    pricingTiers: [],
    marketingVideoUrl: '',
    coupons: [],
    comingSoon: false,
    hasLandingPage: false,
    slug: '',
    whatItDoes: '',
    landingPageBackgroundImageUrl: '',
    faqs: [],
    maxProjects: undefined,
    projectExpirationDays: undefined,
};

interface AppModalProps {
    app: AppDefinition | null;
    onClose: () => void;
    onSave: (appData: AppFormData) => Promise<void>;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const AppModal: React.FC<AppModalProps> = ({ app, onClose, onSave, showNotification }) => {
    const [formData, setFormData] = useState<AppFormData>(defaultFormData);
    const [iconPreview, setIconPreview] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (app) {
            const { id, ...appData } = app;
            
            const sanitizedTiers = (appData.pricingTiers || []).map(tier => ({
                ...tier,
                id: tier.id || uuidv4(),
            }));
            
            const sanitizedCoupons = (appData.coupons || []).map(coupon => ({
                ...coupon,
                id: coupon.id || uuidv4(),
            }));

            // Data sanitization for backward compatibility with old string[] video format
            const sanitizedTrainingVideos = (appData.trainingVideos || []).map(video => {
                if (typeof video === 'string') {
                    return { name: '', url: video };
                }
                return video;
            });
            
            const sanitizedFaqs = (appData.faqs || []).map(faq => ({
                ...faq,
                id: faq.id || uuidv4(),
            }));

            // Migration logic for fairUsePolicy
            let fairUsePolicy = appData.fairUsePolicy;
            // @ts-ignore - for migration
            if (!fairUsePolicy && appData.fairUseDailyLimit) {
                fairUsePolicy = {
                    // @ts-ignore
                    limit: appData.fairUseDailyLimit,
                    frequency: 'daily',
                    customText: ''
                };
            }

            setFormData({
                ...defaultFormData,
                ...appData,
                pricingTiers: sanitizedTiers,
                coupons: sanitizedCoupons,
                trainingVideos: sanitizedTrainingVideos,
                faqs: sanitizedFaqs,
                fairUsePolicy: fairUsePolicy,
            });
            setIconPreview(app.icon);
        } else {
            setFormData(defaultFormData);
            setIconPreview('');
        }
    }, [app]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        if (name === 'name') {
            setFormData(prev => ({ ...prev, name: value, slug: slugify(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };
    
    const handleGlobalSettingChange = (field: keyof AppFormData, value: string) => {
        setFormData(prev => ({...prev, [field]: value === '' ? undefined : Number(value)}));
    }
    
    const handleGlobalFairUseChange = (field: keyof FairUsePolicy, value: string | number) => {
         const currentPolicy = formData.fairUsePolicy;
        if (field === 'limit' && Number(value) <= 0) {
            const { fairUsePolicy, ...restOfData } = formData;
            setFormData(restOfData);
            return;
        }
        setFormData(prev => ({
            ...prev,
            fairUsePolicy: {
                ...(currentPolicy || { limit: 0, frequency: 'daily' }),
                [field]: value,
            }
        }));
    }

    const handleTierUpdate = (index: number, updates: Partial<PricingTier>) => {
        const newTiers = [...(formData.pricingTiers || [])];
        newTiers[index] = { ...newTiers[index], ...updates };
        setFormData(prev => ({ ...prev, pricingTiers: newTiers }));
    };

    const handleVideoChange = (index: number, field: 'name' | 'url', value: string) => {
        const newVideos = [...(formData.trainingVideos || [])];
        newVideos[index] = { ...newVideos[index], [field]: value };
        setFormData(prev => ({ ...prev, trainingVideos: newVideos }));
    };
    
    const handleTierChange = (index: number, field: keyof Omit<PricingTier, 'id' | 'fairUsePolicy' | 'maxProjects' | 'projectExpirationDays'>, value: string | boolean) => {
        const tiers = [...(formData.pricingTiers || [])];
        const tier = { ...tiers[index] };
    
        if (field === 'isWebinarAddon' || field === 'isPublic') {
            tier[field] = value as boolean;
        } else if (field === 'name') {
            tier[field] = value as string;
        } else if (field === 'price' || field === 'originalPrice') {
            const numValue = parseFloat(value as string) * 100;
            tier[field] = isNaN(numValue) ? 0 : numValue;
        } else if (field === 'credits' || field === 'validityInDays') {
            const numValue = parseInt(value as string, 10);
            (tier as any)[field] = isNaN(numValue) ? undefined : numValue;
        }
    
        tiers[index] = tier;
        setFormData(prev => ({ ...prev, pricingTiers: tiers }));
    };

    const addTier = () => {
        const newTier: PricingTier = { id: uuidv4(), name: '', credits: 0, price: 0, isWebinarAddon: false, originalPrice: 0 };
        setFormData(prev => ({ ...prev, pricingTiers: [...(prev.pricingTiers || []), newTier] }));
    };

    const removeTier = (index: number) => {
        const tiers = [...(formData.pricingTiers || [])];
        tiers.splice(index, 1);
        setFormData(prev => ({ ...prev, pricingTiers: tiers }));
    };
    
    const handleCouponChange = (index: number, field: keyof Omit<Coupon, 'id'>, value: string | number) => {
        const coupons = [...(formData.coupons || [])];
        coupons[index] = { ...coupons[index], [field]: value };
        setFormData(prev => ({ ...prev, coupons }));
    };

    const addCoupon = () => {
        const newCoupon: Coupon = { id: uuidv4(), code: '', discountPercentage: 10, expiryDate: '' };
        setFormData(prev => ({ ...prev, coupons: [...(prev.coupons || []), newCoupon] }));
    };

    const removeCoupon = (index: number) => {
        const coupons = [...(formData.coupons || [])];
        coupons.splice(index, 1);
        setFormData(prev => ({ ...prev, coupons }));
    };


    const addVideoLink = () => {
        if ((formData.trainingVideos || []).length < 10) {
            const newVideo: TrainingVideo = { name: '', url: '' };
            setFormData(prev => ({ ...prev, trainingVideos: [...(prev.trainingVideos || []), newVideo] }));
        }
    };

    const removeVideoLink = (index: number) => {
        const newLinks = [...(formData.trainingVideos || [])];
        newLinks.splice(index, 1);
        setFormData(prev => ({ ...prev, trainingVideos: newLinks }));
    };
    
    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
            showNotification('Invalid file type. Please upload a PNG, JPG, SVG, or WEBP file.', 'error');
            return;
        }

        if (file.size > 200 * 1024) { // 200KB limit
            showNotification('File is too large. Please upload an icon under 200KB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUri = reader.result as string;
            setIconPreview(dataUri);
            setFormData(prev => ({ ...prev, icon: dataUri }));
        };
        reader.onerror = () => {
            showNotification('Failed to read the icon file.', 'error');
        };
        reader.readAsDataURL(file);
    };

    const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
        const newFaqs = [...(formData.faqs || [])];
        newFaqs[index] = { ...newFaqs[index], [field]: value };
        setFormData(prev => ({ ...prev, faqs: newFaqs }));
    };

    const addFaq = () => {
        const newFaq: FaqItem = { id: uuidv4(), question: '', answer: '' };
        setFormData(prev => ({ ...prev, faqs: [...(prev.faqs || []), newFaq] }));
    };

    const removeFaq = (index: number) => {
        const newFaqs = [...(formData.faqs || [])];
        newFaqs.splice(index, 1);
        setFormData(prev => ({ ...prev, faqs: newFaqs }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        
        const trainingVideos = (formData.trainingVideos || []).filter(video => video.name.trim() !== '' && video.url.trim() !== '');
        const pricingTiers = (formData.pricingTiers || []).filter(tier => tier.name.trim() && tier.credits >= 0 && tier.price > 0);
        const coupons = (formData.coupons || []).filter(c => c.code.trim() && c.discountPercentage > 0 && c.expiryDate);
        const faqs = (formData.faqs || []).filter(faq => faq.question.trim() !== '' && faq.answer.trim() !== '');

        const { fairUseDailyLimit, ...restOfFormData } = formData as any;

        let dataToSave: AppFormData = { 
            ...restOfFormData,
            trainingVideos,
            pricingTiers,
            coupons,
            faqs,
            maxProjects: formData.maxProjects ? Number(formData.maxProjects) : undefined,
            projectExpirationDays: formData.projectExpirationDays ? Number(formData.projectExpirationDays) : undefined,
        };
        
        if (dataToSave.comingSoon) {
            dataToSave.url = '';
        }

        if (!app && !dataToSave.icon && dataToSave.url) {
            try {
                const domain = new URL(dataToSave.url).hostname;
                dataToSave.icon = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
            } catch (error) {
                console.error("Invalid URL provided for favicon generation:", dataToSave.url);
                dataToSave.icon = '';
            }
        }

        if (!app) {
            dataToSave.totalUsage = dataToSave.totalUsage || 0;
        }
        
        // FIX: Clean the data object of any `undefined` fields before sending to Firestore.
        const cleanedData = removeUndefinedFields(dataToSave);
        
        await onSave(cleanedData);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-6 sm:p-8 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{app ? 'Edit Application' : 'Add New Application'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 sm:p-8 space-y-6 overflow-y-auto min-h-0">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Application Name" required className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"/>
                    
                    <input
                        type="url"
                        name="url"
                        value={formData.url}
                        onChange={handleChange}
                        placeholder={formData.comingSoon ? "URL is optional for 'Coming Soon' apps" : "Application URL (https://...)"}
                        required={!formData.comingSoon}
                        disabled={!!formData.comingSoon}
                        className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-200 disabled:cursor-not-allowed bg-white text-gray-900 placeholder-gray-500"
                    />

                    <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="App Description (optional, max 150 chars)" maxLength={150} className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-none h-24 bg-white text-gray-900 placeholder-gray-500"/>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <input
                            type="checkbox"
                            id="comingSoon"
                            name="comingSoon"
                            checked={!!formData.comingSoon}
                            onChange={handleChange}
                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="comingSoon" className="text-sm font-medium text-gray-700">
                            Mark as 'Coming Soon' (app will be visible but not purchasable/launchable)
                        </label>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                        <h4 className="text-md font-semibold text-gray-700">Global App Settings</h4>
                        <p className="text-xs text-gray-500 -mt-2">These are the default settings for all pricing tiers. You can override them within each tier below.</p>
                        
                        <div className="pt-3 border-t">
                            <label className="text-sm font-medium text-gray-600">Project & Data Settings (Global Default)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                <input type="number" name="maxProjects" value={formData.maxProjects ?? ''} onChange={e => handleGlobalSettingChange('maxProjects', e.target.value)} placeholder="Max Projects" className="p-1 border rounded-md text-sm"/>
                                <input type="number" name="projectExpirationDays" value={formData.projectExpirationDays ?? ''} onChange={e => handleGlobalSettingChange('projectExpirationDays', e.target.value)} placeholder="Expiration (Days)" className="p-1 border rounded-md text-sm"/>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Leave blank to let child app use its own internal defaults.</p>
                        </div>

                        <div className="pt-3 border-t">
                            <label className="text-sm font-medium text-gray-600">Fair Use Policy (for Unlimited Tiers)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                <input type="number" value={formData.fairUsePolicy?.limit || ''} onChange={e => handleGlobalFairUseChange('limit', Number(e.target.value))} placeholder="Usage Limit" min="0" className="p-1 border rounded-md text-sm" />
                                <select value={formData.fairUsePolicy?.frequency || 'daily'} onChange={e => handleGlobalFairUseChange('frequency', e.target.value as 'daily'|'monthly'|'yearly')} className="p-1 border rounded-md text-sm bg-white">
                                    <option value="daily">Daily</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                                <div className="sm:col-span-2">
                                    <input type="text" value={formData.fairUsePolicy?.customText || ''} onChange={e => handleGlobalFairUseChange('customText', e.target.value)} placeholder="Custom text (e.g., ~90 maps in a month)" className="p-1 border rounded-md w-full text-sm" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Set a usage cap for 'unlimited' tiers to prevent abuse. Leave limit empty or 0 for no policy.</p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="hasLandingPage"
                                checked={!!formData.hasLandingPage}
                                onChange={handleChange}
                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-700">Enable dedicated Landing Page for sales</span>
                        </label>
                        {formData.hasLandingPage && (
                            <div className="space-y-3 pt-3 border-t">
                                <div>
                                    <label htmlFor="slug" className="text-sm font-medium text-gray-700 mb-1 block">URL Slug</label>
                                    <input id="slug" type="text" name="slug" value={formData.slug} onChange={handleChange} placeholder="URL Slug (auto-generated)" required={formData.hasLandingPage} className="w-full p-2 border rounded-lg bg-white font-mono text-sm" />
                                </div>
                                <div>
                                     <label htmlFor="whatItDoes" className="text-sm font-medium text-gray-700 mb-1 block">Features / "What it does"</label>
                                    <textarea id="whatItDoes" name="whatItDoes" value={formData.whatItDoes || ''} onChange={handleChange} placeholder="Describe what this app does. This content will appear on the landing page. You can use HTML for formatting." className="w-full p-2 border rounded-lg h-24 resize-y bg-white font-mono text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="landingPageBackgroundImageUrl" className="text-sm font-medium text-gray-700 mb-1 block">Background Image URL</label>
                                    <input
                                        id="landingPageBackgroundImageUrl"
                                        type="url"
                                        name="landingPageBackgroundImageUrl"
                                        value={formData.landingPageBackgroundImageUrl || ''}
                                        onChange={handleChange}
                                        placeholder="https://example.com/background.jpg"
                                        className="w-full p-2 border rounded-lg bg-white font-mono text-sm"
                                    />
                                </div>
                                 <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Frequently Asked Questions (FAQs)</label>
                                    <div className="space-y-3 p-3 bg-gray-100 border rounded-lg">
                                        {(formData.faqs || []).map((faq, index) => (
                                            <div key={faq.id} className="p-3 bg-white border rounded-md space-y-2">
                                                <div className="flex justify-end">
                                                    <button type="button" onClick={() => removeFaq(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Question"
                                                    value={faq.question}
                                                    onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                                                    className="w-full p-2 border rounded-md"
                                                />
                                                <textarea
                                                    placeholder="Answer"
                                                    value={faq.answer}
                                                    onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                                                    className="w-full p-2 border rounded-md h-24 resize-y"
                                                />
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={addFaq} 
                                            className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-2"
                                        >
                                            <Plus size={14} /> Add FAQ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Application Icon</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <AppIcon icon={iconPreview} name={formData.name || 'App'} className="w-16 h-16 rounded-xl flex-shrink-0" />
                            <div className="flex-grow w-full">
                                <input
                                    type="file"
                                    id="icon-upload"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                    onChange={handleIconUpload}
                                    disabled={isSaving}
                                />
                                <label
                                    htmlFor="icon-upload"
                                    className="w-full flex items-center justify-center p-3 border-2 border-dashed rounded-lg text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition cursor-pointer"
                                >
                                    <UploadCloud className="mr-2 text-gray-500" size={20} />
                                    <span>Upload Custom Icon</span>
                                </label>
                                <p className="text-xs text-gray-500 mt-2">Or leave blank to auto-detect the website's favicon. (Max 200KB)</p>
                            </div>
                        </div>
                    </div>

                     <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Marketing Video</label>
                         <div className="flex items-center gap-2">
                             <Youtube className="text-gray-400 flex-shrink-0" size={20} />
                            <input type="url" name="marketingVideoUrl" value={formData.marketingVideoUrl || ''} onChange={handleChange} placeholder="Public YouTube Video URL for Marketing (optional)" className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"/>
                        </div>
                    </div>


                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Credit Pricing Tiers</label>
                        <div className="space-y-3 p-3 bg-gray-50 border rounded-lg">
                            {(formData.pricingTiers || []).map((tier, index) => (
                                <div key={tier.id} className={`p-3 bg-white border rounded-md space-y-3 ${tier.isWebinarAddon ? 'border-purple-400 border-2' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <input
                                            type="text"
                                            placeholder="Tier Name (e.g., Starter)"
                                            value={tier.name}
                                            onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                                            className="p-2 border rounded-md text-sm font-semibold flex-grow"
                                            required
                                        />
                                        <button type="button" onClick={() => removeTier(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors ml-2">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                                        <input
                                            type="number"
                                            placeholder="Credits (0 for unlimited)"
                                            value={tier.credits}
                                            onChange={(e) => handleTierChange(index, 'credits', e.target.value)}
                                            className="p-2 border rounded-md text-sm w-full"
                                            min="0"
                                            required
                                        />
                                        <input
                                            type="number"
                                            placeholder="Validity (days)"
                                            value={tier.validityInDays || ''}
                                            onChange={(e) => handleTierChange(index, 'validityInDays', e.target.value)}
                                            className="p-2 border rounded-md text-sm w-full"
                                            min="0"
                                        />
                                        {tier.isWebinarAddon ? (
                                            <>
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                    <input type="number" placeholder="Original" value={tier.originalPrice ? tier.originalPrice / 100 : ''} onChange={(e) => handleTierChange(index, 'originalPrice', e.target.value)} className="p-2 pl-6 border rounded-md text-sm w-full" min="0.01" step="0.01"/>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                    <input type="number" placeholder="Offered" value={tier.price > 0 ? tier.price / 100 : ''} onChange={(e) => handleTierChange(index, 'price', e.target.value)} className="p-2 pl-6 border rounded-md text-sm w-full" min="0.01" step="0.01" required/>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="relative sm:col-span-2">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                <input type="number" placeholder="Price" value={tier.price > 0 ? tier.price / 100 : ''} onChange={(e) => handleTierChange(index, 'price', e.target.value)} className="p-2 pl-6 border rounded-md text-sm w-full" min="0.01" step="0.01" required/>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={!!tier.isWebinarAddon} onChange={(e) => handleTierChange(index, 'isWebinarAddon', e.target.checked)} className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"/>
                                            <span className="text-sm font-medium text-purple-700">Special Offer Tier (for Offer Pages)</span>
                                        </label>
                                        {tier.isWebinarAddon && (
                                            <div className="pt-2 pl-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!tier.isPublic}
                                                        onChange={(e) => handleTierChange(index, 'isPublic', e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Show on public pricing pages</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {tier.credits === 0 && (
                                        <div className="pt-3 border-t">
                                            <label className="text-xs font-medium text-gray-500">Fair Use Policy (Tier Override)</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                                <input type="number" value={tier.fairUsePolicy?.limit || ''} onChange={e => handleTierUpdate(index, { fairUsePolicy: { ...(tier.fairUsePolicy || { frequency: 'daily' }), limit: parseInt(e.target.value, 10) || 0 }})} placeholder="Global Default" min="0" className="p-1 border rounded-md text-sm" />
                                                <select value={tier.fairUsePolicy?.frequency || 'daily'} onChange={e => handleTierUpdate(index, { fairUsePolicy: { ...(tier.fairUsePolicy || { limit: 0 }), frequency: e.target.value as 'daily'|'monthly'|'yearly' }})} className="p-1 border rounded-md text-sm bg-white">
                                                    <option value="daily">Daily</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="yearly">Yearly</option>
                                                </select>
                                                <div className="sm:col-span-2">
                                                    <input type="text" value={tier.fairUsePolicy?.customText || ''} onChange={e => handleTierUpdate(index, { fairUsePolicy: { ...(tier.fairUsePolicy || { limit: 0, frequency: 'daily' }), customText: e.target.value }})} placeholder="Custom text (optional)" className="p-1 border rounded-md w-full text-sm" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Leave blank to use the global app setting.</p>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t">
                                        <label className="text-xs font-medium text-gray-500">Project & Data Settings (Tier Override)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                            <input type="number" value={tier.maxProjects ?? ''} onChange={e => handleTierUpdate(index, { maxProjects: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Max Projects" min="0" className="p-1 border rounded-md text-sm" />
                                            <input type="number" value={tier.projectExpirationDays ?? ''} onChange={e => handleTierUpdate(index, { projectExpirationDays: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Expiration (Days)" min="0" className="p-1 border rounded-md text-sm" />
                                        </div>
                                         <p className="text-xs text-gray-400 mt-1">Leave blank to use the global app setting.</p>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addTier} className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-2" disabled={isSaving}>
                                <Plus size={14} /> Add Pricing Tier
                            </button>
                        </div>
                    </div>
                    
                     <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Coupons</label>
                        <div className="space-y-3 p-3 bg-gray-50 border rounded-lg">
                           {(formData.coupons || []).map((coupon, index) => (
                                <div key={coupon.id} className="p-3 bg-white border rounded-md grid grid-cols-1 sm:grid-cols-[1fr,auto,auto,auto] gap-3 items-center">
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input type="text" placeholder="CODE" value={coupon.code} onChange={(e) => handleCouponChange(index, 'code', e.target.value.toUpperCase())} className="w-full p-2 pl-9 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white text-gray-900 placeholder-gray-500" required />
                                    </div>
                                    <div className="relative">
                                        <input type="number" placeholder="%" value={coupon.discountPercentage} onChange={(e) => handleCouponChange(index, 'discountPercentage', parseInt(e.target.value, 10))} className="w-24 p-2 pr-6 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white text-gray-900 placeholder-gray-500" required min="1" max="100"/>
                                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    </div>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input type="date" value={coupon.expiryDate} onChange={(e) => handleCouponChange(index, 'expiryDate', e.target.value)} className="w-full p-2 pl-9 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white text-gray-900" required />
                                    </div>
                                    <button type="button" onClick={() => removeCoupon(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors justify-self-end">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addCoupon} className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-2" disabled={isSaving}>
                                <Plus size={14} /> Add Coupon
                            </button>
                        </div>
                    </div>


                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Training Videos (Max 10)</label>
                        <div className="space-y-3">
                            {(formData.trainingVideos || []).map((video, index) => (
                                <div key={index} className="flex items-start gap-2 p-3 border rounded-md bg-gray-50">
                                    <div className="flex-grow space-y-2">
                                        <input
                                            type="text"
                                            value={video.name}
                                            onChange={(e) => handleVideoChange(index, 'name', e.target.value)}
                                            placeholder={`Video Name (e.g., Introduction)`}
                                            className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                                            required
                                        />
                                        <div className="flex items-center gap-2">
                                            <Youtube className="text-gray-400 flex-shrink-0" size={20} />
                                            <input
                                                type="url"
                                                value={video.url}
                                                onChange={(e) => handleVideoChange(index, 'url', e.target.value)}
                                                placeholder={`YouTube Video URL`}
                                                className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeVideoLink(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors flex-shrink-0">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {(formData.trainingVideos || []).length < 10 && (
                                <button 
                                    type="button" 
                                    onClick={addVideoLink} 
                                    className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-2"
                                    disabled={isSaving}
                                >
                                    <Plus size={14} /> Add Video Link
                                </button>
                            )}
                        </div>
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t flex-shrink-0">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                       {isSaving && <Loader className="animate-spin mr-2" size={20} />}
                       {isSaving ? 'Saving...' : 'Save Application'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default AppModal;
