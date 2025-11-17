
import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, Loader, User, Mail, Key, CheckCircle, UserPlus, Phone, ShieldCheck, Send, Zap } from 'lucide-react';
import { db } from '../../services/firebase.ts';
import type { NotificationType, CartItem, UserProfile, AppDefinition, WebinarProduct, PricingTier, CheckoutSettingsState, OtpSettings } from '../../types.ts';
import { AppliedCoupon } from './CartModal.tsx';
import AppIcon from '../shared/AppIcon.tsx';
import { functions } from '../../services/firebase.ts';

interface GuestCheckoutModalProps {
    cart: CartItem[];
    appliedCoupon: AppliedCoupon | null;
    onClose: () => void;
    onPurchase: (details: { guestDetails?: { name: string; email: string; phone: string; password: string; }; referralCode?: string; }, finalCart: CartItem[]) => void;
    isProcessing: boolean;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    userProfile: UserProfile | null;
    allApps: AppDefinition[];
    allWebinarProducts: WebinarProduct[];
}

type VerificationStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified';

const initialCheckoutSettings: CheckoutSettingsState = {
    appPurchase: { requireEmailOtp: true, requirePhoneOtp: true },
    webinarPurchase: { requireEmailOtp: false, requirePhoneOtp: false },
    packagePurchase: { requireEmailOtp: true, requirePhoneOtp: true },
};

