
import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, Loader, CreditCard, Tag, CheckCircle, QrCode } from 'lucide-react';
import type { CartItem, NotificationType } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';
import { functions } from '../../services/firebase.ts';


export interface AppliedCoupon {
    code: string;
    discountPercentage: number;
    appIds: string[];
}

interface CartModalProps {
    cart: CartItem[];
    onClose: () => void;
    onRemoveItem: (index: number) => void;
    onPayOnline: () => void;
    onPayManually: () => void;
    isProcessing: boolean;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    appliedCoupon: AppliedCoupon | null;
    setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
}

const formatTime12hr = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const calculateEndTime = (startTime: string, duration: number): string => {
    if (!startTime || !duration) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    return endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};


const CartModal: React.FC<CartModalProps> = ({ cart, onClose, onRemoveItem, onPayOnline, onPayManually, isProcessing, showNotification, appliedCoupon, setAppliedCoupon }) => {
    
    const [couponInput, setCouponInput] = useState('');
    const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      setIsVisible(true);
    }, []);

    useEffect(() => {
        if(appliedCoupon) {
            setCouponInput(appliedCoupon.code);
        }
    }, [appliedCoupon]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    
    let totalDiscountAmount = 0;
    if (appliedCoupon) {
        cart.forEach(item => {
            if (appliedCoupon.appIds.includes(item.appId)) {
                totalDiscountAmount += item.price * (appliedCoupon.discountPercentage / 100);
            }
        });
    }
    const totalAmount = subtotal - totalDiscountAmount;

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setIsVerifyingCoupon(true);
        setAppliedCoupon(null);

        try {
            const validateCouponFn = functions.httpsCallable('validateCoupon');
            const result = await validateCouponFn({ code: couponInput.trim().toUpperCase(), items: cart });
            const data = result.data as { success: boolean; message: string; discountPercentage?: number; appIds?: string[]; };

            if (data.success && data.discountPercentage && data.appIds) {
                setAppliedCoupon({ code: couponInput.trim().toUpperCase(), discountPercentage: data.discountPercentage, appIds: data.appIds });
                showNotification(data.message, 'success');
            } else {
                showNotification(data.message, 'error');
            }
        } catch (error: any) {
            console.error("Coupon validation error:", error);
            showNotification(error.message || "Failed to validate coupon.", 'error');
        } finally {
            setIsVerifyingCoupon(false);
        }
    };
    
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput('');
        showNotification("Coupon removed.", "info");
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4 backdrop-blur-sm" onClick={handleClose}>
            <div 
                className={`absolute top-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[calc(100vh-3rem)] flex flex-col transition-all duration-300 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'}`}
                onClick={e => e.stopPropagation()}
            >
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="text-blue-600" size={24} />
                            <h3 className="text-2xl font-bold text-gray-800">Your Cart</h3>
                        </div>
                        <button type="button" onClick={handleClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors" disabled={isProcessing}><X size={24} /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50/50">
                    {cart.length > 0 ? (
                        cart.map((item, index) => {
                             const isDiscounted = appliedCoupon?.appIds.includes(item.appId);
                             const originalPrice = item.price;
                             const discountedPrice = isDiscounted ? originalPrice * (1 - appliedCoupon.discountPercentage / 100) : originalPrice;

                            return (
                                <div key={`${item.tierId}-${index}`} className="flex items-start gap-4 p-3 bg-white border rounded-lg shadow-sm">
                                    <AppIcon icon={item.appIcon} name={item.appName} className="h-12 w-12 rounded-md flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800">{item.appName}</p>
                                        {item.isConsultation && item.appointmentTime && item.durationInMinutes && item.appointmentDate ? (
                                            <p className="text-sm text-gray-600">
                                                <span className="font-semibold">{formatTime12hr(item.appointmentTime)} - {calculateEndTime(item.appointmentTime, item.durationInMinutes)}</span>
                                                <br />
                                                on {new Date(item.appointmentDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-600">
                                                {item.tierName}
                                                {!item.isWebinar && ` - ${item.credits === 0 ? 'Unlimited credits' : `${item.credits.toLocaleString()} credits`}`}
                                            </p>
                                        )}
                                        {isDiscounted && (
                                            <p className="text-xs text-green-600 font-semibold mt-1">
                                                {appliedCoupon.discountPercentage}% Discount Applied
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`font-semibold text-gray-800 ${isDiscounted ? 'line-through text-gray-400' : ''}`}>
                                            ₹{(originalPrice / 100).toFixed(2)}
                                        </p>
                                        {isDiscounted && (
                                            <p className="font-bold text-green-600">
                                                ₹{(discountedPrice / 100).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onRemoveItem(index)}
                                        className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors self-center"
                                        aria-label={`Remove ${item.tierName} for ${item.appName}`}
                                        disabled={isProcessing}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-gray-500 py-12">Your cart is empty.</p>
                    )}
                </main>
                 <footer className="bg-gray-50 px-6 py-4 space-y-4 rounded-b-xl border-t flex-shrink-0">
                    <div className="space-y-2">
                         {!appliedCoupon ? (
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value)}
                                        placeholder="Enter Coupon Code"
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                                        disabled={isVerifyingCoupon || isProcessing}
                                    />
                                </div>
                                <button
                                    onClick={handleApplyCoupon}
                                    disabled={!couponInput || isVerifyingCoupon || isProcessing}
                                    className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-black transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center w-28"
                                >
                                    {isVerifyingCoupon ? <Loader className="animate-spin" size={20} /> : "Apply"}
                                </button>
                            </div>
                         ) : (
                             <div className="p-2 bg-green-100 text-green-800 rounded-lg flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    <p>Coupon <strong>{appliedCoupon.code}</strong> applied!</p>
                                </div>
                                <button onClick={handleRemoveCoupon} className="p-1 rounded-full hover:bg-green-200">
                                    <X size={16} />
                                </button>
                            </div>
                         )}
                    </div>
                     <div className="pt-4 border-t text-right space-y-1">
                        <div className="text-gray-600">Subtotal: <span className="font-medium text-gray-800">₹{(subtotal / 100).toFixed(2)}</span></div>
                         {totalDiscountAmount > 0 && (
                            <div className="text-green-600">Discount: <span className="font-medium">- ₹{(totalDiscountAmount / 100).toFixed(2)}</span></div>
                        )}
                        <div className="font-bold text-2xl text-gray-800">Total: <span className="text-blue-600">₹{(totalAmount / 100).toFixed(2)}</span></div>
                    </div>
                    <div className="space-y-2">
                        <button
                            onClick={() => onPayOnline()}
                            disabled={cart.length === 0 || isProcessing}
                            className="w-full flex items-center justify-center py-3 px-8 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400"
                        >
                            {isProcessing ? (
                                <><Loader className="animate-spin mr-2" size={20} /> Processing...</>
                            ) : (
                                <><CreditCard size={18} className="mr-2" /> Pay Online (Razorpay)</>
                            )}
                        </button>
                        <button
                            onClick={() => onPayManually()}
                            disabled={cart.length === 0 || isProcessing}
                            className="w-full flex items-center justify-center py-3 px-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400"
                        >
                            <QrCode size={18} className="mr-2"/> Pay Manually (QR Code)
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CartModal;
