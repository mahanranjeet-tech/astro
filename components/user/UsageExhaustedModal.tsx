import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import type { AppDefinition } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';

interface UsageExhaustedModalProps {
    app: AppDefinition;
    onClose: () => void;
    onProceed?: () => void;
    onPurchase: (app: AppDefinition) => void;
    mode: 'pre-launch' | 'in-app';
    reason: 'limit_reached' | 'fair_use_limit_reached' | 'app_expired';
    usageCount: number;
    limit: number;
}

const UsageExhaustedModal: React.FC<UsageExhaustedModalProps> = ({ app, onClose, onProceed, onPurchase, mode, reason, usageCount, limit }) => {
    const content = {
        limit_reached: {
            title: 'Usage Limit Reached',
            message: `You have used all your credits (${usageCount}/${limit}) for this app. You can still view past records but cannot generate new ones.`
        },
        fair_use_limit_reached: {
            title: 'Daily Limit Reached',
            message: `You have exhausted your daily limit of ${limit} uses under our fair use policy. Please come back tomorrow. Your limit will reset at 12:00 AM.`
        },
        app_expired: {
            title: 'Application Access Expired',
            message: 'Your access for this application has expired. To continue using it, please purchase a new credit pack to renew your access.'
        }
    };

    const { title, message } = content[reason];

    const handlePurchaseClick = () => {
        onPurchase(app);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md text-center p-8 transform transition-all">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                    <AlertTriangle className="h-10 w-10 text-yellow-600" aria-hidden="true" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
                
                <div className="flex items-center justify-center gap-3 my-4">
                     <AppIcon icon={app.icon} name={app.name} className="h-8 w-8 rounded-md flex-shrink-0"/>
                     <p className="text-lg font-semibold text-gray-700">{app.name}</p>
                </div>

                <div className="mt-2 text-md text-gray-600 space-y-2">
                    <p>{message}</p>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                    {(reason === 'limit_reached' || reason === 'app_expired') && (
                        <button
                            onClick={handlePurchaseClick}
                            className="w-full flex items-center justify-center py-3 px-4 rounded-lg font-semibold text-white transition-colors bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            <Zap size={18} className="mr-2" /> Purchase to Renew Access
                        </button>
                    )}
                    
                    {mode === 'pre-launch' && onProceed && (reason === 'limit_reached' || reason === 'app_expired') && (
                        <button 
                            type="button" 
                            onClick={onProceed} 
                            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Proceed to App (View-only)
                        </button>
                    )}
                     
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-full rounded-lg bg-gray-200 px-6 py-3 text-base font-medium text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                    >
                        {reason === 'fair_use_limit_reached' ? 'OK' : (mode === 'pre-launch' ? 'Cancel' : 'Continue Viewing')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UsageExhaustedModal;