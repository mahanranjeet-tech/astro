import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, functions } from '../../services/firebase.ts';
import { ShoppingCart, Zap, Star, PlayCircle, Plus, Check, LogIn, ChevronDown, Video, Calendar, MessageCircle, Wallet, Apple, Briefcase, Home, TrendingDown, Activity, Gavel, Skull, Target, XCircle, Compass, Pin, Infinity, SquareX, BaggageClaim as BagDollar, Hand, CheckCircle as CheckCircleIcon, FileText, Clock, IndianRupee, User, MapPin, Award, X, Loader, RadioReceiver, Globe, Gift } from 'lucide-react';
import type { AppDefinition, Review, NotificationType, UserProfile, CartItem, PricingTier, LandingPageDefinition, LandingPageSectionType, WebinarProduct, VideoTestimonial, LandingPageSection } from '../../types.ts';
import InitialLoadingScreen from '../shared/InitialLoadingScreen.tsx';
import AppIcon from '../shared/AppIcon.tsx';
import StarRating from '../shared/StarRating.tsx';
import Footer from './Footer.tsx';
import VideoPlayerModal from './VideoPlayerModal.tsx';
import { getYoutubeVideoId } from '../../utils/url.ts';
import SocialProofToast from './SocialProofToast.tsx';
import CartButton from './CartButton.tsx';
import CartModal from './CartModal.tsx';
import type { AppliedCoupon } from './CartModal.tsx';
import GuestCheckoutModal from './GuestCheckoutModal.tsx';
import GuestPaymentSuccess from './GuestPaymentSuccess.tsx';
import ManualPaymentQRModal from '../shared/ManualPaymentQRModal.tsx';
import { formatDate } from '../../utils/date.ts';
import { v4 as uuidv4 } from 'uuid';

interface LandingPageProps {
    slug: string;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    // FIX: Corrected type to handle both string purchase IDs and CartItem arrays
    onPurchaseSuccess: (purchaseIdOrItems?: string | CartItem[]) => void;
    userProfile: UserProfile | 'loading' | null;
}

interface LandingPageContentProps extends Omit<LandingPageProps, 'slug'> {
    app: AppDefinition;
    allApps: AppDefinition[];
    allWebinarProducts: WebinarProduct[];
    pageDef: LandingPageDefinition | null;
    reviews: Review[];
    videoTestimonials: VideoTestimonial[];
}

const WEBINAR_ICON_SVG = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24' 24' fill='none' stroke='%234f46e5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3e%3c/rect%3e%3cline x1='16' y1='2' x2='16' y2='6'%3e%3c/line%3e%3cline x1='8' y1='2' x2='8' y2='6'%3e%3c/line%3e%3cline x1='3' y1='10' x2='21' y2='10'%3e%3c/line%3e%3c/svg%3e";

const loadRazorpayScript = () => new Promise<boolean>(resolve => {
    const scriptId = 'razorpay-checkout-js';
    if (document.getElementById(scriptId)) {
        return resolve(true);
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
        document.getElementById(scriptId)?.remove();
        resolve(false);
    };
    document.body.appendChild(script);
});

const VastuChakraSvg = () => (
    <svg className="w-full max-w-lg h-auto" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="50" width="400" height="400" rx="10" className="assistant-svg-outline" strokeWidth="3"/>
        <path d="M100 100H400V400H100V100Z" fill="#2d295b"/>
        <path d="M100 100L400 400M400 100L100 400" stroke="#4f478a" strokeWidth="1"/>
        <rect x="150" y="150" width="100" height="100" fill="#4f478a"/>
        <rect x="250" y="250" width="100" height="100" fill="#4f478a"/>
        <circle cx="250" cy="250" r="180" className="assistant-svg-outline" strokeWidth="2" opacity="0.6"/>
        <circle cx="250" cy="250" r="150" className="assistant-svg-inner" opacity="0.4"/>
        <text x="240" y="50" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">N</text>
        <text x="440" y="250" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">E</text>
        <text x="240" y="460" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">S</text>
        <text x="40" y="250" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">W</text>
        <circle cx="250" cy="250" r="5" className="assistant-svg-fill"/>
        <line x1="250" y1="250" x2="250" y2="70" className="assistant-svg-outline" strokeWidth="2"/>
        <line x1="250" y1="250" x2="430" y2="250" className="assistant-svg-outline" strokeWidth="2"/>
        <line x1="250" y1="250" x2="250" y2="430" className="assistant-svg-outline" strokeWidth="2"/>
        <line x1="250" y1="250" x2="70" y2="250" className="assistant-svg-outline" strokeWidth="2"/>
    </svg>
);

