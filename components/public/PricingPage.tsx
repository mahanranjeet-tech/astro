import React, { useState, useEffect, useMemo } from 'react';
import { db, functions } from '../../services/firebase.ts';


import PublicPageLayout from './PublicPageLayout.tsx';
import InitialLoadingScreen from '../shared/InitialLoadingScreen.tsx';
import type { AppDefinition, NotificationType, UserProfile, PricingTier, CartItem, WebinarProduct } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';
import { Zap, ShoppingCart, Loader, Plus, PlayCircle } from 'lucide-react';
import GuestCheckoutModal from './GuestCheckoutModal.tsx';
import CartButton from './CartButton.tsx';
import CartModal from './CartModal.tsx';
import type { AppliedCoupon } from './CartModal.tsx';
import GuestPaymentSuccess from './GuestPaymentSuccess.tsx';
import VideoPlayerModal from './VideoPlayerModal.tsx';
import { getYoutubeVideoId } from '../../utils/url.ts';
import TruncatedText from '../shared/TruncatedText.tsx';
import ManualPaymentQRModal from '../shared/ManualPaymentQRModal.tsx';

interface PricingPageProps {
    userProfile: UserProfile | 'loading' | null;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    // FIX: Corrected type to handle both string purchase IDs and CartItem arrays
    onPurchaseSuccess: (purchaseIdOrItems?: string | CartItem[]) => void;
}

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

