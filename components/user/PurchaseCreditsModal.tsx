

import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, Loader, Zap, Tag, CheckCircle, QrCode, UserPlus } from 'lucide-react';
import { functions } from '../../services/firebase.ts';

import type { AppDefinition, NotificationType, UserProfile, PricingTier, CartItem } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';
import ManualPaymentQRModal from '../shared/ManualPaymentQRModal.tsx';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface AppliedCoupon {
    code: string;
    discountPercentage: number;
}

interface PurchaseCreditsModalProps {
    app: AppDefinition;
    userProfile: UserProfile;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    onSuccess: () => void;
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

const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({ app, userProfile, onClose, showNotification, onSuccess }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [razorpayKey, setRazorpayKey] = useState<string | null>(null);

    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

    const [showManualPayment, setShowManualPayment] = useState(false);
    const [manualPaymentItems, setManualPaymentItems] = useState<CartItem[]>([]);
    
    const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
    const [referralCode, setReferralCode] = useState('');

    const availableTiers = useMemo(() => {
        // Filter out special offer tiers, which are meant for offer pages, not general purchase.
        return (app.pricingTiers || []).filter(tier => !tier.isWebinarAddon);
    }, [app.pricingTiers]);

    useEffect(() => {
        const getRazorpayKey = async () => {
            try {
                const getPaymentConfig = functions.httpsCallable('getPaymentConfiguration');
                const result = await getPaymentConfig();
                const config = result.data as { keyId: string };
                if (config.keyId) {
                    setRazorpayKey(config.keyId);
                } else {
                    throw new Error("Razorpay key not found.");
                }
            } catch (error) {
                console.error("Failed to get payment configuration:", error);
                showNotification("Could not initialize payment system.", "error");
            }
        };
        getRazorpayKey();
    }, [showNotification]);


    const handlePurchase = async (tier: PricingTier, couponCode?: string) => {
        if (!razorpayKey) {
            showNotification("Payment system is not ready. Try again.", "error");
            return;
        }
        setIsProcessing(true);

        const razorpayLoaded = await loadRazorpayScript();
        if (!razorpayLoaded || typeof (window as any).Razorpay === 'undefined') {
            showNotification("Could not load payment gateway. Please check your connection and try again.", "error");
            setIsProcessing(false);
            return;
        }

        try {
            const createRazorpayOrder = functions.httpsCallable('createRazorpayOrder');
            
            const cartItem: CartItem = {
                appId: app.id,
                appName: app.name,
                appIcon: app.icon,
                tierId: tier.id,
                tierName: tier.name,
                credits: tier.credits,
                price: tier.price
            };

            const result = await createRazorpayOrder({ items: [cartItem], couponCode, referredBy: referralCode.trim() });
            const orderDetails = result.data as any;

            if (orderDetails.freeOrder) {
                setIsProcessing(false);
                onClose();
                onSuccess();
                showNotification(orderDetails.message || "Your free order was processed successfully!", "success");
                return;
            }

            const options = {
                key: razorpayKey,
                amount: orderDetails.amount,
                currency: orderDetails.currency,
                name: "Powerful Tools Portal",
                description: orderDetails.description,
                order_id: orderDetails.razorpayOrderId,
                prefill: orderDetails.prefill,
                theme: { color: "#2563EB" },
                handler: (response: any) => {
                    setIsProcessing(false);
                    onClose();
                    onSuccess();
                },
                modal: { ondismiss: () => setIsProcessing(false) }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                showNotification(`Payment failed: ${response.error.description}.`, "error");
                setIsProcessing(false);
            });
            
            rzp.open();

        } catch (error: any) {
            console.error("Error creating Razorpay order:", error);
            const errorMessage = error.details?.message || error.message || 'An unknown error occurred.';
            showNotification(`Checkout failed: ${errorMessage}`, 'error');
            setIsProcessing(false);
        }
    };

    const handleManualPurchase = (tier: PricingTier) => {
        let finalPrice = tier.price;
        if (appliedCoupon) {
            finalPrice = tier.price * (1 - appliedCoupon.discountPercentage / 100);
        }

        const itemForModal: CartItem = {
            appId: app.id,
            appName: app.name,
            appIcon: app.icon,
            tierId: tier.id,
            tierName: tier.name,
            credits: tier.credits,
            price: Math.round(finalPrice),
        };

        setManualPaymentItems([itemForModal]);
        setShowManualPayment(true);
    };
    
    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setIsVerifyingCoupon(true);
        setAppliedCoupon(null);