const IconWrapper: React.FC<{ icon: string; className?: string }> = ({ icon, className = "w-6 h-6" }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        "wallet": <Wallet className={className} />, "apple": <Apple className={className} />,
        "briefcase": <Briefcase className={className} />, "house": <Home className={className} />,
        "trending-down": <TrendingDown className={className} />, "activity": <Activity className={className} />,
        "gavel": <Gavel className={className} />, "skull": <Skull className={className} />,
        "target": <Target className={className} />, "x-circle": <XCircle className={className} />,
        "compass": <Compass className={className} />, "pin": <Pin className={className} />,
        "infinity": <Infinity className={className} />, "square-x": <SquareX className={className} />,
        "bag-dollar": <BagDollar className={className} />, "hand": <Hand className={className} />,
        "check-circle": <CheckCircleIcon className={className} />,
        "file-text": <FileText className={className} />, "clock": <Clock className={className} />,
        "indian-rupee": <IndianRupee className={className} />, "zap": <Zap className={className} />,
        "map-pin": <MapPin className={className} />, "award": <Award className={className} />,
        "check": <Check className={className} />, "x": <X className={className} />,
        "crosshair": <svg data-lucide="crosshair" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>,
        "ruler": <svg data-lucide="ruler" className={className}><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L3 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"></path><path d="m14.5 12.5 2-2"></path><path d="m11.5 9.5 2-2"></path><path d="m8.5 6.5 2-2"></path><path d="m17.5 15.5 2-2"></path></svg>,
        "users": <svg data-lucide="users" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
        "graduation-cap": <svg data-lucide="graduation-cap" className={className}><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>,
    };
    return <>{iconMap[icon] || null}</>;
};

const renderMarkdownBold = (text: string) => {
    if (!text) return null;
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return <span dangerouslySetInnerHTML={{ __html: parts.map((part, index) => index % 2 === 1 ? `<strong>${part}</strong>` : part).join('') }} />;
};

