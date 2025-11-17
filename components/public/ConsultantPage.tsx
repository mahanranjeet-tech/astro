
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, functions } from '../../services/firebase.ts';
import type { UserProfile, NotificationType, Consultant, ConsultantPackage, ConsultantPageDefinition, CartItem, ConsultantPageSection, WebinarProduct, VideoTestimonial } from '../../types.ts';
import InitialLoadingScreen from '../shared/InitialLoadingScreen.tsx';
import { MapPin, MessageSquare, Award, Check, X, Zap, Wallet, Apple, Briefcase, Home, TrendingDown, Activity, Gavel, Skull, Target, XCircle, Compass, Pin, Infinity, SquareX, BaggageClaim as BagDollar, Hand, CheckCircle, ChevronDown, LogIn, ShoppingCart, Calendar, Clock, Globe, RadioReceiver, PlayCircle, Loader } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AppointmentBookingModal from './AppointmentBookingModal.tsx';
import CartButton from './CartButton.tsx';
import CartModal from './CartModal.tsx';
import type { AppliedCoupon } from './CartModal.tsx';
import GuestCheckoutModal from './GuestCheckoutModal.tsx';
import ManualPaymentQRModal from '../shared/ManualPaymentQRModal.tsx';
import GuestPaymentSuccess from './GuestPaymentSuccess.tsx';
import Footer from './Footer.tsx';
import VideoPlayerModal from './VideoPlayerModal.tsx';
import { getYoutubeVideoId } from '../../utils/url.ts';

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

// --- Reusable Section Components ---

const IconWrapper: React.FC<{ icon: string }> = ({ icon }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        "map-pin": <MapPin className="w-6 h-6 text-orange-500 flex-shrink-0 mr-3 mt-1" />,
        "message-square": <MessageSquare className="w-6 h-6 text-orange-500 flex-shrink-0 mr-3 mt-1" />,
        "award": <Award className="w-6 h-6 text-orange-500 flex-shrink-0 mr-3 mt-1" />,
        "check": <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1 mr-3" />,
        "x": <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-1 mr-3" />,
        "zap": <Zap className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1 mr-3" />,
        "wallet": <Wallet className="w-10 h-10 text-orange-500 flex-shrink-0 mb-3" />,
        "apple": <Apple className="w-10 h-10 text-orange-500 flex-shrink-0 mb-3" />,
        "briefcase": <Briefcase className="w-10 h-10 text-orange-500 flex-shrink-0 mb-3" />,
        "house": <Home className="w-10 h-10 text-orange-500 flex-shrink-0 mb-3" />,
        "trending-down": <TrendingDown className="w-10 h-10 text-red-500 mb-3" />,
        "activity": <Activity className="w-10 h-10 text-red-500 mb-3" />,
        "gavel": <Gavel className="w-10 h-10 text-red-500 mb-3" />,
        "skull": <Skull className="w-10 h-10 text-red-500 mb-3" />,
        "target": <Target className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1 mr-3" />,
        "x-circle": <XCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mr-3 mt-1" />,
        "compass": <Compass className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1 mr-3" />,
        "pin": <Pin className="w-6 h-6 text-red-500 flex-shrink-0 mt-1 mr-3" />,
        "infinity": <Infinity className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1 mr-3" />,
        "square-x": <SquareX className="w-6 h-6 text-green-600 flex-shrink-0 mt-1 mr-3" />,
        "bag-dollar": <BagDollar className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1 mr-3" />,
        "hand": <Hand className="w-5 h-5 text-orange-500 mb-2" />,
        "check-circle": <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1 mr-3" />,
    };
    return <>{iconMap[icon] || null}</>;
};

const renderMarkdownBold = (text: string) => {
    if (!text) return null;
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return <span dangerouslySetInnerHTML={{ __html: parts.map((part, index) => index % 2 === 1 ? `<strong>${part}</strong>` : part).join('') }} />;
};

