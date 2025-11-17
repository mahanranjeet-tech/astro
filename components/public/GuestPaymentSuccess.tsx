



import React from 'react';
import { CheckCircle, LogIn } from 'lucide-react';

const GuestPaymentSuccess: React.FC = () => {
    return (
        <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-14 w-14 text-green-600" aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Your Purchase and Account Creation were Successful!</h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                Welcome aboard! Your credits have been added and your new account is ready.
            </p>
            <p className="mt-2 text-md text-slate-500 max-w-2xl mx-auto">
                You can now log in using the email and password you provided.
            </p>
            <div className="mt-8">
                <a 
                    href="/login" 
                    className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-transform hover:scale-105 shadow-lg"
                >
                    <LogIn size={20} className="mr-2"/> Proceed to Login
                </a>
            </div>
        </div>
    );
};

export default GuestPaymentSuccess;