const LandingPageContent: React.FC<LandingPageContentProps> = ({ app, allApps, allWebinarProducts, pageDef, reviews, videoTestimonials, showNotification, onPurchaseSuccess, userProfile }) => {
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
    const [openFaqId, setOpenFaqId] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showGuestSuccess, setShowGuestSuccess] = useState(false);
    const [showManualPayment, setShowManualPayment] = useState(false);
    const [manualPaymentItems, setManualPaymentItems] = useState<CartItem[]>([]);
    const [redirectInfo, setRedirectInfo] = useState<{ url: string; message: string } | null>(null);

    useEffect(() => {
        // Ensure lucide icons are created after the component mounts/updates
        if (typeof (window as any).lucide !== 'undefined') {
            try {
                (window as any).lucide.createIcons();
            } catch (error) {
                console.error("Error creating lucide icons:", error);
            }
        }
    }, [pageDef]); // Re-run whenever the sections change to catch new icons

    const sectionsToRender = useMemo((): LandingPageSection[] => {
        // Case 1: New page definition with sections exists
        if (pageDef?.sections && pageDef.sections.length > 0) {
            return [...pageDef.sections].sort((a, b) => a.order - b.order);
        }
        
        // Case 2: Legacy page definition with sectionOrder exists (for migration)
        if (pageDef?.sectionOrder) {
            return pageDef.sectionOrder.map((type, index) => ({
                id: uuidv4(),
                type: type,
                order: index,
                // Pass all possible legacy override props to be safe
                whatItDoesOverride: pageDef.whatItDoesOverride,
                trainingVideoUrlsOverride: pageDef.trainingVideoUrlsOverride,
                pricingTierIdsOverride: pageDef.pricingTierIdsOverride,
                videoTestimonialIds: pageDef.videoTestimonialIdsOverride,
                webinarProductId: pageDef.webinarProductId,
            }));
        }

        // Case 3: No pageDef found, meaning it's a legacy page that should be built from the `app` definition.
        // It's also the fallback if pageDef exists but has no sections/sectionOrder.
        // A simple default order is used. The render functions will pick up data from `app`.
        const defaultOrder: LandingPageSectionType[] = ['whatItDoes', 'video', 'training', 'pricing', 'webinar', 'testimonials', 'videoTestimonials', 'faq'];
        return defaultOrder.map((type, index) => ({
            id: `legacy-default-${type}`,
            order: index,
            type: type,
        }));
    }, [pageDef]);

    const heroSection = useMemo(() => sectionsToRender.find(s => s.type === 'hero'), [sectionsToRender]);
    const mainWebinarId = useMemo(() => heroSection?.heroContent?.webinarId, [heroSection]);
    const mainWebinarProduct = useMemo(() => {
        if (!mainWebinarId) return null;
        return allWebinarProducts.find(w => w.id === mainWebinarId);
    }, [mainWebinarId, allWebinarProducts]);

    useEffect(() => {
        const webinarProductForEvent = mainWebinarProduct || allWebinarProducts.find(w => w.id === sectionsToRender.find(s => s.type === 'webinar')?.webinarProductId);
    
        if (webinarProductForEvent && window.fbq) {
            const webinarDate = new Date(webinarProductForEvent.webinarDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const [hours, minutes] = webinarProductForEvent.webinarTime.split(':');
            const timeDate = new Date();
            timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            const webinarTime = timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
            
            const contentName = `${webinarProductForEvent.name} — ${webinarDate}, ${webinarTime}`;
            const value = (webinarProductForEvent.price / 100);

            window.fbq('track', 'ViewContent', {
                content_name: contentName,
                content_category: 'webinar',
                value: value.toFixed(2),
                currency: 'INR'
            });
        }
    }, [mainWebinarProduct, allWebinarProducts, sectionsToRender]);


    useEffect(() => {
        if (redirectInfo) {
            const timer = setTimeout(() => {
                window.location.href = redirectInfo.url;
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [redirectInfo]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const total = reviews.reduce((sum, review) => sum + review.rating, 0);
        return total / reviews.length;
    }, [reviews]);
    
    const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));

    // Centralized webinar registration logic
    
    const handleGenericRegister = useCallback(() => {
        if (mainWebinarProduct) {
            const isWebinarInCart = cart.some(cartItem => cartItem.isWebinar);
            if (isWebinarInCart) {
                showNotification("You can only add one webinar ticket to your cart.", "info");
                setIsCartOpen(true);
                return;
            }

            const newItem: CartItem = {
                appId: mainWebinarProduct.id,
                appName: mainWebinarProduct.name,
                appIcon: WEBINAR_ICON_SVG,
                tierId: 'webinar_purchase',
                tierName: 'Webinar Ticket',
                credits: 0,
                price: mainWebinarProduct.price,
                isWebinar: true,
                webinarDate: mainWebinarProduct.webinarDate,
                webinarTime: mainWebinarProduct.webinarTime,
            };

            if (window.fbq) {
                window.fbq('track', 'AddToCart', {
                    content_ids: [mainWebinarProduct.id],
                    content_name: mainWebinarProduct.name,
                    content_type: 'product',
                    currency: 'INR',
                    value: (mainWebinarProduct.price / 100).toFixed(2),
                });
            }
            
            // Add to cart without showing success message
            setCart(prevCart => [...prevCart, newItem]);
            setShowGuestModal(true); // Directly open checkout modal
        } else {
            showNotification("Webinar registration details are not configured for this page.", "error");
        }
    }, [mainWebinarProduct, cart, showNotification, setIsCartOpen]);

    const handlePurchase = async (details: { guestDetails?: { name: string; email: string; phone: string; password: string; }; referralCode?: string; }, finalCart: CartItem[]) => {
        if (finalCart.length === 0) {
            showNotification("Your cart is empty.", "error");
            return;
        }

        setIsProcessing(true);
        try {
            const containsAppPurchase = finalCart.some(item => !item.isWebinar && !item.isConsultation);
            const isGuest = !userProfile || userProfile === 'loading';

            if (isGuest && details.guestDetails && containsAppPurchase) {
                const checkUserFn = functions.httpsCallable('checkIfUserExists');
                const checkResult = await checkUserFn({ email: details.guestDetails.email });
                if ((checkResult.data as { exists: boolean }).exists) {
                    showNotification('This email is already registered. Please log in to purchase apps.', 'error');
                    setIsProcessing(false);
                    return;
                }
            }
            
            const razorpayLoaded = await loadRazorpayScript();
            if (!razorpayLoaded || typeof (window as any).Razorpay === 'undefined') {
                showNotification("Could not load payment gateway. Please check your connection and try again.", "error");
                setIsProcessing(false);
                return;
            }

            const createRazorpayOrder = functions.httpsCallable('createRazorpayOrder');
            
            const result = await createRazorpayOrder({
                items: finalCart,
                guestDetails: details.guestDetails,
                couponCode: appliedCoupon?.code,
                referredBy: details.referralCode,
            });
            const orderDetails = result.data as any;

            if (orderDetails.freeOrder) {
                // This logic is for 100% discount scenarios
                setIsProcessing(false);
                setIsCartOpen(false);
                setShowGuestModal(false);
                setCart([]);
                setAppliedCoupon(null);
                
                const hasApp = finalCart.some(item => !item.isWebinar && !item.isConsultation);

                if (isGuest && hasApp) {
                    setShowGuestSuccess(true);
                } else {
                    onPurchaseSuccess(finalCart);
                    showNotification(orderDetails.message || "Your free order was processed successfully!", "success", 6000);
                }
                return;
            }

            const getPaymentConfig = functions.httpsCallable('getPaymentConfiguration');
            const rzpKey = ((await getPaymentConfig()).data as {keyId: string});

            const options = {
                key: rzpKey.keyId,
                amount: orderDetails.amount,
                currency: orderDetails.currency,
                name: "Powerful Tools Portal",
                description: orderDetails.description,
                order_id: orderDetails.razorpayOrderId,
                prefill: orderDetails.prefill,
                theme: { color: "#2563EB" },
                handler: (response: any) => {
                    const hasWebinar = finalCart.some(item => item.isWebinar);
                    const hasApp = finalCart.some(item => !item.isWebinar && !item.isConsultation);

                    // Universal cleanup
                    setIsCartOpen(false);
                    setShowGuestModal(false);
                    setCart([]);
                    setAppliedCoupon(null);
                    setIsProcessing(false);

                    if (isGuest && hasApp) {
                        setShowGuestSuccess(true); // Guest bought an app, show account creation success page.
                    } else {
                        // Logged-in user OR a guest who only bought a webinar (no account created)
                        onPurchaseSuccess(finalCart); // Shows the success checkmark animation for logged-in user
                        showNotification("Purchase complete! Check your email for details.", "success", 8000);
                    }
                },
                modal: { ondismiss: () => setIsProcessing(false) }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                showNotification(`Payment failed: ${response.error.description}. Please try again.`, "error");
                setIsProcessing(false);
            });
            
            rzp.open();

        } catch (error: any) {
            console.error("Error during purchase:", error);
            const errorMessage = error.details?.message || error.message || 'An unknown error occurred.';
            showNotification(`Checkout failed: ${errorMessage}`, 'error');
            setIsProcessing(false);
        }
    };

    const handlePayOnline = () => { if (cart.length > 0) setShowGuestModal(true); };
    const handleManualCheckout = () => { if (cart.length > 0) { setManualPaymentItems(cart); setShowManualPayment(true); setIsCartOpen(false); } };
    const handleToggleFaq = (faqId: string) => setOpenFaqId(prevId => (prevId === faqId ? null : faqId));
    
    const DetailCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
        <div className="bg-amber-50 p-2 rounded-lg shadow-md flex items-center gap-2">
            <div className="bg-orange-500 text-white p-2 rounded-md flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-orange-600">{label}</p>
                <p className="text-base font-bold text-indigo-950 leading-tight break-words">{value}</p>
            </div>
        </div>
    );
    
    const formatTime12hrIST = (time24: string) => {
        if (!time24) return 'TBD';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHours = h % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm} IST`;
    };
    
    const formatDateShortMonth = (dateString: string) => {
        if (!dateString) return 'TBD';
        // Add T00:00:00Z to ensure date is parsed as UTC and avoid timezone issues
        return new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    };

    const renderSection = (section: LandingPageSection) => {
        switch (section.type) {
             case 'hero': {
                const content = section.heroContent;
                if (!content) return null;
                const webinarProduct = allWebinarProducts.find(w => w.id === content.webinarId);
                return (
                    <section className="pb-8 md:pb-12 text-center">
                        <div className="inline-block bg-yellow-200 text-primary text-xl font-bold px-8 py-3 rounded-xl mb-6 shadow-md">{content.topBannerText}</div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary leading-tight mb-4" dangerouslySetInnerHTML={{ __html: content.mainHeadline || '' }}></h1>
                        <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12">{content.subHeadline}</p>
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 lg:items-center">
                            <div className="lg:w-7/12 w-full flex flex-col gap-4" id="registration-form">
                                <h2 className="text-xl font-bold text-primary text-center">Webinar Details</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailCard icon={<Calendar size={20}/>} label="Date" value={webinarProduct ? formatDateShortMonth(webinarProduct.webinarDate) : 'TBD'} />
                                    <DetailCard icon={<Clock size={20}/>} label="Time" value={webinarProduct ? formatTime12hrIST(webinarProduct.webinarTime) : 'TBD'} />
                                    <DetailCard icon={<Globe size={20}/>} label="Language" value={webinarProduct?.language || 'English+Hindi'} />
                                    <DetailCard icon={<RadioReceiver size={20}/>} label="Venue" value={webinarProduct?.venue || 'Zoho (Online Live)'} />
                                </div>
                                
                                <div className="bg-white p-4 rounded-xl shadow-2xl border-t-8 border-accent">
                                    <h2 className="text-xl font-bold text-primary mb-1 text-center">{content.registrationCtaTitle || 'Secure Your Spot!'}</h2>
                                    <p className="text-center text-red-500 font-semibold mb-3">{content.registrationCtaSubtext || 'Hurry Up - Limited Seats Left!'}</p>
                                    <button onClick={handleGenericRegister} className="cta-button w-full text-lg font-bold bg-accent text-white py-3 rounded-xl shadow-lg hover:bg-orange-600">Register Now</button>
                                    <div className="mt-3 text-center text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: content.priceText || ''}}></div>
                                    {(content.webinarDescriptionTitle || content.webinarDescription) && (
                                        <>
                                            <hr className="my-3" />
                                             <div className="bg-green-50/70 p-2 rounded-lg text-left">
                                                <div className="flex items-center gap-2">
                                                    <Gift size={24} className="text-green-700 flex-shrink-0"/>
                                                    <div>
                                                        <h3 className="font-semibold text-sm text-green-900 leading-tight">
                                                            {content.webinarDescriptionTitle}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5 mt-2 ml-1">
                                                    {(content.webinarDescription || '').split('\n').filter(line => line.trim() !== '').map((line, index) => (
                                                        <div key={index} className="flex items-start text-xs text-green-800">
                                                            <CheckCircleIcon size={14} className="mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                                                            <span>{line.replace(/^-/, '').trim()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                             <div className="lg:w-5/12 w-full flex flex-col items-center lg:self-center">
                                <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto mb-[-4rem] z-10">
                                    <div className="absolute w-full h-full bg-yellow-300 rounded-full transform translate-x-2 translate-y-2"></div>
                                    <div className="absolute w-full h-full rounded-full bg-gray-200 overflow-hidden shadow-lg border-4 border-white">
                                        <img src={content.coachProfilePictureUrl} alt={content.coachName} className="w-full h-full object-cover"/>
                                    </div>
                                </div>
                                <div className="bg-yellow-100 p-4 rounded-xl shadow-lg w-full max-w-sm pt-[5rem] text-center">
                                    <h3 className="text-xl font-bold text-primary">{content.coachName}</h3>
                                    <p className="text-base font-semibold text-gray-700">{content.coachExperience}</p>
                                    <div className="text-sm italic text-gray-500 mt-1 whitespace-pre-wrap">{content.coachQualifications}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                );
            }
             case 'featured_in': {
                if (!section.featuredInLogos || section.featuredInLogos.length === 0) return null;
                return (
                    <section className="py-12 bg-primary rounded-xl my-12 shadow-2xl">
                        <h2 className="text-2xl font-bold text-center text-white mb-8">Featured In</h2>
                        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 px-4">
                            {section.featuredInLogos.map(logo => (
                                <img key={logo.id} src={logo.imageUrl} alt={logo.altText} className="h-6 md:h-8 opacity-90 grayscale" />
                            ))}
                        </div>
                    </section>
                );
            }
             case 'benefits': {
                if (!section.benefitsItems || section.benefitsItems.length === 0) return null;
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-accent" dangerouslySetInnerHTML={{ __html: section.benefitsTitle || '' }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {section.benefitsItems.map(item => (
                                <div key={item.id} className="bg-warm p-6 rounded-xl shadow-lg border border-yellow-300">
                                    <IconWrapper icon={item.icon} className="w-10 h-10 text-accent flex-shrink-0 mb-3" />
                                    <h3 className="text-xl font-bold text-primary mb-2">{item.title}</h3>
                                    <p className="text-gray-700">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
            case 'vastu_assistant_hero': {
                const content = section.vastuAssistantHeroContent;
                if (!content) return null;
                return (
                    <section className="assistant-hero-bg py-12 md:py-24 rounded-xl shadow-2xl my-12">
                        <div className="container mx-auto px-6 flex flex-col-reverse md:flex-row items-center justify-between gap-12">
                            <div className="md:w-1/2 text-center md:text-left mt-10 md:mt-0">
                                <h2 className="text-4xl md:text-5xl font-extrabold leading-tight text-white" dangerouslySetInnerHTML={{ __html: content.title }}></h2>
                                <p className="mt-4 md:mt-6 text-xl text-gray-200">{content.description}</p>
                                <div className="mt-8 flex justify-center md:justify-start">
                                    <a href="#registration-form" className="cta-button bg-accent text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:bg-orange-600">{content.ctaText}</a>
                                </div>
                            </div>
                            <div className="md:w-1/2 flex justify-center md:justify-end">
                                <VastuChakraSvg />
                            </div>
                        </div>
                    </section>
                );
            }
            case 'vastu_assistant_features': {
                const content = section.vastuAssistantFeaturesContent;
                if (!content) return null;
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: content.keyBenefitsTitle }}></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                            {content.keyBenefits.map(benefit => (
                                <div key={benefit.id} className="bg-warm p-6 rounded-xl shadow-lg border border-yellow-300 text-center">
                                    <IconWrapper icon={benefit.icon} className="w-10 h-10 text-primary mx-auto mb-3" />
                                    <h3 className="text-xl font-bold text-primary mb-2">{benefit.title}</h3>
                                    <p className="mt-2 text-gray-700 text-sm">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                        
                        <h2 className="section-heading text-4xl mb-10 text-accent" dangerouslySetInnerHTML={{__html: content.modulesTitle}}></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {content.modules.map(module => (
                                <div key={module.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 text-left">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                         <IconWrapper icon={module.icon} className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-primary">{module.title}</h3>
                                    <p className="mt-2 text-gray-600">{module.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-10">
                            <button onClick={handleGenericRegister} className="cta-button text-xl font-bold bg-accent text-white py-3 px-10 rounded-xl hover:bg-orange-600">{content.ctaText}</button>
                        </div>
                    </section>
                );
            }
             case 'text_block': {
                const content = section.textBlockContent;
                if (!content) return null;
                return (
                    <section className="py-12 border-t border-gray-200">
                        <div className="max-w-3xl mx-auto text-center">
                            <h2 className="text-4xl font-bold text-primary mb-6" dangerouslySetInnerHTML={{ __html: content.title }}></h2>
                            <div className="prose prose-lg mx-auto text-gray-700" dangerouslySetInnerHTML={{ __html: content.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
                            {content.ctaButtonText && (
                                <div className="mt-8">
                                    <button onClick={handleGenericRegister} className="cta-button text-xl font-bold bg-accent text-white py-3 px-10 rounded-xl hover:bg-orange-600">
                                        {content.ctaButtonText}
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                );
            }
            case 'problems': {
                if (!section.problemsItems || section.problemsItems.length === 0) return null;
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: section.problemsTitle || '' }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {(section.problemsItems || []).map(item => (
                                <div key={item.id} className="bg-warm p-6 rounded-xl shadow-lg border border-yellow-300">
                                    <IconWrapper icon={item.icon} className="w-10 h-10 text-red-500 mb-3" />
                                    <h3 className="text-xl font-bold text-primary mb-2">{item.title}</h3>
                                    <ul className="list-disc ml-6 text-gray-700 space-y-1">
                                        {(item.points || []).map((point, index) => <li key={index}>{point}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
            case 'delineation': {
                if (!section.delineationContent) return null;
                return (
                     <section className="py-12 bg-primary text-white rounded-xl shadow-2xl my-12">
                        <div className="max-w-6xl mx-auto px-4">
                            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" dangerouslySetInnerHTML={{ __html: section.delineationContent.mainHeadline || '' }} />
                            <p className="text-center text-lg opacity-90 mb-10">{section.delineationContent.subHeadline}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(section.delineationContent.points || []).map(point => (
                                    <div key={point.id} className="bg-primary border-4 border-yellow-300 p-6 rounded-xl shadow-lg">
                                        <div className="flex items-start">
                                            <IconWrapper icon="target" className="w-6 h-6 text-accent flex-shrink-0 mt-1 mr-3" />
                                            <p className="text-gray-200"><strong className="text-white">{point.title}:</strong> {renderMarkdownBold(point.description)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            }
             case 'what_you_learn': {
                 if (!section.whatYouLearnItems || section.whatYouLearnItems.length === 0) return null;
                 return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: section.whatYouLearnTitle || '' }} />
                        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(section.whatYouLearnItems || []).map(item => (
                                <div key={item.id} className="bg-warm p-6 rounded-xl shadow-lg border border-yellow-300 flex items-start">
                                    <IconWrapper icon={item.icon} className="w-6 h-6 text-accent flex-shrink-0 mt-1 mr-3" />
                                    <p className="text-gray-700 font-medium">{renderMarkdownBold(item.description)}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
             case 'audience': {
                if (!section.audienceItems || section.audienceItems.length === 0) return null;
                return (
                    <section className="py-12 bg-primary rounded-xl shadow-2xl my-12">
                        <h2 className="text-3xl font-bold text-center text-white mb-10" dangerouslySetInnerHTML={{ __html: section.audienceTitle || '' }} />
                        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(section.audienceItems || []).map(item => (
                                <div key={item.id} className="bg-primary border-4 border-yellow-300 text-white p-6 rounded-xl shadow-lg flex items-start">
                                    <IconWrapper icon="hand" className="w-5 h-5 text-accent mr-3 mt-1 flex-shrink-0"/>
                                    <p className="text-lg font-medium" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
            case 'about_coach': {
                const heroSection = sectionsToRender.find(s => s.type === 'hero');
                const heroContent = heroSection?.heroContent;
                if (!section.aboutCoachAchievements || section.aboutCoachAchievements.length === 0 || !heroContent) return null;
                
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: section.aboutCoachTitle || '' }} />
                        <div className="bg-white p-8 rounded-xl shadow-2xl">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                <div className="max-w-xl mx-auto">
                                    <ul className="space-y-4">
                                        {(section.aboutCoachAchievements).map(achievement => (
                                            <li key={achievement.id} className="flex items-start">
                                                <IconWrapper icon="check-circle" className="w-6 h-6 text-green-600 flex-shrink-0 mt-1 mr-3" />
                                                <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: achievement.text }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex justify-center items-center">
                                    <div className="relative w-64 h-64">
                                        <div className="absolute w-full h-full bg-yellow-300 rounded-full transform translate-x-2 translate-y-2"></div>
                                        <div className="absolute w-full h-full rounded-full bg-gray-200 overflow-hidden shadow-lg border-4 border-white">
                                            <img src={heroContent.coachProfilePictureUrl} alt={heroContent.coachName} className="w-full h-full object-cover"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                );
            }
            case 'faq': {
                if (!section.faqItems || section.faqItems.length === 0) return null;
                return (
                    <section className="py-12 border-t border-gray-200 mb-20">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: section.faqTitle || '' }} />
                        <div className="max-w-3xl mx-auto space-y-4">
                            {section.faqItems.map(faq => (
                                <div key={faq.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                    <button className="w-full text-left p-5 flex justify-between items-center font-bold text-lg text-primary hover:bg-gray-50 transition" onClick={() => handleToggleFaq(faq.id)}>
                                        {faq.question}
                                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${openFaqId === faq.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${openFaqId === faq.id ? 'max-h-96' : 'max-h-0'}`}>
                                        <div className="p-5 pt-0 text-gray-600"><p>{faq.answer}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
            case 'social_connect': {
                if (!section.socialConnectContent) return null;
                const { title, whatsappGroupLink, facebookGroupLink } = section.socialConnectContent;
                if (!whatsappGroupLink && !facebookGroupLink) return null;

                return (
                    <section className="py-12 border-t border-gray-200 text-center">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: title }}></h2>
                        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                            {whatsappGroupLink && (
                                <a href={whatsappGroupLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-lg font-bold bg-green-500 text-white rounded-xl shadow-lg hover:bg-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.847 6.037l-.299 1.098 1.146-.304zM12.042 6.582c-.131-.002-.262.019-.388.064-.126.045-.246.113-.355.201l-.111.096c-.104.087-.2.188-.285.297l-.09.117c-.081.104-.15.215-.208.332l-.066.132c-.053.112-.095.23-.127.352l-.042.149c-.025.093-.042.189-.052.285l-.014.129c-.005.046-.007.093-.007.139v.001c0 .123.018.246.053.366l.049.12c.036.088-.08.172.132.253l.069.102c.058.082-.124.159.198.229l.096.084c.075.061-.156.115.241.162l.108.056c.097.045-.2.08-.307.106l.128.029c.096.019.194.029.292.029h.001c.125-.002.25-.024.37-.067l.12-.044c.109-.04.212-.095.309-.163l.112-.078c.097-.07.186-.152.266-.245l.092-.107c.074-.09.139-.188.193-.292l.067-.13c.05-.101.09-.208.119-.319l.04-.14c.023-.087.038-.175.046-.264l.01-.122c.003-.046.003-.092.002-.138v-.002c0-.126-.018-.252-.053-.372l-.048-.119c-.037-.088-.08-.173-.132-.254l-.069-.102c-.058-.082-.124-.159-.198-.229l-.096-.084c-.075-.061-.156-.115-.241-.162l-.108-.056c-.097-.045-.2-.08-.307-.106l-.128-.029c-.096-.019-.194-.029-.292-.029zM16.48 14.945c-.144-.08-.847-.418-1.002-.465-.155-.047-.267-.071-.38.071-.112.142-.379.465-.465.56-.085.095-.17.107-.314.035-.144-.071-.607-.224-1.157-.714-.49-.429-.812-.961-.907-1.127-.095-.167-.012-.257.06-.344.06-.071.142-.182.214-.274a1.94 1.94 0 0 0 .142-.238c.024-.047.012-.095-.012-.167-.024-.071-.214-.51-.297-.682-.085-.17-.17-.142-.238-.142-.06 0-.142 0-.214 0-.071 0-.19.024-.285.118-.095.095-.379.356-.379.879 0 .523.391 1.021.447 1.093.056.071.759 1.173 1.84 1.622.257.109.467.173.654.22.3.072.576.06.78.035.228-.035.708-.288.81-.56.101-.27.101-.51.07-.56-.036-.047-.148-.071-.292-.142z"/></svg>
                                    Join WhatsApp Group
                                </a>
                            )}
                            {facebookGroupLink && (
                                <a href={facebookGroupLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-lg font-bold bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path></svg>
                                    Join Facebook Group
                                </a>
                            )}
                        </div>
                    </section>
                );
            }
             case 'reviews': {
                if (reviews.length === 0) return null;
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: section.reviewsTitle || 'What Our Users Say' }}></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {reviews.map(review => (
                                <div key={review.id} className="bg-warm p-6 rounded-xl shadow-lg border border-yellow-300">
                                    <div className="flex items-center mb-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center mr-4"><User size={24} className="text-primary"/></div>
                                        <div>
                                            <p className="font-bold text-primary">{review.userName}</p>
                                            <StarRating rating={review.rating} setRating={() => {}} size={16} disabled={true} />
                                        </div>
                                    </div>
                                    <p className="text-gray-700 italic">"{review.review}"</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }
             case 'videoTestimonials': {
                const testimonialIds = section.videoTestimonialIds || (pageDef?.videoTestimonialIdsOverride) || [];
                const testimonialsToShow = videoTestimonials.filter(vt => testimonialIds.includes(vt.id) && getYoutubeVideoId(vt.url));
                if (testimonialsToShow.length === 0) return null;
                 return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-primary" dangerouslySetInnerHTML={{ __html: section.videoTestimonialsTitle || 'Hear From Our Clients' }}></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {testimonialsToShow.map(testimonial => {
                                const videoId = getYoutubeVideoId(testimonial.url)!;
                                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                return (
                                    <div key={testimonial.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden group cursor-pointer flex flex-col" onClick={() => setPlayingVideoUrl(testimonial.url)}>
                                        <div className="relative aspect-video">
                                            <img src={thumbnailUrl} alt={`Testimonial from ${testimonial.name}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayCircle size={48} className="text-white"/>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 flex-grow">
                                            <div className="flex items-center gap-2">
                                                 <MessageCircle className="w-8 h-8 text-indigo-200 flex-shrink-0" fill="currentColor"/>
                                                <div>
                                                    <p className="font-bold text-slate-800">{testimonial.name}</p>
                                                    <p className="text-sm text-slate-500">{testimonial.place}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            }
             default:
                return null;
        }
    };
    
    // ... rest of the component from previous implementation
    return (
        <div className="antialiased font-sans">
            {redirectInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[101] flex flex-col items-center justify-center text-white p-4">
                    <Loader className="animate-spin h-12 w-12 text-white mb-4" />
                    <p className="text-2xl font-semibold">Payment Successful!</p>
                    <p className="mt-2 text-lg">{redirectInfo.message}</p>
                </div>
            )}
            <div className={redirectInfo ? 'blur-sm' : ''}>
                <SocialProofToast />
                
                {cart.length > 0 && <CartButton cart={cart} onOpenCart={() => setIsCartOpen(true)} />}

                {isCartOpen && (
                    <CartModal
                        cart={cart}
                        onClose={() => setIsCartOpen(false)}
                        onRemoveItem={removeFromCart}
                        onPayOnline={handlePayOnline}
                        onPayManually={handleManualCheckout}
                        isProcessing={isProcessing}
                        showNotification={showNotification}
                        appliedCoupon={appliedCoupon}
                        setAppliedCoupon={setAppliedCoupon}
                    />
                )}

                {showGuestModal && (
                    <GuestCheckoutModal
                        cart={cart}
                        appliedCoupon={appliedCoupon}
                        onClose={() => setShowGuestModal(false)}
                        onPurchase={handlePurchase}
                        isProcessing={isProcessing}
                        showNotification={showNotification}
                        userProfile={userProfile && userProfile !== 'loading' ? userProfile : null}
                        allApps={allApps}
                        allWebinarProducts={allWebinarProducts}
                    />
                )}
                
                <ManualPaymentQRModal
                    isOpen={showManualPayment}
                    onClose={() => {
                        setShowManualPayment(false);
                        setCart([]);
                        setAppliedCoupon(null);
                    }}
                    items={manualPaymentItems}
                    isGuest={!userProfile || userProfile === 'loading'}
                />

                {playingVideoUrl && (
                    <VideoPlayerModal videoUrl={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />
                )}
                
                {showGuestSuccess && (
                     <div className="fixed inset-0 bg-white z-[100] flex flex-col">
                         <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
                            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
                                <GuestPaymentSuccess />
                            </main>
                            <Footer />
                        </div>
                    </div>
                )}
                
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-0">
                    {sectionsToRender.map(section => (
                        <React.Fragment key={section.id}>{renderSection(section)}</React.Fragment>
                    ))}
                </main>
                <Footer />
            </div>
        </div>
    );
};

const LandingPage: React.FC<LandingPageProps> = (props) => {
    const { slug, showNotification } = props;
    const [app, setApp] = useState<AppDefinition | null>(null);
    const [pageDef, setPageDef] = useState<LandingPageDefinition | null>(null);
    const [allApps, setAllApps] = useState<AppDefinition[]>([]);
    const [allWebinarProducts, setAllWebinarProducts] = useState<WebinarProduct[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [videoTestimonials, setVideoTestimonials] = useState<VideoTestimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all apps and webinars once
                const appsPromise = db.collection('apps').get();
                const webinarsPromise = db.collection('webinar_products').get();
                const videoTestimonialsPromise = db.collection('site_content').doc('live').get();

                const [appsSnapshot, webinarsSnapshot, videoTestimonialsSnap] = await Promise.all([appsPromise, webinarsPromise, videoTestimonialsPromise]);
                const fetchedApps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppDefinition));
                const fetchedWebinars = webinarsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebinarProduct));
                const fetchedVideoTestimonials = videoTestimonialsSnap.exists ? (videoTestimonialsSnap.data()?.videoTestimonials || []) : [];


                setAllApps(fetchedApps);
                setAllWebinarProducts(fetchedWebinars);
                setVideoTestimonials(fetchedVideoTestimonials);

                // Find the specific page/app by slug
                const pageQuery = db.collection('landingPages').where('slug', '==', slug).limit(1);
                const pageSnapshot = await pageQuery.get();

                let targetApp: AppDefinition | undefined;
                if (!pageSnapshot.empty) {
                    const pageData = { id: pageSnapshot.docs[0].id, ...pageSnapshot.docs[0].data() } as LandingPageDefinition;
                    setPageDef(pageData);
                    targetApp = fetchedApps.find(a => a.id === pageData.appId);
                    if (!targetApp) throw new Error("Associated application not found.");
                } else {
                    targetApp = fetchedApps.find(a => a.slug === slug && a.hasLandingPage);
                    if (!targetApp) throw new Error("Page not found.");
                    setPageDef(null); // Explicitly null for legacy pages
                }
                setApp(targetApp);

                // Fetch reviews for the target app
                const reviewsSnapshot = await db.collection('reviews').where('appId', '==', targetApp.id).get();
                const fetchedReviews = reviewsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review));
                setReviews(fetchedReviews);

            } catch (err: any) {
                console.error(`[fetchPageData] Error for slug "${slug}":`, err);
                setError(err.message || "Failed to load page data.");
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [slug, showNotification]);

    if (loading) {
        return <InitialLoadingScreen />;
    }

    if (error || !app) {
        return (
            <div className="min-h-dvh flex flex-col">
                <main className="flex-grow flex items-center justify-center">
                    <div className="text-center p-4">
                        <h1 className="text-2xl font-bold text-red-600">Page Not Found</h1>
                        <p className="text-gray-600 mt-2">{error || 'The page you are looking for does not exist.'}</p>
                        <a href="/" className="mt-6 inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Go to Homepage</a>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <LandingPageContent
            {...props}
            app={app}
            allApps={allApps}
            allWebinarProducts={allWebinarProducts}
            pageDef={pageDef}
            reviews={reviews}
            videoTestimonials={videoTestimonials}
        />
    );
};

export default LandingPage;