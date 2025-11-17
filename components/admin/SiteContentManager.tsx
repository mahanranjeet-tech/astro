
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase.ts';
import { Save, Loader, Info, Phone, Mail, MapPin, FileText, Shield, RefreshCcw, Truck, Settings, Facebook, Instagram, Youtube, Twitter as XIcon, Linkedin, Video, Plus, Trash2, Megaphone } from 'lucide-react';
import type { NotificationType, VideoTestimonial, CheckoutSettingsState, OtpSettings } from '../../types.ts';
import { v4 as uuidv4 } from 'uuid';

interface SiteContentManagerProps {
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    videoTestimonials: VideoTestimonial[];
}

interface ContentState {
    about: { content: string };
    contact: { address: string; email: string; phone: string; };
    privacy: { content: string };
    terms: { content: string };
    refund: { content: string };
    shipping: { content: string };
    videoTestimonials?: VideoTestimonial[];
}

interface SocialLink {
    url: string;
    iconUrl: string;
}

interface SocialLinksState {
    facebook: SocialLink;
    instagram: SocialLink;
    youtube: SocialLink;
    x: SocialLink;
    linkedin: SocialLink;
    emailIconSize?: number;
}

const initialContentState: ContentState = {
    about: { content: '' },
    contact: { address: '', email: '', phone: '' },
    privacy: { content: '' },
    terms: { content: '' },
    refund: { content: '' },
    shipping: { content: '' },
    videoTestimonials: [],
};

const initialSocialLinksState: SocialLinksState = {
    facebook: { url: '', iconUrl: '' },
    instagram: { url: '', iconUrl: '' },
    youtube: { url: '', iconUrl: '' },
    x: { url: '', iconUrl: '' },
    linkedin: { url: '', iconUrl: '' },
    emailIconSize: 16,
};

const initialCheckoutSettings: CheckoutSettingsState = {
    appPurchase: { requireEmailOtp: true, requirePhoneOtp: true },
    webinarPurchase: { requireEmailOtp: false, requirePhoneOtp: false },
    packagePurchase: { requireEmailOtp: true, requirePhoneOtp: true },
};


const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-full">{icon}</div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