        try {
            const validateCouponFn = functions.httpsCallable('validateCoupon');
            const cartItem: CartItem = {
                appId: app.id, appName: app.name, appIcon: app.icon,
                tierId: 'validation', tierName: 'validation', credits: 0, price: 0
            };
            const result = await validateCouponFn({ code: couponInput.trim().toUpperCase(), items: [cartItem] });
            const data = result.data as { success: boolean; message: string; discountPercentage?: number; appIds?: string[]; };

            if (data.success && data.discountPercentage && data.appIds && data.appIds.includes(app.id)) {
                setAppliedCoupon({ code: couponInput.trim().toUpperCase(), discountPercentage: data.discountPercentage });
                showNotification(data.message, 'success');
            } else {
                 showNotification(data.message || 'Coupon not valid for this app.', 'error');
            }
        } catch (error: any) {
            console.error("Coupon validation error:", error);
            showNotification(error.message || "Failed to validate coupon.", 'error');
        } finally {
            setIsVerifyingCoupon(false);
        }
    };
    
    const selectedTier = useMemo(() => {
        if (!selectedTierId) return null;
        return availableTiers.find(t => t.id === selectedTierId) || null;
    }, [selectedTierId, availableTiers]);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                    <header className="p-6 border-b flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Zap className="text-green-500" size={24} />
                                <h3 className="text-2xl font-bold text-gray-800">Purchase Credits</h3>
                            </div>
                            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <AppIcon icon={app.icon} name={app.name} className="h-8 w-8 rounded-md flex-shrink-0"/>
                            <p className="text-gray-600">for <span className="font-semibold">{app.name}</span></p>
                        </div>
                    </header>
                    <main className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50/50">
                        {(availableTiers && availableTiers.length > 0) ? (
                            availableTiers.map(tier => {
                                let discountedPrice = tier.price;
                                if (appliedCoupon) {
                                    discountedPrice = tier.price * (1 - appliedCoupon.discountPercentage / 100);
                                }
                                const isSelected = selectedTierId === tier.id;

                                return (
                                     <button
                                        key={tier.id}
                                        onClick={() => setSelectedTierId(tier.id)}
                                        disabled={isProcessing}
                                        className={`w-full text-left flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm transition-all duration-200
                                            ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 hover:border-blue-400'}`
                                        }
                                    >
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800">{tier.name}</p>
                                            <p className="text-sm text-blue-700 font-mono">{tier.credits === 0 ? 'Unlimited credits' : `${tier.credits.toLocaleString()} credits`}</p>
                                        </div>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <p className={`font-semibold text-lg ${appliedCoupon ? 'text-green-600' : 'text-gray-800'}`}>
                                                ₹{(discountedPrice / 100).toFixed(2)}
                                            </p>
                                            {appliedCoupon && (
                                                <p className="text-sm text-gray-500 line-through">
                                                    ₹{(tier.price / 100).toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <p className="text-center text-gray-500 italic py-8">No pricing tiers are configured for this application.</p>
                        )}
                         <div className="pt-4 border-t">
                            {!appliedCoupon ? (
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon Code (Optional)" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500" disabled={isVerifyingCoupon || isProcessing} />
                                    </div>
                                    <button onClick={handleApplyCoupon} disabled={!couponInput || isVerifyingCoupon || isProcessing} className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-black transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center w-28">
                                        {isVerifyingCoupon ? <Loader className="animate-spin" size={20} /> : "Apply"}
                                    </button>
                                </div>
                             ) : (
                                 <div className="p-2 bg-green-100 text-green-800 rounded-lg flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={16} />
                                        <p>Coupon <strong>{appliedCoupon.code}</strong> giving {appliedCoupon.discountPercentage}% off applied!</p>
                                    </div>
                                    <button onClick={() => {setAppliedCoupon(null); setCouponInput('');}} className="p-1 rounded-full hover:bg-green-200">
                                        <X size={16} />
                                    </button>
                                </div>
                             )}
                         </div>
                         {!userProfile.referredBy && (
                            <div className="pt-4 border-t">
                                <div className="relative">
                                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={e => setReferralCode(e.target.value)}
                                        placeholder="Referral Code (Optional)"
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>
                        )}
                    </main>
                    <footer className="bg-gray-50 px-6 py-4 space-y-3 rounded-b-xl border-t flex-shrink-0">
                       {selectedTier ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={() => handlePurchase(selectedTier, appliedCoupon?.code)}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-center py-3 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                                >
                                    {isProcessing ? <Loader className="animate-spin" size={20} /> : <><CreditCard size={16} className="mr-1.5" /> Pay Online</>}
                                </button>
                                <button
                                    onClick={() => handleManualPurchase(selectedTier)}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-center py-3 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                                >
                                    <QrCode size={16} className="mr-1.5" /> Pay Manually (QR)
                                </button>
                            </div>
                        ) : (
                             <p className="text-center text-sm text-gray-500">Please select a credit pack to proceed.</p>
                        )}
                        <button type="button" onClick={onClose} className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Cancel</button>
                    </footer>
                </div>
            </div>
            <ManualPaymentQRModal
                isOpen={showManualPayment}
                onClose={() => {
                    setShowManualPayment(false);
                    onClose();
                }}
                items={manualPaymentItems}
                isGuest={false}
            />
        </>
    );
};

export default PurchaseCreditsModal;