interface ConsultantPageProps {
    slug: string;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    onPurchaseSuccess: (purchaseIdOrItems?: string | CartItem[]) => void;
    userProfile: UserProfile | 'loading' | null;
}

export const ConsultantPage: React.FC<ConsultantPageProps> = ({ slug, showNotification, onPurchaseSuccess, userProfile }) => {
    const [consultant, setConsultant] = useState<Consultant | null>(null);
    const [pageDef, setPageDef] = useState<ConsultantPageDefinition | null>(null);
    const [packages, setPackages] = useState<ConsultantPackage[]>([]);
    const [allWebinarProducts, setAllWebinarProducts] = useState<WebinarProduct[]>([]);
    const [videoTestimonials, setVideoTestimonials] = useState<VideoTestimonial[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [openFaqId, setOpenFaqId] = useState<string | null>(null);
    const [isStickyCtaVisible, setIsStickyCtaVisible] = useState(false);
    
    // Booking and Cart State
    const [selectedPackageForBooking, setSelectedPackageForBooking] = useState<ConsultantPackage | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showManualPayment, setShowManualPayment] = useState(false);
    const [manualPaymentItems, setManualPaymentItems] = useState<CartItem[]>([]);
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
    const [playingTestimonialId, setPlayingTestimonialId] = useState<string | null>(null);
    
    const [redirectInfo, setRedirectInfo] = useState<{ url: string; message: string } | null>(null);

    useEffect(() => {
        if (redirectInfo) {
            const timer = setTimeout(() => {
                window.location.href = redirectInfo.url;
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [redirectInfo]);

    useEffect(() => {
        const handleScroll = () => {
            const heroSection = document.querySelector('section');
            if (heroSection) {
                setIsStickyCtaVisible(window.scrollY > heroSection.offsetHeight / 2);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToPricing = () => {
        document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSlotSelected = (pkg: ConsultantPackage, date: string, time: string) => {
        const newItem: CartItem = {
            appId: `consultation_${consultant!.id}`,
            appName: pkg.name,
            appIcon: consultant!.profilePictureUrl || '',
            tierId: pkg.id,
            tierName: `${pkg.durationInMinutes} min session`,
            credits: 0,
            price: pkg.price,
            isConsultation: true,
            packageId: pkg.id,
            consultantId: consultant!.id,
            consultantName: consultant!.name,
            appointmentDate: date,
            appointmentTime: time,
            durationInMinutes: pkg.durationInMinutes,
        };
        setCart(prev => [...prev.filter(item => item.packageId !== pkg.id), newItem]); // Replace if already in cart
        showNotification(`${pkg.name} with slot booked added to cart!`, 'success');

        if (window.fbq) {
            window.fbq('track', 'AddToCart', {
                content_ids: [pkg.id],
                content_name: pkg.name,
                content_category: 'Consultation',
                content_type: 'product',
                currency: 'INR',
                value: (pkg.price / 100).toFixed(2),
            });
        }

        setSelectedPackageForBooking(null);
        setIsCartOpen(true);
    };
    
    const addToCart = useCallback((item: CartItem) => {
        if (item.isWebinar) {
            const isAlreadyInCart = cart.some(cartItem => cartItem.isWebinar && cartItem.appId === item.appId);
            if (isAlreadyInCart) {
                showNotification('This webinar is already in your cart.', 'info');
                setIsCartOpen(true);
                return;
            }
        }
        setCart(prev => [...prev, item]);
        showNotification(`${item.appName} added to cart`, 'success');

        if (window.fbq) {
            window.fbq('track', 'AddToCart', {
                content_ids: [item.isWebinar ? item.appId : item.tierId],
                content_name: item.appName,
                content_category: item.isWebinar ? 'Webinar' : 'Product',
                content_type: 'product',
                currency: 'INR',
                value: (item.price / 100).toFixed(2),
            });
        }

        setIsCartOpen(true);
    }, [cart, showNotification]);

    const removeFromCart = (index: number) => {
        setCart(prevCart => prevCart.filter((_, i) => i !== index));
    };
    
    const handlePurchase = async (details: { guestDetails?: { name: string; email: string; phone: string; password: string; }; referralCode?: string; }, finalCart: CartItem[]) => {
        if (finalCart.length === 0) {
            showNotification("Your cart is empty.", "error");
            return;
        }

        setIsProcessing(true);
        try {
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
                consultantId: consultant?.id,
            });
            const orderDetails = result.data as any;

            if (orderDetails.freeOrder) {
                setIsProcessing(false);
                setIsCartOpen(false);
                setShowGuestModal(false);
                setCart([]);
                setAppliedCoupon(null);

                if (orderDetails.consultationPurchaseId) {
                    sessionStorage.setItem(`pending_booking_${orderDetails.consultationPurchaseId}`, 'true');
                    onPurchaseSuccess(orderDetails.consultationPurchaseId);
                } else {
                    onPurchaseSuccess(finalCart);
                }
                showNotification(orderDetails.message || "Your free order was processed successfully!", "success");
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
                theme: { color: "#4F46E5" }, // Indigo color
                handler: (response: any) => {
                    const hasConsultation = finalCart.some(item => item.isConsultation);

                    // Universal cleanup
                    setIsCartOpen(false);
                    setShowGuestModal(false);
                    setCart([]);
                    setAppliedCoupon(null);
                    setIsProcessing(false);

                    if (hasConsultation && orderDetails.consultationPurchaseId) {
                        if (details.guestDetails) {
                            sessionStorage.setItem(`creds_${orderDetails.consultationPurchaseId}`, JSON.stringify({ email: details.guestDetails.email, phone: details.guestDetails.phone }));
                        }
                        // Set flag for both logged-in and guest users to trigger polling on the booking page
                        sessionStorage.setItem(`pending_booking_${orderDetails.consultationPurchaseId}`, 'true');
                        onPurchaseSuccess(orderDetails.consultationPurchaseId);
                    } else {
                        onPurchaseSuccess(finalCart);
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


    const handlePayOnline = () => {
        if (cart.length === 0) return;
        if (userProfile && userProfile !== 'loading') {
            handlePurchase({}, cart);
        } else {
            setShowGuestModal(true);
        }
    };

    const handleManualCheckout = () => {
        if (cart.length === 0) return;
        setManualPaymentItems(cart);
        setShowManualPayment(true);
        setIsCartOpen(false);
    };


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const consultantQuery = await db.collection('consultants').where('slug', '==', slug).limit(1).get();
                if (consultantQuery.empty) throw new Error("Consultant not found.");
                
                const consultantData = { ...consultantQuery.docs[0].data(), id: consultantQuery.docs[0].id } as Consultant;
                setConsultant(consultantData);

                const pageDefPromise = db.collection('consultant_pages').doc(consultantData.id).get();
                const packagesPromise = db.collection('consultants').doc(consultantData.id).collection('consultant_packages').orderBy('order').get();
                const webinarsPromise = db.collection('webinar_products').get();
                const videoTestimonialsPromise = db.collection('site_content').doc('live').get();

                const [pageDefSnap, packagesSnap, webinarsSnap, videoTestimonialsSnap] = await Promise.all([pageDefPromise, packagesPromise, webinarsPromise, videoTestimonialsPromise]);

                if (pageDefSnap.exists) {
                    setPageDef(pageDefSnap.data() as ConsultantPageDefinition);
                }

                const fetchedPackages = packagesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ConsultantPackage));
                setPackages(fetchedPackages);

                const fetchedWebinars = webinarsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as WebinarProduct));
                setAllWebinarProducts(fetchedWebinars);

                if (videoTestimonialsSnap.exists) {
                    const data = videoTestimonialsSnap.data();
                    setVideoTestimonials(data?.videoTestimonials || []);
                }

            } catch (err: any) {
                setError(err.message || "Failed to load page data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);
    
    const webinarSection = useMemo(() => pageDef?.sections.find(s => s.type === 'webinar'), [pageDef]);
    const webinarProduct = useMemo(() => {
        if (!webinarSection || !webinarSection.webinarProductId) return null;
        return allWebinarProducts.find(w => w.id === webinarSection.webinarProductId);
    }, [webinarSection, allWebinarProducts]);

    useEffect(() => {
        if (webinarProduct && window.fbq) {
            const webinarDate = new Date(webinarProduct.webinarDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const [hours, minutes] = webinarProduct.webinarTime.split(':');
            const timeDate = new Date();
            timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            const webinarTime = timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
            
            const contentName = `${webinarProduct.name} — ${webinarDate}, ${webinarTime}`;
            const value = (webinarProduct.price / 100);

            window.fbq('track', 'ViewContent', {
                content_name: contentName,
                content_category: 'webinar',
                value: value.toFixed(2),
                currency: 'INR'
            });
        }
    }, [webinarProduct]);

    const handleJoinWebinar = useCallback(() => {
        if (!webinarProduct) return;
        addToCart({
            appId: webinarProduct.id,
            appName: webinarProduct.name,
            appIcon: WEBINAR_ICON_SVG,
            tierId: 'webinar_purchase',
            tierName: 'Webinar Ticket',
            credits: 0,
            price: webinarProduct.price,
            isWebinar: true,
            webinarDate: webinarProduct.webinarDate,
            webinarTime: webinarProduct.webinarTime,
        });
    }, [webinarProduct, addToCart]);


    const renderSection = (section: ConsultantPageSection) => {
        switch(section.type) {
            case 'hero':
                if (!section.heroContent) return null;
                return (
                    <section className="pb-12 md:pb-20 text-center">
                        <div className="inline-block bg-yellow-200 text-indigo-950 text-xl font-bold px-8 py-3 rounded-xl mb-6 shadow-md">{section.heroContent.topBannerText}</div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-indigo-950 leading-tight mb-4" dangerouslySetInnerHTML={{ __html: section.heroContent.mainHeadline?.replace(/class="text-accent"/g, 'class="text-orange-500"') || '' }}></h1>
                        <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12">{section.heroContent.subHeadline}</p>
                        <div className="flex flex-col lg:flex-row gap-10 items-center justify-center">
                            <div className="lg:w-1/2 w-full flex flex-col items-center">
                                <div className="relative w-80 h-80 mb-[-8rem] z-10">
                                    <div className="absolute w-full h-full bg-yellow-300 rounded-full transform translate-x-2 translate-y-2"></div>
                                    <div className="absolute w-full h-full rounded-full bg-gray-200 overflow-hidden shadow-lg border-4 border-white">
                                        <img src={consultant?.profilePictureUrl} alt={consultant?.name} className="w-full h-full object-cover"/>
                                    </div>
                                </div>
                                <div className="bg-yellow-100 p-4 rounded-xl shadow-lg w-full max-w-sm text-center pt-[9rem]">
                                    <h3 className="text-2xl font-bold text-indigo-950">{consultant?.name}</h3>
                                    <p className="text-md font-semibold text-gray-700">{consultant?.experience}</p>
                                    <p className="text-sm italic text-gray-500 mt-1">{consultant?.qualifications}</p>
                                    <p className="text-sm italic text-gray-500">{consultant?.tagline1}</p>
                                    <p className="text-sm italic text-gray-500">{consultant?.tagline2}</p>
                                </div>
                            </div>
                             <div className="lg:w-1/2 w-full flex flex-col gap-6" id="consultancy-process">
                                <h2 className="text-3xl font-bold text-indigo-950 text-left">The 3-Step Consultancy Process</h2>
                                <div className="space-y-4">
                                    {(section.heroContent.processSteps || []).map(step => (
                                        <div key={step.id} className="bg-amber-50 p-4 rounded-xl shadow-lg border-2 border-yellow-300 text-left flex items-start">
                                            <IconWrapper icon="map-pin" />
                                            <div>
                                                <p className="font-semibold text-lg text-gray-800">{step.title}</p>
                                                <p className="text-gray-600 text-sm">{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={scrollToPricing} className="cta-button w-full text-xl font-bold bg-orange-500 text-white py-4 rounded-xl shadow-lg hover:bg-orange-600 mt-4">View Consultancy Packages Below</button>
                            </div>
                        </div>
                    </section>
                );
            case 'webinar': {
                if (!section.webinarProductId) return null;
                const webinarProduct = allWebinarProducts.find(w => w.id === section.webinarProductId);
                if (!webinarProduct) return null;

                const date = new Date(webinarProduct.webinarDate + 'T00:00:00');
                const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
                
                const [hours, minutes] = webinarProduct.webinarTime.split(':');
                const dateForTime = new Date();
                dateForTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                const formattedTime = dateForTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';

                const buttonText = webinarProduct.price === 0 ? 'Register Now for FREE' : `Register Now for ₹${(webinarProduct.price / 100).toFixed(2)}`;

                return (
                    <section className="py-12 my-12 bg-white rounded-2xl shadow-xl border border-gray-200">
                        <div className="max-w-3xl mx-auto px-4 text-center">
                            <h2 className="text-3xl font-bold text-orange-600 mb-2" dangerouslySetInnerHTML={{ __html: section.webinarTitle || 'Webinar Details' }}></h2>
                            <div className="w-16 h-1 bg-gray-200 mx-auto mb-8"></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                                <div className="bg-amber-50 p-4 rounded-xl shadow-md border border-amber-200 flex items-center gap-4">
                                    <div className="bg-orange-500 text-white p-3 rounded-lg"><Calendar size={24}/></div>
                                    <div><p className="font-bold text-orange-600 text-sm">Date</p><p className="font-bold text-lg text-black">{formattedDate}</p></div>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl shadow-md border border-amber-200 flex items-center gap-4">
                                    <div className="bg-orange-500 text-white p-3 rounded-lg"><Clock size={24}/></div>
                                    <div><p className="font-bold text-orange-600 text-sm">Time</p><p className="font-bold text-lg text-black">{formattedTime}</p></div>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl shadow-md border border-amber-200 flex items-center gap-4">
                                    <div className="bg-orange-500 text-white p-3 rounded-lg"><Globe size={24}/></div>
                                    <div><p className="font-bold text-orange-600 text-sm">Language</p><p className="font-bold text-lg text-black">{webinarProduct.language || 'English'}</p></div>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl shadow-md border border-amber-200 flex items-center gap-4">
                                    <div className="bg-orange-500 text-white p-3 rounded-lg"><RadioReceiver size={24}/></div>
                                    <div><p className="font-bold text-orange-600 text-sm">Venue</p><p className="font-bold text-lg text-black">{webinarProduct.venue || 'Live Online'}</p></div>
                                </div>
                            </div>
                            <button 
                                onClick={handleJoinWebinar}
                                className="w-full max-w-md bg-orange-500 text-white font-bold text-xl py-4 px-8 rounded-full shadow-lg hover:bg-orange-600 transition-transform hover:scale-105"
                            >
                                {buttonText}
                            </button>
                        </div>
                    </section>
                );
            }
            case 'video_testimonials': {
                const adminTestimonialIds = section.videoTestimonialIds || [];
                const adminTestimonials = videoTestimonials.filter(vt => adminTestimonialIds.includes(vt.id));
                const customTestimonials = section.customVideoTestimonials || [];
                const allTestimonialsToShow = [...adminTestimonials, ...customTestimonials].filter(vt => vt && getYoutubeVideoId(vt.url));
                
                if (allTestimonialsToShow.length === 0) return null;

                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{ __html: section.videoTestimonialsTitle || 'Hear from Our Clients' }}></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {allTestimonialsToShow.map(testimonial => {
                                const videoId = getYoutubeVideoId(testimonial.url)!;
                                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                return (
                                    <div key={testimonial.id || testimonial.url} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden group flex flex-col">
                                        {playingTestimonialId === (testimonial.id || testimonial.url) ? (
                                            <div className="relative aspect-video">
                                                <iframe
                                                    className="w-full h-full"
                                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                                                    title={`Testimonial from ${testimonial.name}`}
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        ) : (
                                            <div className="relative aspect-video cursor-pointer" onClick={() => setPlayingTestimonialId(testimonial.id || testimonial.url)}>
                                                <img src={thumbnailUrl} alt={`Testimonial from ${testimonial.name}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <PlayCircle size={48} className="text-white"/>
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-4 bg-gray-50 flex-grow">
                                            <div className="flex items-center gap-2">
                                                 <MessageSquare className="w-8 h-8 text-indigo-200 flex-shrink-0" fill="currentColor"/>
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
            case 'featured_in':
                return (
                    <section className="py-12 bg-indigo-950 rounded-xl my-12 shadow-2xl">
                        <h2 className="text-2xl font-bold text-center text-white mb-8">Featured In</h2>
                        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 px-4">
                            {(section.featuredInLogos || []).map(logo => (
                                <img key={logo.id} src={logo.imageUrl} alt={logo.altText} className="h-6 md:h-8 opacity-90 grayscale" />
                            ))}
                        </div>
                    </section>
                );
            case 'packages':
                return (
                    <section className="py-12 border-t border-gray-200" id="pricing-section">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{__html: section.packagesTitle?.replace(/class="text-accent"/g, 'class="text-orange-500"') || ''}} />
                        <p className="text-center text-xl text-gray-600 max-w-4xl mx-auto mb-12">{section.packagesSubTitle}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
                            {packages.map(pkg => {
                                const isPremium = pkg.isPopular;
                                const cardClasses = isPremium 
                                    ? "package-card-premium bg-white p-10 rounded-xl shadow-2xl border-4 border-orange-500 flex flex-col h-full relative"
                                    : "bg-white p-8 rounded-xl shadow-xl border-t-4 border-indigo-950/50 flex flex-col h-full";
                                
                                return (
                                    <div key={pkg.id} className={cardClasses}>
                                        {isPremium && (
                                            <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-xl font-bold text-sm tracking-wider">
                                                MOST POPULAR
                                            </div>
                                        )}
                                        <h3 className={`font-extrabold text-indigo-950 mb-2 ${isPremium ? 'text-3xl' : 'text-2xl'}`}>{pkg.name}</h3>
                                        <p className="text-gray-500 mb-6">{pkg.description}</p>
                                        <div className={`font-extrabold text-orange-500 mb-6 ${isPremium ? 'text-5xl' : 'text-4xl'}`}>
                                            {pkg.priceText || `₹${(pkg.price / 100).toLocaleString('en-IN')}`}
                                        </div>
                                        <ul className="space-y-3 text-left flex-grow mb-8">
                                            {(pkg.features || []).map(feature => {
                                                let icon, textClasses;
                                                switch (feature.type) {
                                                    case 'premium': icon = <IconWrapper icon="zap" />; textClasses = 'text-gray-700 font-semibold'; break;
                                                    case 'excluded': icon = <IconWrapper icon="x" />; textClasses = 'text-gray-400 line-through'; break;
                                                    default: icon = <IconWrapper icon="check" />; textClasses = 'text-gray-700';
                                                }
                                                return (
                                                    <li key={feature.id} className="flex items-start">
                                                        {icon}
                                                        <span className={textClasses}>{renderMarkdownBold(feature.text)}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                         <button
                                            onClick={() => {
                                                if (pkg.priceText) {
                                                    document.getElementById('consultancy-process')?.scrollIntoView({ behavior: 'smooth' });
                                                } else {
                                                    setSelectedPackageForBooking(pkg);
                                                }
                                            }}
                                            className={`cta-button w-full text-center rounded-xl shadow-lg ${
                                                isPremium 
                                                ? 'text-xl font-bold bg-orange-500 text-white py-4 hover:bg-orange-600'
                                                : 'text-lg font-bold bg-indigo-950 text-white py-3 hover:bg-indigo-700'
                                            }`}
                                        >
                                            {pkg.ctaText}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
             case 'benefits':
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{ __html: section.benefitsTitle?.replace(/class="text-accent"/g, 'class="text-orange-500"') || '' }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {(section.benefitsItems || []).map(item => (
                                <div key={item.id} className="bg-amber-50 p-6 rounded-xl shadow-lg border border-yellow-300">
                                    <IconWrapper icon={item.icon} />
                                    <h3 className="text-xl font-bold text-indigo-950 mb-2">{item.title}</h3>
                                    <p className="text-gray-700">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'problems':
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{ __html: section.problemsTitle?.replace(/class="text-accent"/g, 'class="text-orange-500"') || '' }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {(section.problemsItems || []).map(item => (
                                <div key={item.id} className="bg-amber-50 p-6 rounded-xl shadow-lg border border-yellow-300">
                                    <IconWrapper icon={item.icon} />
                                    <h3 className="text-xl font-bold text-indigo-950 mb-2">{item.title}</h3>
                                    <ul className="list-disc ml-6 text-gray-700 space-y-1">
                                        {(item.points || []).map((point, index) => <li key={index}>{point}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'delineation':
                if (!section.delineationContent) return null;
                return (
                     <section className="py-12 bg-indigo-950 text-white rounded-xl shadow-2xl my-12">
                        <div className="max-w-6xl mx-auto px-4">
                            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" dangerouslySetInnerHTML={{ __html: section.delineationContent.mainHeadline?.replace(/class="text-accent"/g, 'class="text-orange-500"') || '' }} />
                            <p className="text-center text-lg opacity-90 mb-10">{section.delineationContent.subHeadline}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(section.delineationContent.points || []).map(point => (
                                    <div key={point.id} className="bg-indigo-950 border-4 border-yellow-300 p-6 rounded-xl shadow-lg">
                                        <div className="flex items-start">
                                            <IconWrapper icon="target" />
                                            <p className="text-gray-200"><strong className="text-white">{point.title}:</strong> {renderMarkdownBold(point.description)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            case 'deliverables':
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{ __html: section.deliverablesTitle?.replace(/class="text-accent"/g, 'class="text-orange-500"') }}></h2>
                        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(section.deliverablesItems || []).map(item => (
                                <div key={item.id} className="bg-amber-50 p-6 rounded-xl shadow-lg border border-yellow-300 flex items-start">
                                    <IconWrapper icon={item.icon} />
                                    <p className="text-gray-700 font-medium">{renderMarkdownBold(item.description)}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'audience':
                return (
                    <section className="py-12 bg-indigo-950 rounded-xl shadow-2xl my-12">
                        <h2 className="text-3xl font-bold text-center text-white mb-10" dangerouslySetInnerHTML={{ __html: section.audienceTitle || '' }}></h2>
                        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(section.audienceItems || []).map(item => (
                                <div key={item.id} className="bg-indigo-950 border-4 border-yellow-300 text-white p-6 rounded-xl shadow-lg flex items-start">
                                    <IconWrapper icon="hand" />
                                    <p className="text-lg font-medium" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'about_coach':
                if (!consultant) return null;
                return (
                    <section className="py-12 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{ __html: section.aboutCoachTitle?.replace(/class="text-accent"/g, 'class="text-orange-500"') || `About ${consultant.name}` }}></h2>
                        <div className="bg-white p-8 rounded-xl shadow-2xl">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                <div className="max-w-xl mx-auto">
                                    <ul className="space-y-4">
                                        {(consultant.achievements || []).map(achievement => (
                                            <li key={achievement.id} className="flex items-start">
                                                <IconWrapper icon="check-circle" />
                                                <span className="text-gray-700">{achievement.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex justify-center items-center">
                                    <div className="relative w-64 h-64">
                                        <div className="absolute w-full h-full bg-yellow-300 rounded-full transform translate-x-2 translate-y-2"></div>
                                        <div className="absolute w-full h-full rounded-full bg-gray-200 overflow-hidden shadow-lg border-4 border-white">
                                            <img src={consultant.profilePictureUrl} alt={consultant.name} className="w-full h-full object-cover"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                );
            case 'faq':
                return (
                    <section className="py-12 border-t border-gray-200 mb-20">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{ __html: section.faqTitle || 'Frequently Asked Questions' }}></h2>
                        <div className="max-w-3xl mx-auto space-y-4">
                            {(section.faqItems || []).map(faq => (
                                <div key={faq.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                    <button className="w-full text-left p-5 flex justify-between items-center font-bold text-lg text-indigo-950 hover:bg-gray-50 transition" onClick={() => setOpenFaqId(prev => prev === faq.id ? null : faq.id)}>
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
            case 'social_connect': {
                const { title, whatsappGroupLink, facebookGroupLink } = section.socialConnectContent || {};
                if (!title || (!whatsappGroupLink && !facebookGroupLink)) return null;

                return (
                    <section className="py-12 border-t border-gray-200 text-center">
                        <h2 className="section-heading text-4xl mb-10 text-indigo-950" dangerouslySetInnerHTML={{ __html: title }}></h2>
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
            default: return null;
        }
    };
    
    const sortedSections = useMemo(() => pageDef?.sections ? [...pageDef.sections].sort((a,b) => a.order - b.order) : [], [pageDef]);

    if (loading) return <InitialLoadingScreen />;
    if (error || !consultant || !pageDef) return <div className="min-h-dvh flex flex-col"><main className="flex-grow flex items-center justify-center"><div className="text-center text-red-500 p-4">{error || 'Could not load page data.'}</div></main><Footer /></div>;

    return (
        <div className="antialiased font-sans bg-slate-50 text-slate-800">
            {redirectInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[101] flex flex-col items-center justify-center text-white p-4">
                    <Loader className="animate-spin h-12 w-12 text-white mb-4" />
                    <p className="text-2xl font-semibold">Payment Successful!</p>
                    <p className="mt-2 text-lg">{redirectInfo.message}</p>
                </div>
            )}
             {isStickyCtaVisible && (
                <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-lg p-3 z-40 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src={consultant.profilePictureUrl} alt={consultant.name} className="h-10 w-10 rounded-full object-cover" />
                        <span className="font-bold text-indigo-950">{consultant.name}</span>
                    </div>
                    <button onClick={scrollToPricing} className="cta-button text-sm font-bold bg-orange-500 text-white py-2 px-4 rounded-xl shadow-md hover:bg-orange-600">
                        View Packages
                    </button>
                </div>
            )}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                {sortedSections.map(section => (
                    <React.Fragment key={section.id}>{renderSection(section)}</React.Fragment>
                ))}
            </main>
            <Footer />

            {selectedPackageForBooking && (
                <AppointmentBookingModal
                    consultant={consultant}
                    pkg={selectedPackageForBooking}
                    onClose={() => setSelectedPackageForBooking(null)}
                    onSlotSelect={handleSlotSelected}
                />
            )}
            
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
                    allApps={[]}
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
        </div>
    );
};
