
import React, { useEffect, useState } from 'react';
import { Check, Calendar, Clock } from 'lucide-react';
import type { CartItem } from '../../types.ts';
import { formatDate } from '../../utils/date.ts';

interface PaymentSuccessAnimationProps {
    onClose: () => void;
    items: CartItem[] | null;
}

const PaymentSuccessAnimation: React.FC<PaymentSuccessAnimationProps> = ({ onClose, items }) => {
    const [isVisible, setIsVisible] = useState(false);

    const webinarItem = items?.find(item => item.isWebinar);

    const formatTime12hr = (time24?: string) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHours = h % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
    };

    useEffect(() => {
        // Mount animation
        setIsVisible(true);

        // Auto-close after a delay
        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for fade-out transition before calling onClose
            setTimeout(onClose, 300);
        }, webinarItem ? 4000 : 2500); // Longer timeout for webinar details

        return () => clearTimeout(timer);
    }, [onClose, webinarItem]);

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[9999] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} role="alertdialog" aria-modal="true" aria-labelledby="success-title">
            <div className={`bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center transform transition-all duration-300 ${isVisible ? 'scale-100' : 'scale-95'}`}>
                <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                    <div className="relative flex items-center justify-center w-24 h-24 bg-green-500 rounded-full">
                        <Check className="text-white h-16 w-16" strokeWidth={3} />
                    </div>
                </div>
                {webinarItem ? (
                     <>
                        <h3 id="success-title" className="text-2xl font-bold text-gray-800">Webinar Booked Successfully!</h3>
                        <div className="text-gray-600 mt-4 text-left bg-gray-50 p-4 rounded-lg border w-full max-w-sm">
                            <p className="font-semibold text-lg text-gray-800">{webinarItem.appName}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm">
                                <Calendar size={16} className="text-gray-500"/>
                                <span>{formatDate(webinarItem.webinarDate || '')}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm">
                                <Clock size={16} className="text-gray-500"/>
                                <span>{formatTime12hr(webinarItem.webinarTime)}</span>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Details and the joining link have been sent to your registered email address.</p>
                    </>
                ) : (
                    <>
                        <h3 id="success-title" className="text-2xl font-bold text-gray-800">Payment Successful!</h3>
                        <p className="text-gray-600 mt-2">Your credits have been added to your account.</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccessAnimation;