
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, functions } from '../../services/firebase.ts';
import type { UserProfile, NotificationType, LandingPageDefinition, AppDefinition, CartItem, OfferPageSection, OfferPageOfferContent, OfferPageOfferAddon, OfferPageCtaOption } from '../../types.ts';
import InitialLoadingScreen from '../shared/InitialLoadingScreen.tsx';
import Footer from './Footer.tsx';
import GuestCheckoutModal from './GuestCheckoutModal.tsx';
import GuestPaymentSuccess from './GuestPaymentSuccess.tsx';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';


interface OfferPageProps {
    slug: string;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    onPurchaseSuccess: (purchaseIdOrItems?: string | CartItem[]) => void;
    userProfile: UserProfile | 'loading' | null;
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

const OfferPage: React.FC<OfferPageProps> = ({ slug, showNotification, onPurchaseSuccess, userProfile }) => {
    const [pageDef, setPageDef] = useState<LandingPageDefinition | null>(null);
    const [allApps, setAllApps] = useState<AppDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for the direct checkout flow
    const [isProcessing, setIsProcessing] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [cartForCheckout, setCartForCheckout] = useState<CartItem[]>([]);
    const [showGuestSuccess, setShowGuestSuccess] = useState(false);

    // State for add-ons: key is offer id, value is an object of checked addons
    const [selectedAddons, setSelectedAddons] = useState<Record<string, { course?: boolean; app?: boolean }>>({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const pageQuery = db.collection('landingPages').where('slug', '==', slug).limit(1);
                const pageSnapshot = await pageQuery.get();
        
                if (pageSnapshot.empty) {
                    // Try fetching by ID in case it's a legacy URL structure, just in case
                    const docSnap = await db.collection('landingPages').doc(slug).get();
                    if (!docSnap.exists) {
                         throw new Error('Offer page not found or not enabled.');
                    }
                     const pageDataById = { id: docSnap.id, ...docSnap.data() } as LandingPageDefinition;
                     setPageDef(pageDataById);
                } else {
                    const pageData = { id: pageSnapshot.docs[0].id, ...pageSnapshot.docs[0].data() } as LandingPageDefinition;
                    setPageDef(pageData);
                }
        
                const appsSnap = await db.collection('apps').get();
                setAllApps(appsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppDefinition)));
        
            } catch (err: any) {
                // Check if the page exists but is just disabled
                const pageQuery = db.collection('landingPages').where('slug', '==', slug).limit(1);
                const pageSnapshot = await pageQuery.get();
                 if (!pageSnapshot.empty) {
                    const pageData = { id: pageSnapshot.docs[0].id, ...pageSnapshot.docs[0].data() } as LandingPageDefinition;
                    setPageDef(pageData); // Set pageDef so we can access the disabled message
                 } else {
                    setError(err.message || 'Failed to load offer page.');
                 }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);

    const handleAddonToggle = (offerId: string, addonKey: 'course' | 'app') => {
        setSelectedAddons(prev => ({
            ...prev,
            [offerId]: {
                ...prev[offerId],
                [addonKey]: !prev[offerId]?.[addonKey]
            }
        }));
    };

    const handlePurchaseClick = (offerContent: OfferPageOfferContent) => {
        if (!pageDef) return;

        const mainApp = allApps.find(app => app.id === pageDef.appId);
        const mainAppTier = mainApp?.pricingTiers?.find(t => t.id === offerContent.mainAppTierId);

        if (!mainApp || !mainAppTier) {
            showNotification('This offer is not configured correctly. Please contact support.', 'error');
            return;
        }

        let itemsToPurchase: CartItem[] = [];

        // Main offer item
        itemsToPurchase.push({
            appId: mainApp.id,
            appName: mainApp.name,
            appIcon: mainApp.icon,
            tierId: mainAppTier.id,
            tierName: offerContent.title,
            credits: mainAppTier.credits,
            price: mainAppTier.price
        });

        // Add-ons
        const addonsForThisOffer = selectedAddons[offerContent.id];
        if (addonsForThisOffer && offerContent.addons) {
            offerContent.addons.forEach(addon => {
                if (addonsForThisOffer[addon.key]) {
                    itemsToPurchase.push({
                        appId: 'add-on-app', // Placeholder, specific app not needed for purchase logic
                        appName: addon.title,
                        appIcon: '',
                        tierId: `addon_${addon.key}_${addon.offerPrice}`,
                        tierName: 'Special Add-on',
                        credits: addon.title.toLowerCase().includes('unlimited') ? 0 : 1,
                        price: addon.offerPrice,
                    });
                }
            });
        }
        
        setCartForCheckout(itemsToPurchase);
        setShowGuestModal(true);
    };