export const PricingPage: React.FC<PricingPageProps> = ({ userProfile, showNotification, onPurchaseSuccess }) => {
    const [allApps, setAllApps] = useState<AppDefinition[]>([]);
    const [allWebinarProducts, setAllWebinarProducts] = useState<WebinarProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showGuestSuccess, setShowGuestSuccess] = useState(false);
    
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

    const [showManualPayment, setShowManualPayment] = useState(false);
    const [manualPaymentItems, setManualPaymentItems] = useState<CartItem[]>([]);
    
    const [redirectInfo, setRedirectInfo] = useState<{ url: string; message: string } | null>(null);

    useEffect(() => {
        if (redirectInfo) {
            const timer = setTimeout(() => {
                window.location.href = redirectInfo.url;
            }, 3000); // 3-second delay
            return () => clearTimeout(timer);
        }
    }, [redirectInfo]);


    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const appsPromise = db.collection('apps').get();
                const webinarsPromise = db.collection('webinar_products').get();


                const [appsSnapshot, webinarsSnapshot] = await Promise.all([appsPromise, webinarsPromise]);
                
                const fetchedApps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppDefinition));
                setAllApps(fetchedApps);

                const fetchedWebinars = webinarsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebinarProduct));
                setAllWebinarProducts(fetchedWebinars);
                

            } catch (error: any) {
                if (error.code === 'unavailable') {
                    console.warn("Could not fetch page data while offline:", error.message);
                    showNotification("You are offline. Content may not be up to date.", "info");
                } else {
                    console.error("Error fetching page data:", error);
                    showNotification('Could not load page content.', 'error');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [showNotification]);

    const availableApps = useMemo(() => {
        return allApps
            .filter(app => !app.comingSoon)
            .map(app => ({
                ...app,
                pricingTiers: (app.pricingTiers || []).filter(tier => 
                    tier.id && 
                    tier.name && 
                    tier.price > 0 && 
                    tier.credits >= 0 &&
                    (!tier.isWebinarAddon || tier.isPublic)
                )
            }))
            .filter(app => (app.pricingTiers && app.pricingTiers.length > 0) || app.marketingVideoUrl);
    }, [allApps]);

    const comingSoonApps = useMemo(() => {
        return allApps.filter(app => app.comingSoon);
    }, [allApps]);
    
    const addToCart = (app: AppDefinition, tier: PricingTier) => {
        const newItem: CartItem = {
            appId: app.id,
            appName: app.name,
            appIcon: app.icon,
            tierId: tier.id,
            tierName: tier.name,
            credits: tier.credits,
            price: tier.price
        };
        setCart(prevCart => [...prevCart, newItem]);
        showNotification(`${tier.name} for ${app.name} added to cart`, 'success');

        if (window.fbq) {
            window.fbq('track', 'AddToCart', {
                content_ids: [tier.id],
                content_name: `${app.name} - ${tier.name}`,
                content_type: 'product',
                currency: 'INR',
                value: (tier.price / 100).toFixed(2),
            });
        }
    };

    const removeFromCart = (index: number) => {
        const removedItem = cart[index];
        setCart(prevCart => prevCart.filter((_, i) => i !== index));

        if (appliedCoupon && appliedCoupon.appIds.includes(removedItem.appId)) {
            const remainingApplicableItems = cart.filter(item => item.appId !== removedItem.appId && appliedCoupon.appIds.includes(item.appId));
            if (remainingApplicableItems.length === 0) {
                setAppliedCoupon(null);
                 showNotification("Coupon removed as applicable item was taken from cart.", "info");
            }
        }
    };
    
    const handlePurchase = async (details: { guestDetails?: { name: string, email: string, password: string }, referralCode?: string }, finalCart: CartItem[]) => {
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
                if (orderDetails.webinarLink) {
                    setIsCartOpen(false);
                    setShowGuestModal(false);
                    const containsApp = finalCart.some(item => !item.isWebinar);
                    const message = containsApp ? "Purchase successful! Your login credentials have been emailed. Redirecting to the webinar..." : "Purchase successful! Redirecting you to the webinar...";
                    setRedirectInfo({ url: orderDetails.webinarLink, message });
                } else {
                    setIsCartOpen(false);
                    setShowGuestModal(false);
                    setCart([]);
                    setAppliedCoupon(null);
                    if (userProfile && userProfile !== 'loading') {
                        onPurchaseSuccess(finalCart);
                    } else {
                        setShowGuestSuccess(true);
                    }
                    setIsProcessing(false);
                    showNotification(orderDetails.message || "Your free order was processed successfully!", "success");
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
                    if (orderDetails.webinarLink) {
                        setIsCartOpen(false);
                        setShowGuestModal(false);
                        const containsApp = finalCart.some(item => !item.isWebinar);
                        const message = containsApp ? "Purchase successful! Your credentials have been emailed. Redirecting to the webinar..." : "Purchase successful! Redirecting you to the webinar...";
                        setRedirectInfo({ url: orderDetails.webinarLink, message });
                    } else {
                        setIsCartOpen(false);
                        setShowGuestModal(false);
                        setCart([]);
                        setAppliedCoupon(null);
                        if (userProfile && userProfile !== 'loading') {
                            onPurchaseSuccess(finalCart);
                        } else {
                            setShowGuestSuccess(true);
                        }
                        setIsProcessing(false);
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
    
    const handleManualCheckout = () => {
        if (cart.length === 0) {
            showNotification("Your cart is empty.", "error");
            return;
        }

        // Apply discount to each applicable item for display in the modal
        const itemsForModal = cart.map(item => {
            if (appliedCoupon && appliedCoupon.appIds.includes(item.appId)) {
                const discountedPrice = item.price * (1 - appliedCoupon.discountPercentage / 100);
                return { ...item, price: Math.round(discountedPrice) };
            }
            return item;
        });

        setManualPaymentItems(itemsForModal);
        setShowManualPayment(true);
        setIsCartOpen(false);
        setShowGuestModal(false);
    };

    const handlePayOnline = () => {
        if (cart.length === 0) {
            showNotification("Your cart is empty.", "error");
            return;
        }
        setShowGuestModal(true);
    };

    if (loading) return <InitialLoadingScreen />;
    
    return (
        <div className={redirectInfo ? 'blur-sm' : ''}>
            {redirectInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[101] flex flex-col items-center justify-center text-white p-4">
                    <svg className="animate-spin h-12 w-12 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-2xl font-semibold">Payment Successful!</p>
                    <p className="mt-2 text-lg">{redirectInfo.message}</p>
                </div>
            )}
            <PublicPageLayout title="Apps and Pricing" icon={<Zap size={28} />}>
                <p className="text-center -mt-4 mb-12 text-lg text-slate-600 max-w-3xl mx-auto">
                    Explore our suite of powerful tools. Watch a demo, then choose a credit pack to get started and unlock your potential.
                </p>
                
                {availableApps.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {availableApps.map(app => (
                            <div key={app.id} className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
                                {/* App Info Header */}
                                <div className="p-5">
                                    <div className="flex items-start gap-4 mb-3">
                                        <AppIcon icon={app.icon} name={app.name} className="h-10 w-10 rounded-lg flex-shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-800 leading-tight">{app.name}</h3>
                                            {app.marketingVideoUrl && getYoutubeVideoId(app.marketingVideoUrl) && (
                                                <button 
                                                    onClick={() => setPlayingVideoUrl(app.marketingVideoUrl!)} 
                                                    className="mt-1 flex items-center gap-1.5 py-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                                >
                                                    <PlayCircle size={16} />
                                                    How It Works
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <TruncatedText text={app.description || 'No description available.'} maxLength={100} />
                                </div>

                                {/* Pricing Tiers Body */}
                                {app.pricingTiers && app.pricingTiers.length > 0 ? (
                                    <div className="px-5 py-4 bg-gray-50/70 border-t flex-grow">
                                         <div className="space-y-2">
                                            {app.pricingTiers.map(tier => (
                                                <div key={tier.id} className="p-2 rounded-md bg-white border">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-semibold text-gray-700 text-sm">{tier.name}</p>
                                                             {tier.credits === 0 ? (
                                                                <>
                                                                    <p className="text-xs text-blue-600 font-mono">Unlimited credits</p>
                                                                    {app.fairUsePolicy && app.fairUsePolicy.limit > 0 && (
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                           <b> Fair use policy:</b><p><i> {app.fairUsePolicy.limit} credits / {app.fairUsePolicy.frequency.replace('ily', 'y').replace('ly', '')}
                                                                            {app.fairUsePolicy.customText && ` ${app.fairUsePolicy.customText}`}</i></p>
                                                                        </p>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <p className="text-xs text-blue-600 font-mono">{`${tier.credits.toLocaleString()} credits`}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold text-base text-gray-800">₹{(tier.price / 100).toFixed(2)}</p>
                                                            <button
                                                                onClick={() => addToCart(app, tier)}
                                                                className="flex items-center justify-center h-9 w-9 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                                                                aria-label={`Add ${tier.name} for ${app.name} to cart`}
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                     <div className="px-5 py-4 bg-gray-50/70 border-t flex-grow flex items-center justify-center">
                                        <p className="text-center text-sm text-gray-500 py-4">Pricing not available.</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg">
                        <h3 className="text-xl font-semibold">No Applications Available</h3>
                        <p className="mt-2">No apps are currently available for purchase. Please check back later.</p>
                    </div>
                )}

                {comingSoonApps.length > 0 && (
                    <>
                        <div className="mt-16 mb-8 text-center">
                            <h2 className="text-3xl font-bold text-gray-800">Coming Soon...</h2>
                            <p className="mt-2 text-lg text-slate-600">Get a sneak peek at what we're building next!</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-70">
                            {comingSoonApps.map(app => (
                                <div key={app.id} className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden p-5">
                                    <div className="flex items-start gap-4 mb-3">
                                        <AppIcon icon={app.icon} name={app.name} className="h-10 w-10 rounded-lg flex-shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-800 leading-tight">{app.name}</h3>
                                        </div>
                                        <span className="text-xs font-bold uppercase text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Coming Soon</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4 min-h-[3rem]">{app.description || 'More details to come.'}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </PublicPageLayout>
            
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

            {showGuestSuccess && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col">
                     <PublicPageLayout title="Success!" icon={<Zap size={28} />}>
                        <GuestPaymentSuccess />
                    </PublicPageLayout>
                </div>
            )}
            
            {playingVideoUrl && (
                <VideoPlayerModal videoUrl={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />
            )}

            <ManualPaymentQRModal
                isOpen={showManualPayment}
                onClose={() => {
                    setShowManualPayment(false);
                    setManualPaymentItems([]);
                    setCart([]);
                    setAppliedCoupon(null);
                }}
                items={manualPaymentItems}
                isGuest={!userProfile || userProfile === 'loading'}
            />
        </div>
    );
};