const SiteContentManager: React.FC<SiteContentManagerProps> = ({ showNotification }) => {
    const [content, setContent] = useState<ContentState>(initialContentState);
    const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettingsState>(initialCheckoutSettings);
    const [socialLinks, setSocialLinks] = useState<SocialLinksState>(initialSocialLinksState);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSavingSocial, setIsSavingSocial] = useState(false);


    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        try {
            const contentDocRef = db.collection('site_content').doc('live');
            const settingsDocRef = db.collection('site_content').doc('checkout_settings');
            const socialDocRef = db.collection('site_content').doc('social_links');
            
            const [contentDocSnap, settingsDocSnap, socialDocSnap] = await Promise.all([
                contentDocRef.get(), 
                settingsDocRef.get(),
                socialDocRef.get(),
            ]);

            if (contentDocSnap.exists) {
                const fetchedData = contentDocSnap.data() as Partial<ContentState>;
                const newContent = {
                    about: { ...initialContentState.about, ...fetchedData.about },
                    contact: { ...initialContentState.contact, ...fetchedData.contact },
                    privacy: { ...initialContentState.privacy, ...fetchedData.privacy },
                    terms: { ...initialContentState.terms, ...fetchedData.terms },
                    refund: { ...initialContentState.refund, ...fetchedData.refund },
                    shipping: { ...initialContentState.shipping, ...fetchedData.shipping },
                    videoTestimonials: (fetchedData.videoTestimonials || []).map((vt: any) => ({ ...vt, id: vt.id || uuidv4() })),
                };
                setContent(newContent);
            } else {
                setContent(initialContentState);
            }

            if (settingsDocSnap.exists) {
                const data = settingsDocSnap.data() as any;
                if (data.requireEmailOtp !== undefined || data.requirePhoneOtp !== undefined) {
                    // Old format detected, migrate it
                    setCheckoutSettings({
                        appPurchase: {
                            requireEmailOtp: data.requireEmailOtp !== false,
                            requirePhoneOtp: data.requirePhoneOtp !== false,
                        },
                        webinarPurchase: {
                            requireEmailOtp: false,
                            requirePhoneOtp: false,
                        },
                        packagePurchase: { // Default new setting for old structures
                            requireEmailOtp: true,
                            requirePhoneOtp: true,
                        }
                    });
                } else {
                    // New format
                    setCheckoutSettings({
                        appPurchase: { ...initialCheckoutSettings.appPurchase, ...data.appPurchase },
                        webinarPurchase: { ...initialCheckoutSettings.webinarPurchase, ...data.webinarPurchase },
                        packagePurchase: { ...initialCheckoutSettings.packagePurchase, ...data.packagePurchase },
                    });
                }
            } else {
                setCheckoutSettings(initialCheckoutSettings);
            }

            if (socialDocSnap.exists) {
                const fetchedSocials = socialDocSnap.data() as Partial<SocialLinksState>;
                const newSocials: SocialLinksState = {
                    facebook: { ...initialSocialLinksState.facebook, ...fetchedSocials.facebook },
                    instagram: { ...initialSocialLinksState.instagram, ...fetchedSocials.instagram },
                    youtube: { ...initialSocialLinksState.youtube, ...fetchedSocials.youtube },
                    x: { ...initialSocialLinksState.x, ...fetchedSocials.x },
                    linkedin: { ...initialSocialLinksState.linkedin, ...fetchedSocials.linkedin },
                    emailIconSize: fetchedSocials.emailIconSize ?? 16,
                };
                setSocialLinks(newSocials);
            }


        } catch (error) {
            console.error("Error fetching site content:", error);
            showNotification('Failed to load site content.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleContentChange = (section: keyof Omit<ContentState, 'videoTestimonials'>, field: string, value: string) => {
        setContent(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    };
    
    const handleVideoTestimonialChange = (index: number, field: 'name' | 'place' | 'url', value: string) => {
        setContent(prev => {
            const newTestimonials = [...(prev.videoTestimonials || [])];
            newTestimonials[index] = { ...newTestimonials[index], [field]: value };
            return { ...prev, videoTestimonials: newTestimonials };
        });
    };

    const addVideoTestimonial = () => {
        const newTestimonial: VideoTestimonial = { id: uuidv4(), name: '', place: '', url: '' };
        setContent(prev => ({ ...prev, videoTestimonials: [...(prev.videoTestimonials || []), newTestimonial] }));
    };

    const removeVideoTestimonial = (index: number) => {
        setContent(prev => {
            const newTestimonials = [...(prev.videoTestimonials || [])];
            newTestimonials.splice(index, 1);
            return { ...prev, videoTestimonials: newTestimonials };
        });
    };

    const handleSocialLinkChange = (platform: keyof Omit<SocialLinksState, 'emailIconSize'>, field: 'url' | 'iconUrl', value: string) => {
        setSocialLinks(prev => ({ 
            ...prev, 
            [platform]: {
                ...prev[platform],
                [field]: value
            }
        }));
    };
    
    const handleIconSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const size = parseInt(e.target.value, 10);
        setSocialLinks(prev => ({
            ...prev,
            emailIconSize: isNaN(size) ? 16 : size
        }));
    };

    const handleToggleChange = (type: keyof CheckoutSettingsState, key: keyof OtpSettings) => {
        setCheckoutSettings(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [key]: !prev[type][key],
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const contentDocRef = db.collection('site_content').doc('live');
            const dataToSave = {
                ...content,
                videoTestimonials: (content.videoTestimonials || []).filter(vt => vt.name && vt.place && vt.url)
            };
            await contentDocRef.set(dataToSave, { merge: true });
            showNotification('Site content updated successfully!', 'success');
        } catch (error) {
            console.error("Error saving site content:", error);
            showNotification('Failed to save site content.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveCheckoutSettings = async () => {
        setIsSavingSettings(true);
        try {
            await db.collection('site_content').doc('checkout_settings').set(checkoutSettings);
            showNotification('Checkout settings updated successfully!', 'success');
        } catch (error) {
            console.error("Error saving checkout settings:", error);
            showNotification('Failed to save checkout settings.', 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };
    
    const handleSaveSocialLinks = async () => {
        setIsSavingSocial(true);
        try {
            await db.collection('site_content').doc('social_links').set(socialLinks, { merge: true });
            showNotification('Social media links updated!', 'success');
        } catch (error: any) {
            console.error("Error saving social links:", error);
            showNotification(`Failed to save social links: ${error.message}`, 'error');
        } finally {
            setIsSavingSocial(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-10">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }
    
    const socialPlatforms: (keyof Omit<SocialLinksState, 'emailIconSize'>)[] = ['facebook', 'instagram', 'youtube', 'x', 'linkedin'];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Manage Site Content</h2>
                    <p className="text-gray-500 mt-1">Edit the information displayed on public-facing pages.</p>
                </div>
                 <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 w-full sm:w-auto"
                >
                    {isSaving ? <Loader className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                    {isSaving ? 'Saving...' : 'Save Page Content'}
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                     <Section title="About Us" icon={<Info size={24} />}>
                        <label className="text-sm font-medium text-gray-700">Page Content</label>
                        <textarea
                            value={content.about.content}
                            onChange={e => handleContentChange('about', 'content', e.target.value)}
                            placeholder="Enter your business description here."
                            className="w-full h-40 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-y bg-white text-gray-900 placeholder-gray-500"
                        />
                    </Section>

                     <Section title="Contact Information" icon={<Phone size={24} />}>
                         <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="email"
                                value={content.contact.email}
                                onChange={e => handleContentChange('contact', 'email', e.target.value)}
                                placeholder="Contact Email Address"
                                className="w-full p-3 pl-10 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                            />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="tel"
                                value={content.contact.phone}
                                onChange={e => handleContentChange('contact', 'phone', e.target.value)}
                                placeholder="Contact Phone Number"
                                className="w-full p-3 pl-10 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                            />
                        </div>
                        <label className="text-sm font-medium text-gray-700">Operating Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                            <textarea
                                value={content.contact.address}
                                onChange={e => handleContentChange('contact', 'address', e.target.value)}
                                placeholder="Operating Address"
                                className="w-full h-24 p-3 pl-10 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-y bg-white text-gray-900 placeholder-gray-500"
                            />
                        </div>
                    </Section>

                </div>

                <div className="space-y-8">
                     <Section title="Privacy Policy" icon={<Shield size={24} />}>
                        <label className="text-sm font-medium text-gray-700">Page Content</label>
                        <textarea
                            value={content.privacy.content}
                            onChange={e => handleContentChange('privacy', 'content', e.target.value)}
                            placeholder="Enter your privacy policy text."
                            className="w-full h-24 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-y bg-white text-gray-900 placeholder-gray-500"
                        />
                    </Section>
                    <Section title="Terms & Conditions" icon={<FileText size={24} />}>
                         <label className="text-sm font-medium text-gray-700">Page Content</label>
                        <textarea
                            value={content.terms.content}
                            onChange={e => handleContentChange('terms', 'content', e.target.value)}
                            placeholder="Enter your terms and conditions."
                            className="w-full h-24 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-y bg-white text-gray-900 placeholder-gray-500"
                        />
                    </Section>
                     <Section title="Cancellation & Refund Policy" icon={<RefreshCcw size={24} />}>
                        <label className="text-sm font-medium text-gray-700">Page Content</label>
                        <textarea
                            value={content.refund.content}
                            onChange={e => handleContentChange('refund', 'content', e.target.value)}
                            placeholder="Enter your cancellation and refund policy."
                            className="w-full h-24 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-y bg-white text-gray-900 placeholder-gray-500"
                        />
                    </Section>
                    <Section title="Shipping & Delivery Policy" icon={<Truck size={24} />}>
                        <label className="text-sm font-medium text-gray-700">Page Content</label>
                        <textarea
                            value={content.shipping.content}
                            onChange={e => handleContentChange('shipping', 'content', e.target.value)}
                            placeholder="Enter your shipping and delivery policy."
                            className="w-full h-24 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-y bg-white text-gray-900 placeholder-gray-500"
                        />
                    </Section>
                </div>
            </div>

            <Section title="Video Testimonials" icon={<Video size={24} />}>
                <div className="space-y-3">
                    {(content.videoTestimonials || []).map((testimonial, index) => (
                        <div key={testimonial.id} className="p-3 bg-gray-100 border rounded-md grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-3 items-start">
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Client Name"
                                    value={testimonial.name}
                                    onChange={(e) => handleVideoTestimonialChange(index, 'name', e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                />
                                <input
                                    type="text"
                                    placeholder="Client Place (e.g., City, Country)"
                                    value={testimonial.place}
                                    onChange={(e) => handleVideoTestimonialChange(index, 'place', e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                />
                                <div className="flex items-center gap-2">
                                    <Youtube className="text-gray-400 flex-shrink-0" size={20} />
                                    <input
                                        type="url"
                                        placeholder="YouTube Video URL"
                                        value={testimonial.url}
                                        onChange={(e) => handleVideoTestimonialChange(index, 'url', e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                    />
                                </div>
                            </div>
                            <button type="button" onClick={() => removeVideoTestimonial(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full sm:ml-2 justify-self-end">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addVideoTestimonial} className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-2">
                        <Plus size={14} /> Add Video Testimonial
                    </button>
                </div>
            </Section>

            <Section title="Social Media Links" icon={<Mail size={24} />}>
                <p className="text-sm text-gray-500 -mt-2">These links and icons will appear in the site footer and can be used in email templates.</p>
                <div className="space-y-4">
                    {socialPlatforms.map(platform => {
                        const platformIcons = { facebook: <Facebook/>, instagram: <Instagram/>, youtube: <Youtube/>, x: <XIcon/>, linkedin: <Linkedin/> };
                        const defaultIconUrl = `https://cdn.tools.unlayer.com/social/icons/circle-color/${platform === 'x' ? 'twitter' : platform}.png`;

                        return (
                            <div key={platform} className="p-3 bg-gray-50 rounded-lg border grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{platformIcons[platform]}</div>
                                    <input type="url" value={socialLinks[platform].url} onChange={e => handleSocialLinkChange(platform, 'url', e.target.value)} placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} Profile URL`} className="w-full p-3 pl-10 border rounded-lg"/>
                                </div>
                                 <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={16}/></div>
                                    <input type="url" value={socialLinks[platform].iconUrl} onChange={e => handleSocialLinkChange(platform, 'iconUrl', e.target.value)} placeholder="Email Icon URL (optional)" className="w-full p-3 pl-10 border rounded-lg"/>
                                    <p className="text-xs text-gray-400 px-1 mt-1">Placeholder: {defaultIconUrl}</p>
                                </div>
                            </div>
                        );
                    })}
                     <div className="p-3 bg-gray-50 rounded-lg border">
                        <label htmlFor="emailIconSize" className="font-medium text-gray-700">Email Icon Size</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                id="emailIconSize"
                                type="number"
                                value={socialLinks.emailIconSize || ''}
                                onChange={handleIconSizeChange}
                                className="p-2 border rounded-lg w-24"
                                min="8"
                                max="64"
                            />
                            <span className="text-sm text-gray-500">pixels (e.g., 16)</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Controls the size of social icons in automated emails.</p>
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={handleSaveSocialLinks} disabled={isSavingSocial} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400">
                        {isSavingSocial ? <Loader className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        {isSavingSocial ? 'Saving...' : 'Save Social Links'}
                    </button>
                </div>
            </Section>

            <Section title="Guest Checkout Settings" icon={<Settings size={24} />}>
                <p className="text-sm text-gray-500 -mt-2">Control whether new guest users must verify their email or phone number with an OTP before they can complete a purchase.</p>
                
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold text-gray-700">For App Purchases</h4>
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium text-gray-800">Require Email OTP Verification</span>
                        <button
                            type="button"
                            onClick={() => handleToggleChange('appPurchase', 'requireEmailOtp')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checkoutSettings.appPurchase.requireEmailOtp ? 'bg-blue-600' : 'bg-gray-200'}`}
                            aria-pressed={checkoutSettings.appPurchase.requireEmailOtp}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checkoutSettings.appPurchase.requireEmailOtp ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium text-gray-800">Require Phone OTP Verification</span>
                        <button
                            type="button"
                            onClick={() => handleToggleChange('appPurchase', 'requirePhoneOtp')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checkoutSettings.appPurchase.requirePhoneOtp ? 'bg-blue-600' : 'bg-gray-200'}`}
                            aria-pressed={checkoutSettings.appPurchase.requirePhoneOtp}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checkoutSettings.appPurchase.requirePhoneOtp ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold text-gray-700">For Webinar Purchases</h4>
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium text-gray-800">Require Email OTP Verification</span>
                        <button
                            type="button"
                            onClick={() => handleToggleChange('webinarPurchase', 'requireEmailOtp')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checkoutSettings.webinarPurchase.requireEmailOtp ? 'bg-blue-600' : 'bg-gray-200'}`}
                            aria-pressed={checkoutSettings.webinarPurchase.requireEmailOtp}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checkoutSettings.webinarPurchase.requireEmailOtp ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                     <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium text-gray-800">Require Phone OTP Verification</span>
                         <button
                            type="button"
                            onClick={() => handleToggleChange('webinarPurchase', 'requirePhoneOtp')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checkoutSettings.webinarPurchase.requirePhoneOtp ? 'bg-blue-600' : 'bg-gray-200'}`}
                            aria-pressed={checkoutSettings.webinarPurchase.requirePhoneOtp}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checkoutSettings.webinarPurchase.requirePhoneOtp ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                </div>
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold text-gray-700">For Package Purchases</h4>
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium text-gray-800">Require Email OTP Verification</span>
                        <button
                            type="button"
                            onClick={() => handleToggleChange('packagePurchase', 'requireEmailOtp')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checkoutSettings.packagePurchase.requireEmailOtp ? 'bg-blue-600' : 'bg-gray-200'}`}
                            aria-pressed={checkoutSettings.packagePurchase.requireEmailOtp}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checkoutSettings.packagePurchase.requireEmailOtp ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <span className="font-medium text-gray-800">Require Phone OTP Verification</span>
                         <button
                            type="button"
                            onClick={() => handleToggleChange('packagePurchase', 'requirePhoneOtp')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checkoutSettings.packagePurchase.requirePhoneOtp ? 'bg-blue-600' : 'bg-gray-200'}`}
                            aria-pressed={checkoutSettings.packagePurchase.requirePhoneOtp}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checkoutSettings.packagePurchase.requirePhoneOtp ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                </div>
                 <div className="flex justify-end mt-4">
                    <button 
                        onClick={handleSaveCheckoutSettings} 
                        disabled={isSavingSettings}
                        className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400"
                    >
                        {isSavingSettings ? <Loader className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        Save Checkout Settings
                    </button>
                </div>
            </Section>
        </div>
    );
};

export default SiteContentManager;