    const handleGuestCheckoutPurchase = (details: { guestDetails?: any; referralCode?: string }, finalCart: CartItem[]) => {
        // This function is passed to GuestCheckoutModal and will handle both guest and logged-in user purchases
        // Re-implementing the core logic from PricingPage here
        onPurchase(details, finalCart);
    };
    
    const onPurchase = async (details: { guestDetails?: any; referralCode?: string }, finalCart: CartItem[]) => {
        setIsProcessing(true);
        try {
            const razorpayLoaded = await loadRazorpayScript();
            if (!razorpayLoaded || typeof (window as any).Razorpay === 'undefined') {
                throw new Error("Could not load payment gateway. Please check your connection and try again.");
            }

            const createOrderFn = functions.httpsCallable('createRazorpayOrder');
            const result = await createOrderFn({
                items: finalCart,
                guestDetails: details.guestDetails,
                referredBy: details.referralCode,
            });
            const orderDetails = result.data as any;

            if (orderDetails.freeOrder) {
                // Handle free order logic
                setShowGuestModal(false);
                if (!userProfile || userProfile === 'loading') {
                    setShowGuestSuccess(true);
                } else {
                    onPurchaseSuccess(finalCart);
                }
                showNotification('Order processed successfully!', 'success');
                return;
            }

            const getPaymentConfig = functions.httpsCallable('getPaymentConfiguration');
            const rzpKeyResult = await getPaymentConfig();
            const rzpKey = (rzpKeyResult.data as { keyId: string }).keyId;

            const options = {
                key: rzpKey,
                amount: orderDetails.amount,
                currency: orderDetails.currency,
                name: "Powerful Tools Portal",
                description: orderDetails.description,
                order_id: orderDetails.razorpayOrderId,
                prefill: orderDetails.prefill,
                theme: { color: "#2563EB" },
                handler: () => {
                    setShowGuestModal(false);
                    if (!userProfile || userProfile === 'loading') {
                        setShowGuestSuccess(true);
                    } else {
                        onPurchaseSuccess(finalCart);
                    }
                },
                modal: { ondismiss: () => setIsProcessing(false) }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                showNotification(`Payment failed: ${response.error.description}.`, 'error');
            });
            rzp.open();
        } catch (error: any) {
            showNotification(`Checkout failed: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };


    const renderSection = (section: OfferPageSection) => {
        if (!section.enabled) return null;

        switch(section.type) {
            case 'intro': {
                const { introContent: content } = section;
                if (!content) return null;
                return (
                    <section id="section-intro" className="mb-16">
                        <header className="text-center my-8 md:my-16">
                            <h1 className="text-4xl md:text-6xl font-extrabold text-[#004AAD] drop-shadow-sm">{content.mainHeadline}</h1>
                            <p className="mt-4 text-lg md:text-xl text-[#0062E3] font-semibold">{content.subHeadline}</p>
                        </header>
                    </section>
                );
            }
            case 'challenge': {
                const { challengeContent: content } = section;
                if (!content) return null;
                return (
                    <>
                        <div className="bg-gray-50 rounded-lg shadow-xl p-6 md:p-10 mb-8 max-w-5xl mx-auto">
                            <h2 className="text-3xl font-bold text-center text-[#004AAD] mb-6">{content.title}</h2>
                            <p className="text-center text-lg text-gray-700 mb-8">{content.description}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                                {content.callouts.map(c => (
                                    <div key={c.id} className="bg-blue-50 p-6 rounded-xl shadow-md border-b-4 border-amber-500">
                                        <div className="text-5xl">{c.icon}</div>
                                        <h3 className="font-bold text-2xl mt-2 text-[#0062E3]">{c.title}</h3>
                                        <p className="text-sm text-gray-600 font-semibold" dangerouslySetInnerHTML={{ __html: c.description }}></p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-center mt-8">
                            <p className="text-3xl font-extrabold text-red-600 mt-2">{pageDef?.offerPage?.sections.find(s=>s.type==='intro')?.introContent?.scrollButtonText}</p>
                        </div>
                        <hr className="border-t-2 border-[#C2D9FF] my-12 max-w-xl mx-auto" />
                    </>
                );
            }
            case 'offer_card': {
                const { offerContent: content } = section;
                if (!content) return null;
                const cardClasses = content.isBestValue ? "border-t-8 border-[#398AF7] ring-4 ring-[#398AF7] ring-opacity-50 relative" : "border-t-8 border-gray-400";
                const buttonClasses = content.isBestValue ? "gradient-bg" : "bg-gray-600";
                 const offerId = content.id;

                return (
                    <>
                    <section className="mb-16">
                        <div className={`mb-12 bg-white rounded-lg shadow-2xl p-6 flex flex-col max-w-4xl mx-auto w-full ${cardClasses}`}>
                            {content.isBestValue && <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg transform rotate-6">BEST VALUE</div>}
                            <h2 className="text-center text-3xl md:text-4xl font-bold text-[#004AAD] mb-8">{content.title}</h2>
                            <p className="text-lg text-center text-gray-700 mb-6">{content.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="text-center">
                                    {content.originalPrice && <p className="text-red-500 line-through text-2xl">Original Price: ₹{(content.originalPrice / 100).toLocaleString('en-IN')}</p>}
                                    <p className="text-6xl font-extrabold text-[#0062E3] my-2">₹{(content.price / 100).toLocaleString('en-IN')}</p>
                                    {content.priceSubtitle && <p className="text-green-600 font-bold text-2xl">{content.priceSubtitle}</p>}
                                </div>
                                <div>
                                    <ul className="space-y-3 text-gray-700 mb-6">
                                        {content.features.map(f => (
                                            <li key={f.id} className="flex items-start">
                                                <span className="text-green-500 mr-2 mt-1">✔</span>
                                                <div>
                                                    <span dangerouslySetInnerHTML={{ __html: f.text }} />
                                                    {f.valueText && <span className="value-tag">{f.valueText}</span>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    {content.addons && content.addons.length > 0 && (
                                        <>
                                            <h4 className="text-lg font-bold text-amber-600 mt-4 mb-3 border-t border-amber-300 pt-3">🚀 Exclusive Webinar Add-Ons:</h4>
                                            <ul className="space-y-3 bg-blue-50 p-4 rounded-lg shadow-inner">
                                                {content.addons.map(addon => (
                                                     <li key={addon.id} className="flex items-start">
                                                        <label className="flex items-center cursor-pointer">
                                                            <input type="checkbox" checked={!!selectedAddons[offerId]?.[addon.key]} onChange={() => handleAddonToggle(offerId, addon.key)} className="h-4 w-4 mr-3" />
                                                            <span className="flex-1">
                                                                <p className="font-bold text-gray-800">{addon.title}</p>
                                                                <p className="text-sm text-gray-600 mt-0.5">
                                                                    <span className="font-bold">Add-On Price:</span>
                                                                    <span className="text-red-500 line-through mr-1">₹{(addon.originalPrice / 100).toLocaleString('en-IN')}</span>
                                                                    <span className="text-green-600 font-extrabold ml-2">₹{(addon.offerPrice / 100).toLocaleString('en-IN')}</span>
                                                                </p>
                                                            </span>
                                                        </label>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => handlePurchaseClick(content)} className={`mt-8 w-full ${buttonClasses} text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300`}>{content.buttonText}</button>
                        </div>
                    </section>
                    <hr className="border-t-2 border-[#C2D9FF] my-12 max-w-xl mx-auto" />
                    </>
                );
            }
             case 'final_cta': {
                const { finalCtaContent: content } = section;
                if (!content) return null;

                let options = content.options || [];
                // Migration logic for rendering from old structure
                if (options.length === 0 && content.option1Title) {
                    options.push({
                        id: uuidv4(), type: 'instant', title: content.option1Title,
                        steps: content.option1Steps || [], buttonText: content.option1ButtonText, isPrimary: true,
                    });
                    if (content.option2Title) {
                        options.push({
                            id: uuidv4(), type: 'qr', title: content.option2Title,
                            qrText: content.option2QrText, note: content.option2Note, isPrimary: false,
                        });
                    }
                }

                if (options.length === 0) return null;
                
                const gridClass = options.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : options.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

                return (
                    <section id="section-cta" className="mb-16">
                        <div className="max-w-6xl mx-auto w-full">
                            <header className="text-center mb-12 bg-white rounded-xl shadow-xl p-8 border-b-8 border-red-600">
                                <h2 className="text-4xl md:text-5xl font-extrabold text-red-600 drop-shadow-sm">{content.urgencyHeadline}</h2>
                                <p className="mt-4 text-xl md:text-2xl font-bold text-[#004AAD]" dangerouslySetInnerHTML={{ __html: content.urgencySubheadline }} />
                            </header>
                            <section id="cta">
                                <h3 className="text-center text-3xl md:text-4xl font-bold text-[#004AAD] mb-12">{content.ctaTitle}</h3>
                                <div className={`grid ${gridClass} gap-8`}>
                                    {options.map(option => {
                                        const isPrimary = option.isPrimary;

                                        if (option.type === 'instant') {
                                            return (
                                                <div key={option.id} className={`bg-white rounded-xl shadow-2xl p-6 border-b-8 ${isPrimary ? 'border-green-600' : 'border-gray-400'} relative`}>
                                                    {isPrimary && <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-green-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg transform rotate-3">FASTEST ACCESS</div>}
                                                    <h4 className={`text-2xl font-bold ${isPrimary ? 'text-green-700' : 'text-gray-700'} mb-4`}>{option.title}</h4>
                                                    <ol className="space-y-4 text-left text-gray-700 list-decimal list-inside text-lg">
                                                        {(option.steps || []).map(step => <li key={step.id} className="pl-2" dangerouslySetInnerHTML={{ __html: step.text }}></li>)}
                                                    </ol>
                                                    {option.buttonText && (
                                                        <a href="https://powerfultools.in/pricing" className="mt-8 w-full block text-center gradient-bg text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                                                            {option.buttonText}
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        }

                                        if (option.type === 'qr') {
                                            return (
                                                <div key={option.id} className={`bg-white rounded-xl shadow-xl p-6 border-b-8 ${isPrimary ? 'border-green-600' : 'border-gray-400'}`}>
                                                    <h4 className={`text-2xl font-bold text-center ${isPrimary ? 'text-green-700' : 'text-gray-700'} mb-6`}>{option.title}</h4>
                                                    <div className="text-center">
                                                        <div className="p-4 bg-white rounded-lg shadow-inner inline-block">
                                                            {option.payeeName && <h5 className="font-semibold text-gray-800 mb-2">{option.payeeName}</h5>}
                                                            {option.qrImageUrl ? (
                                                                <img src={option.qrImageUrl} alt="Scan to Pay with UPI" className="w-48 mx-auto" />
                                                            ) : (
                                                                <div className="w-48 h-48 mx-auto bg-gray-100 flex items-center justify-center text-center text-gray-400 text-sm p-4">QR Code Image URL is missing</div>
                                                            )}
                                                            {option.qrText && <p className="font-mono text-sm mt-2 text-gray-700">{option.qrText}</p>}
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-4">Scan to pay with any UPI app</p>
                                                    </div>
                                                    {option.note && (
                                                        <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                                                            <p className="font-bold text-red-700">Important Note:</p>
                                                            <p className="text-red-700" dangerouslySetInnerHTML={{ __html: option.note }} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </section>
                        </div>
                        <footer className="text-center mt-16 py-8 border-t border-[#83B9FF] max-w-6xl mx-auto w-full">
                             <p className="text-[#0062E3]">{content.footerText}</p>
                             <p className="text-sm text-gray-600 mt-2">{content.footerContact}</p>
                        </footer>
                    </section>
                );
            }
            default: return null;
        }
    };
    
    const sortedSections = useMemo(() => {
        if (!pageDef?.offerPage?.sections) return [];
        return [...pageDef.offerPage.sections].sort((a, b) => a.order - b.order);
    }, [pageDef]);

    if (loading) {
        return <InitialLoadingScreen />;
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col">
                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-600">Page Not Found</h1>
                        <p className="text-gray-600 mt-2">{error}</p>
                        <a href="/" className="mt-6 inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Go to Homepage</a>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!pageDef || !pageDef.hasOfferPage || !pageDef.offerPage) {
        const mainMessage = pageDef?.offerPageDisabledMessage || 'Page Not Found';
        return (
            <div className="min-h-screen flex flex-col">
                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-600" dangerouslySetInnerHTML={{ __html: mainMessage }} />
                        <a href="/" className="mt-8 inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 text-lg">
                            Go to Homepage
                        </a>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }


    return (
        <div className="bg-white">
             <style>{`
                body { font-family: 'Inter', sans-serif; }
                .gradient-bg { background: linear-gradient(135deg, #004AAD, #398AF7); }
                .value-tag { background-color: #e6f7e6; color: #1e8449; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-left: 8px; white-space: nowrap; }
            `}</style>
            <main className="container mx-auto p-4 md:p-8 relative">
                {sortedSections.map(section => (
                    <React.Fragment key={section.id}>
                        {renderSection(section)}
                    </React.Fragment>
                ))}
            </main>
            <Footer />

            {showGuestModal && (
                <GuestCheckoutModal
                    cart={cartForCheckout}
                    appliedCoupon={null} // Coupons are not part of this direct flow
                    onClose={() => setShowGuestModal(false)}
                    onPurchase={handleGuestCheckoutPurchase}
                    isProcessing={isProcessing}
                    showNotification={showNotification}
                    userProfile={userProfile && userProfile !== 'loading' ? userProfile : null}
                    allApps={allApps}
                    allWebinarProducts={[]}
                />
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
        </div>
    );
};

export default OfferPage;