const GuestCheckoutModal: React.FC<GuestCheckoutModalProps> = ({ cart, appliedCoupon, onClose, onPurchase, isProcessing, showNotification, userProfile, allApps, allWebinarProducts }) => {
    const [localCart, setLocalCart] = useState<CartItem[]>(cart);
    
    const [acceptedOfferTierIds, setAcceptedOfferTierIds] = useState<Set<string>>(new Set());

    const [details, setDetails] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [referralCode, setReferralCode] = useState('');

    const [emailOtp, setEmailOtp] = useState('');
    const [emailVerificationStatus, setEmailVerificationStatus] = useState<VerificationStatus>(userProfile ? 'verified' : 'idle');
    const [emailResendTimer, setEmailResendTimer] = useState(0);

    const [phoneOtp, setPhoneOtp] = useState('');
    const [phoneVerificationStatus, setPhoneVerificationStatus] = useState<VerificationStatus>((userProfile && userProfile.phone) ? 'verified' : 'idle');
    const [phoneResendTimer, setPhoneResendTimer] = useState(0);
    
    const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettingsState | null>(null);

    const addOnOffers = useMemo(() => {
        if (!allWebinarProducts || !allApps) return [];

        const offers = cart
            .filter(item => item.isWebinar)
            .flatMap(webinarItem => {
                const webinarProduct = allWebinarProducts.find(p => p.id === webinarItem.appId);
                if (webinarProduct && webinarProduct.addOnAppId) {
                    const offerApp = allApps.find(app => app.id === webinarProduct.addOnAppId);
                    if (offerApp && offerApp.pricingTiers) {
                        return offerApp.pricingTiers
                            .filter(tier => tier.isWebinarAddon)
                            .map(offerTier => ({
                                app: offerApp,
                                tier: offerTier,
                                fromWebinarName: webinarProduct.name
                            }));
                    }
                }
                return [];
            });
        
        const uniqueOffers = Array.from(new Map(offers.map(offer => [offer.tier.id, offer])).values());
        
        return uniqueOffers;
    }, [cart, allApps, allWebinarProducts]);
    
    useEffect(() => {
        let updatedCart = [...cart];
        
        addOnOffers.forEach(offer => {
            const isAccepted = acceptedOfferTierIds.has(offer.tier.id);
            const isInCart = updatedCart.some(item => item.tierId === offer.tier.id);

            if (isAccepted && !isInCart) {
                updatedCart.push({
                    appId: offer.app.id,
                    appName: offer.app.name,
                    appIcon: offer.app.icon,
                    tierId: offer.tier.id,
                    tierName: offer.tier.name,
                    credits: offer.tier.credits,
                    price: offer.tier.price,
                });
            } else if (!isAccepted && isInCart) {
                updatedCart = updatedCart.filter(item => item.tierId !== offer.tier.id);
            }
        });
        setLocalCart(updatedCart);
    }, [cart, addOnOffers, acceptedOfferTierIds]);

    const containsAppPurchase = useMemo(() => localCart.some(item => !item.isWebinar && !item.isConsultation), [localCart]);
    const isAccountCreationRequired = !userProfile && containsAppPurchase;
    
    const handleToggleAddOn = (tierId: string) => {
        setAcceptedOfferTierIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tierId)) {
                newSet.delete(tierId);
            } else {
                newSet.add(tierId);
            }
            return newSet;
        });
    };

    useEffect(() => {
        if (userProfile) {
            const [first, ...last] = (userProfile.name || '').split(' ');
            setDetails(prev => ({
                ...prev,
                firstName: first || '',
                lastName: last.join(' ') || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
            }));
            setEmailVerificationStatus('verified');
            if (userProfile.phone) {
                setPhoneVerificationStatus('verified');
            }
        } else {
            db.collection('site_content').doc('checkout_settings').get()
                .then(doc => {
                    if (doc.exists) {
                        const data = doc.data() as any;
                        if (data.requireEmailOtp !== undefined || data.requirePhoneOtp !== undefined) {
                             setCheckoutSettings({
                                appPurchase: {
                                    requireEmailOtp: data.requireEmailOtp !== false,
                                    requirePhoneOtp: data.requirePhoneOtp !== false,
                                },
                                webinarPurchase: {
                                    requireEmailOtp: false,
                                    requirePhoneOtp: false,
                                },
                                packagePurchase: {
                                    requireEmailOtp: true,
                                    requirePhoneOtp: true,
                                },
                            });
                        } else {
                            setCheckoutSettings({
                                appPurchase: { ...initialCheckoutSettings.appPurchase, ...data.appPurchase },
                                webinarPurchase: { ...initialCheckoutSettings.webinarPurchase, ...data.webinarPurchase },
                                packagePurchase: { ...initialCheckoutSettings.packagePurchase, ...data.packagePurchase },
                            });
                        }
                    } else {
                        setCheckoutSettings(initialCheckoutSettings);
                    }
                })
                .catch(() => {
                    setCheckoutSettings(initialCheckoutSettings);
                });
        }
    }, [userProfile]);

    useEffect(() => {
        let intervalId: number | undefined;
        if (emailResendTimer > 0) {
            intervalId = window.setInterval(() => {
                setEmailResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [emailResendTimer]);

    useEffect(() => {
        let intervalId: number | undefined;
        if (phoneResendTimer > 0) {
            intervalId = window.setInterval(() => {
                setPhoneResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => {
             if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [phoneResendTimer]);


    useEffect(() => {
        const handler = setTimeout(() => {
            const fullName = `${details.firstName} ${details.lastName}`.trim();
            const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email);
            const isTenDigitPhone = /^\d{10}$/.test(details.phone);
            
            if (fullName && isValidEmail && isTenDigitPhone && cart.length > 0 && !userProfile) {
                const leadCapturedKey = `lead_captured_${details.email}`;
                if (!sessionStorage.getItem(leadCapturedKey)) {
                    const captureLeadFn = functions.httpsCallable('captureLead');
                    captureLeadFn({ 
                        name: fullName,
                        email: details.email, 
                        phone: details.phone,
                        cart: cart 
                    }).then(() => {
                        sessionStorage.setItem(leadCapturedKey, 'true');
                    }).catch(err => {
                        console.error("Failed to capture lead:", err);
                    });
                }
            }
        }, 1500);

        return () => clearTimeout(handler);
    }, [details.firstName, details.lastName, details.email, details.phone, cart, userProfile]);
    
    const subtotal = useMemo(() => localCart.reduce((sum, item) => sum + item.price, 0), [localCart]);
    
    const totalDiscountAmount = useMemo(() => {
        if (!appliedCoupon) return 0;
        return localCart.reduce((discount, item) => {
            if (appliedCoupon.appIds.includes(item.appId)) {
                return discount + (item.price * (appliedCoupon.discountPercentage / 100));
            }
            return discount;
        }, 0);
    }, [localCart, appliedCoupon]);

    const totalAmount = subtotal - totalDiscountAmount;

    const containsPackagePurchase = useMemo(() => localCart.some(item => item.isConsultation), [localCart]);
    const containsWebinarPurchase = useMemo(() => localCart.some(item => item.isWebinar), [localCart]);

    const settingsForPurchase = useMemo(() => {
        if (!checkoutSettings) return initialCheckoutSettings.appPurchase;
        if (containsAppPurchase) return checkoutSettings.appPurchase;
        if (containsPackagePurchase) return checkoutSettings.packagePurchase;
        if (containsWebinarPurchase) return checkoutSettings.webinarPurchase;
        return checkoutSettings.appPurchase;
    }, [checkoutSettings, containsAppPurchase, containsPackagePurchase, containsWebinarPurchase]);
    
    const isEmailVerificationRequired = !userProfile && (settingsForPurchase?.requireEmailOtp ?? true);
    const isPhoneVerificationRequired = !userProfile && (settingsForPurchase?.requirePhoneOtp ?? true);


    useEffect(() => {
        if (details.password && details.confirmPassword && details.password !== details.confirmPassword) {
            setPasswordError('Passwords do not match.');
        } else {
            setPasswordError('');
        }
    }, [details.password, details.confirmPassword]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        if (name === 'phone') {
            let numericValue = value.replace(/[^0-9]/g, '');

            if (numericValue.startsWith('91') && numericValue.length > 10) {
                numericValue = numericValue.substring(2);
            } else if (numericValue.startsWith('0') && numericValue.length === 11) {
                numericValue = numericValue.substring(1);
            }

            const finalValue = numericValue.slice(0, 10);
            
            setDetails(prev => ({ ...prev, phone: finalValue }));

            if (finalValue.length > 0 && finalValue.length < 10) {
                setPhoneError('Mobile number must be 10 digits.');
            } else if (finalValue.length === 10 && !/^[6-9]/.test(finalValue)) {
                setPhoneError('Please enter a valid Indian mobile number (starting with 6, 7, 8, or 9).');
            } else {
                setPhoneError('');
            }

            if(isPhoneVerificationRequired && finalValue !== details.phone) {
                setPhoneVerificationStatus('idle');
                setPhoneOtp('');
            }

        } else {
            setDetails(prev => ({ ...prev, [name]: value }));
        }

        if(name === 'email' && isEmailVerificationRequired && value !== details.email) {
            setEmailVerificationStatus('idle');
            setEmailOtp('');
        }
    };
    
    const handleSendPhoneOtp = async () => {
        if (details.phone.length !== 10) {
            showNotification('Please enter a valid 10-digit Indian mobile number.', 'error');
            return;
        }
        setPhoneVerificationStatus('sending');
        try {
            const checkUserFn = functions.httpsCallable('checkIfUserExists');
            const checkResult = await checkUserFn({ phone: details.phone });
            if ((checkResult.data as { exists: boolean }).exists) {
                showNotification('This phone number is already registered. Please log in.', 'error');
                setPhoneVerificationStatus('idle');
                return;
            }

            const sendOtpFn = functions.httpsCallable('sendPhoneVerificationOtp');
            await sendOtpFn({ phone: details.phone });
            setPhoneVerificationStatus('sent');
            setPhoneResendTimer(60);
            showNotification('An OTP has been sent. It may take a moment to arrive.', 'info');
        } catch (error: any) {
            console.error("Error sending phone OTP:", error);
            showNotification(error.message || 'Failed to send OTP. Please try again.', 'error');
            setPhoneVerificationStatus('idle');
        }
    };

    const handleVerifyPhoneOtp = async () => {
        if (phoneOtp.length !== 6) {
            showNotification('Please enter the 6-digit OTP.', 'error');
            return;
        }
        setPhoneVerificationStatus('verifying');
        try {
            const verifyOtpFn = functions.httpsCallable('verifyOtp');
            await verifyOtpFn({ identifier: details.phone, otp: phoneOtp, isPhone: true });
            showNotification('Mobile number verified successfully!', 'success');
            setPhoneVerificationStatus('verified');
        } catch (error: any) {
            console.error("Error verifying phone OTP:", error);
            showNotification(error.message || 'Failed to verify OTP.', 'error');
            setPhoneVerificationStatus('sent');
        }
    };


    const handleSendEmailOtp = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }
        setEmailVerificationStatus('sending');
        setEmailOtp('');

        try {
            if (containsAppPurchase) {
                const checkUserFn = functions.httpsCallable('checkIfUserExists');
                const checkResult = await checkUserFn({ email: details.email });
                if ((checkResult.data as { exists: boolean }).exists) {
                    showNotification('This email is already registered. Please log in to purchase apps.', 'error');
                    setEmailVerificationStatus('idle');
                    return;
                }
            }

            const sendOtpFn = functions.httpsCallable('sendVerificationOtp');
            await sendOtpFn({ email: details.email, name: `${details.firstName} ${details.lastName}`.trim() || 'User' });
            showNotification('An OTP has been sent. It may take a moment to arrive.', 'info');
            setEmailVerificationStatus('sent');
            setEmailResendTimer(60);
        } catch (error: any) {
            console.error("Error sending email OTP:", error);
            showNotification(error.message || 'Failed to send OTP. Please try again.', 'error');
            setEmailVerificationStatus('idle');
        }
    };

    const handleVerifyEmailOtp = async () => {
        if (emailOtp.length !== 6) {
            showNotification('Please enter the 6-digit OTP.', 'error');
            return;
        }
        setEmailVerificationStatus('verifying');
        try {
            const verifyOtpFn = functions.httpsCallable('verifyOtp');
            await verifyOtpFn({ identifier: details.email, otp: emailOtp, isPhone: false });
            showNotification('Email verified successfully!', 'success');
            setEmailVerificationStatus('verified');
        } catch (error: any) {
            console.error(`Error verifying email OTP:`, error);
            showNotification(error.message || `Failed to verify OTP.`, 'error');
            setEmailVerificationStatus('sent');
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError('');

        if (phoneError) {
            showNotification(phoneError, 'error');
            return;
        }

        if (userProfile) {
            setIsUpdatingProfile(true);
            try {
                const newName = `${details.firstName} ${details.lastName}`.trim();
                const updates: { [key: string]: any } = {};
                if (newName && newName !== userProfile.name) updates.name = newName;
                if (details.phone && details.phone !== userProfile.phone) updates.phone = details.phone;

                if (Object.keys(updates).length > 0) {
                    await db.collection('users').doc(userProfile.id).update(updates);
                    showNotification('Contact details updated.', 'info', 1500);
                }
                onPurchase({}, localCart);
            } catch (error: any) {
                showNotification(`Failed to update details: ${error.message}`, 'error');
                setIsUpdatingProfile(false);
            }
        } else {
             if (isEmailVerificationRequired && emailVerificationStatus !== 'verified') {
                showNotification('Please verify your email to proceed.', 'error');
                return;
            }
            if (isPhoneVerificationRequired && phoneVerificationStatus !== 'verified') {
                showNotification('Please verify your mobile number to proceed.', 'error');
                return;
            }
            if (isAccountCreationRequired) {
                if (details.password !== details.confirmPassword) {
                    setPasswordError('Passwords do not match.');
                    return;
                }
                if (details.password.length < 6) {
                    setPasswordError('Password must be at least 6 characters long.');
                    return;
                }
            }
            onPurchase({
                guestDetails: { 
                    name: `${details.firstName} ${details.lastName}`.trim(), 
                    email: details.email, 
                    phone: details.phone, 
                    password: isAccountCreationRequired ? details.password : '' 
                },
                referralCode: containsAppPurchase ? referralCode.trim() : undefined,
            }, localCart);
        }
    };
    
    const isProceedDisabled = isProcessing || isUpdatingProfile || 
        (isEmailVerificationRequired && emailVerificationStatus !== 'verified') || 
        (isPhoneVerificationRequired && phoneVerificationStatus !== 'verified') || 
        !!phoneError;


    const proceedButtonText = () => {
        if (isProcessing || isUpdatingProfile) return <><Loader className="animate-spin mr-2" size={20} /> Processing...</>;
        if (isEmailVerificationRequired && emailVerificationStatus !== 'verified') return <><ShieldCheck size={16} className="mr-2"/> Verify Email to Proceed</>;
        if (isPhoneVerificationRequired && phoneVerificationStatus !== 'verified') return <><ShieldCheck size={16} className="mr-2"/> Verify Phone to Proceed</>;
        if (phoneError) return <><ShieldCheck size={16} className="mr-2"/> Fix Errors to Proceed</>;
        return <><CreditCard size={16} className="mr-2"/> Proceed to Payment</>;
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{userProfile ? 'Confirm Your Details' : 'Guest Checkout'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors" disabled={isProcessing}><X size={24} /></button>
                    </div>
                    <p className="text-gray-500 mt-1">{isAccountCreationRequired ? 'An account will be created for you upon successful purchase.' : 'Please confirm your details for the purchase.'}</p>
                </header>
                <main className="flex-grow p-6 space-y-6 overflow-y-auto bg-gray-50/50">
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Order Summary</h4>
                        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
                            {localCart.map((item, index) => {
                                const isDiscounted = appliedCoupon?.appIds.includes(item.appId);
                                const discountValue = isDiscounted ? item.price * (appliedCoupon.discountPercentage / 100) : 0;
                                return (
                                    <div key={`${item.tierId}-${index}`} className="border-b last:border-b-0 pb-3 last:pb-0">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3"><AppIcon icon={item.appIcon} name={item.appName} className="h-8 w-8 rounded-md flex-shrink-0" /><p className="font-semibold text-gray-800">{item.appName}</p></div>
                                            <p className="font-medium text-gray-800">₹{(item.price / 100).toFixed(2)}</p>
                                        </div>
                                        {isDiscounted && <div className="flex justify-end items-center text-green-600 text-sm mt-1"><span>Coupon Discount</span><span className="font-medium ml-2">- ₹{(discountValue / 100).toFixed(2)}</span></div>}
                                    </div>
                                );
                            })}
                             <div className="flex justify-between items-center font-bold text-gray-800 text-xl pt-3"><p>Total</p><p>₹{(totalAmount / 100).toFixed(2)}</p></div>
                        </div>
                    </div>
                    
                    {addOnOffers.length > 0 && (
                        <div>
                             <h4 className="font-semibold text-gray-700 mb-2">✨ Special Webinar Offer{addOnOffers.length > 1 ? 's' : ''}!</h4>
                             <div className="space-y-3">
                                {addOnOffers.map(offer => (
                                    <div key={offer.tier.id} className="p-3 bg-purple-50 border-2 border-purple-200 rounded-lg shadow-sm space-y-2">
                                        <p className="text-xs text-purple-700 font-semibold">Offer for: {offer.fromWebinarName}</p>
                                        <div className="flex items-center gap-3">
                                            <AppIcon icon={offer.app.icon} name={offer.app.name} className="h-10 w-10 rounded-md flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold text-gray-800 text-base">{offer.app.name}</p>
                                                <p className="text-xs text-gray-600">{offer.tier.name}</p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                {offer.tier.originalPrice && (
                                                    <p className="text-xs text-gray-500 line-through">₹{(offer.tier.originalPrice / 100).toFixed(2)}</p>
                                                )}
                                                <p className="font-semibold text-base text-purple-600">₹{(offer.tier.price / 100).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 mt-2 p-2 bg-white rounded-md cursor-pointer hover:bg-purple-50">
                                            <input
                                                type="checkbox"
                                                checked={acceptedOfferTierIds.has(offer.tier.id)}
                                                onChange={() => handleToggleAddOn(offer.tier.id)}
                                                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <span className="font-semibold text-purple-800 text-sm">Yes, I want to avail this special offer!</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                         <h4 className="font-semibold text-gray-700 mb-2">Your Details</h4>
                        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" name="firstName" value={details.firstName} onChange={handleChange} placeholder="First Name" required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" disabled={isProcessing || isUpdatingProfile} /></div>
                                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" name="lastName" value={details.lastName} onChange={handleChange} placeholder="Last Name" required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" disabled={isProcessing || isUpdatingProfile} /></div>
                            </div>
                            
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="email" name="email" value={details.email} onChange={handleChange} placeholder="Your Email Address" required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" disabled={isProcessing || isUpdatingProfile || !!userProfile} />
                                {isEmailVerificationRequired && emailVerificationStatus === 'idle' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email) && <button type="button" onClick={handleSendEmailOtp} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:underline">Send OTP</button>}
                                {isEmailVerificationRequired && emailVerificationStatus === 'sending' && <Loader className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={16}/>}
                                {emailVerificationStatus === 'verified' && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" size={16}/>}
                            </div>
                            
                            {isEmailVerificationRequired && (emailVerificationStatus === 'sent' || emailVerificationStatus === 'verifying') && (
                                <div className="space-y-1 pl-2">
                                    <div className="flex gap-2">
                                        <input type="text" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} placeholder="Email OTP" maxLength={6} className="flex-grow p-2 border rounded-lg" disabled={emailVerificationStatus === 'verifying'}/>
                                        <button type="button" onClick={handleVerifyEmailOtp} className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-black disabled:bg-gray-400 flex items-center justify-center w-28" disabled={emailVerificationStatus === 'verifying'}>
                                                {emailVerificationStatus === 'verifying' ? <Loader className="animate-spin" size={20}/> : "Verify"}
                                        </button>
                                    </div>
                                     <div className="text-right pr-1">
                                        <button type="button" onClick={handleSendEmailOtp} disabled={emailResendTimer > 0 || emailVerificationStatus === 'verifying'} className="text-xs font-semibold text-blue-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed">
                                            {emailResendTimer > 0 ? `Resend in ${emailResendTimer}s` : 'Resend OTP'}
                                        </button>
                                    </div>
                                </div>
                            )}

                             <div>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="tel" name="phone" value={details.phone} onChange={handleChange} placeholder="10-Digit Mobile Number" required className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${phoneError ? 'border-red-500' : 'border-gray-300'}`} disabled={isProcessing || isUpdatingProfile} />
                                    {isPhoneVerificationRequired && phoneVerificationStatus === 'idle' && details.phone.length === 10 && !phoneError && <button type="button" onClick={handleSendPhoneOtp} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:underline">Send OTP</button>}
                                    {isPhoneVerificationRequired && phoneVerificationStatus === 'sending' && <Loader className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={16}/>}
                                    {phoneVerificationStatus === 'verified' && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" size={16}/>}
                                </div>
                                {phoneError && <p className="text-red-600 text-sm mt-1 px-1">{phoneError}</p>}
                             </div>

                             {isPhoneVerificationRequired && (phoneVerificationStatus === 'sent' || phoneVerificationStatus === 'verifying') && (
                                <div className="space-y-1 pl-2">
                                    <div className="flex gap-2">
                                        <input type="text" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)} placeholder="Phone OTP" maxLength={6} className="flex-grow p-2 border rounded-lg" disabled={phoneVerificationStatus === 'verifying'}/>
                                        <button type="button" onClick={handleVerifyPhoneOtp} className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-black disabled:bg-gray-400 flex items-center justify-center w-28" disabled={phoneVerificationStatus === 'verifying'}>
                                            {phoneVerificationStatus === 'verifying' ? <Loader className="animate-spin" size={20}/> : "Verify"}
                                        </button>
                                    </div>
                                    <div className="text-right pr-1">
                                        <button type="button" onClick={handleSendPhoneOtp} disabled={phoneResendTimer > 0 || phoneVerificationStatus === 'verifying'} className="text-xs font-semibold text-blue-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed">
                                            {phoneResendTimer > 0 ? `Resend in ${phoneResendTimer}s` : 'Resend OTP'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {isAccountCreationRequired && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="password" name="password" value={details.password} onChange={handleChange} placeholder="Create Password" required minLength={6} className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${passwordError ? 'border-red-500' : 'border-gray-300'}`} disabled={isProcessing} /></div></div>
                                        <div><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="password" name="confirmPassword" value={details.confirmPassword} onChange={handleChange} placeholder="Confirm Password" required minLength={6} className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${passwordError ? 'border-red-500' : 'border-gray-300'}`} disabled={isProcessing} /></div></div>
                                    </div>
                                    {passwordError && <p className="text-red-600 text-sm -mt-3 px-1">{passwordError}</p>}
                                </>
                            )}
                            {containsAppPurchase && !userProfile?.referredBy && (
                                <div className="relative pt-2">
                                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={e => setReferralCode(e.target.value)}
                                        placeholder="Referral Code (Optional)"
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        disabled={isProcessing}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </main>
                <footer className="bg-white px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-xl border-t flex-shrink-0">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isProcessing || isUpdatingProfile}>Cancel</button>
                    <button type="submit" className="w-full sm:w-auto flex items-center justify-center py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-400" disabled={isProceedDisabled}>
                       {proceedButtonText()}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default GuestCheckoutModal;
