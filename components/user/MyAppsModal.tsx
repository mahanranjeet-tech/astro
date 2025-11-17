import React from 'react';
import { X, ArrowRight, Zap } from 'lucide-react';
import type { AppDefinition, UserApps, UserAppSetting } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';
import TruncatedText from '../shared/TruncatedText.tsx';
import { formatDate } from '../../utils/date.ts';

interface MyAppsModalProps {
    assignedApps: AppDefinition[];
    usageCounts: Record<string, number>;
    userAppsSettings: UserApps;
    onClose: () => void;
    onLaunch: (app: AppDefinition) => void;
    onPurchaseCredits: (app: AppDefinition) => void;
}

const AppCard: React.FC<{
    app: AppDefinition;
    setting: UserAppSetting;
    used: number;
    onLaunch: (app: AppDefinition) => void;
    onPurchaseCredits: (app: AppDefinition) => void;
}> = ({ app, setting, used, onLaunch, onPurchaseCredits }) => {
    const limit = setting.usageLimit ?? 0;
    const isLimitReached = limit > 0 && used >= limit;
    const todayStr = new Date().toISOString().split('T')[0];
    const isExpired = setting.expiryDate && setting.expiryDate < todayStr;
    const isInactive = isLimitReached || isExpired;

    const userPolicy = setting.fairUsePolicy;
    const appPolicy = app.fairUsePolicy;
    const policy = userPolicy || appPolicy;

    return (
        <div className="p-4 rounded-lg flex flex-col justify-between bg-white border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div>
                <div className="flex items-center mb-3">
                    <AppIcon icon={app.icon} name={app.name} className="h-12 w-12 mr-4 rounded-lg flex-shrink-0"/>
                    <div className="flex-grow">
                        <h4 className="text-lg font-bold text-gray-800">{app.name}</h4>
                        {limit === 0 ? (
                            <>
                                <p className="text-xs font-mono text-gray-500 mt-1">Usage: Unlimited</p>
                                {policy && policy.limit > 0 && (
                                    <p className="text-xs text-gray-500 mt-0.5" title={`Fair use: ${policy.limit} credits per ${policy.frequency.replace('ily', 'y').replace('ly', '')}${policy.customText ? ` - ${policy.customText}` : ''}`}>
                                        Fair use: {policy.limit}/{policy.frequency.replace('ily', 'y').replace('ly', '')}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-xs font-mono text-gray-500 mt-1">
                                Usage: {used} / {limit}
                            </p>
                        )}
                         <div className="mt-1">
                            {setting.expiryDate ? (
                                isExpired ? (
                                    <span className="text-xs font-semibold inline-flex px-2 py-1 leading-5 rounded-full bg-red-100 text-red-800">
                                        Has expired on: {formatDate(setting.expiryDate)}
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold inline-flex px-2 py-1 leading-5 rounded-full bg-green-100 text-green-800">
                                        Will expire on: {formatDate(setting.expiryDate)}
                                    </span>
                                )
                            ) : (
                                <span className="text-xs font-semibold inline-flex px-2 py-1 leading-5 rounded-full bg-gray-100 text-gray-800">
                                    Expires: Never
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <TruncatedText text={app.description || ''} maxLength={80} />
            </div>
            <div className="mt-4 flex flex-col gap-2">
                 {app.comingSoon ? (
                     <button
                        disabled
                        className="w-full flex items-center justify-center py-2 px-4 rounded-md font-semibold text-sm text-white bg-gray-400 cursor-not-allowed"
                    >
                        Coming Soon
                    </button>
                ) : isInactive ? (
                    <>
                        <button
                            disabled
                            className="w-full flex items-center justify-center py-2 px-4 rounded-md font-semibold text-sm text-white bg-gray-400 cursor-not-allowed"
                        >
                            Launch App <ArrowRight size={16} className="ml-2" />
                        </button>
                        <button
                            onClick={() => onPurchaseCredits(app)}
                            className="w-full flex items-center justify-center py-2 px-4 rounded-md font-semibold text-sm transition-colors text-orange-700 bg-orange-100 hover:bg-orange-200"
                        >
                            <Zap size={16} className="mr-2" /> Buy Credits / Plan
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => onLaunch(app)}
                            className="w-full flex items-center justify-center py-2 px-4 rounded-md font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            Launch App <ArrowRight size={16} className="ml-2" />
                        </button>
                        <button
                            onClick={() => onPurchaseCredits(app)}
                            className="w-full flex items-center justify-center py-2 px-4 rounded-md font-semibold text-sm transition-colors text-green-700 bg-green-100 hover:bg-green-200"
                        >
                            <Zap size={16} className="mr-2" /> Buy More Credits
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export function MyAppsModal({ assignedApps, usageCounts, userAppsSettings, onClose, onLaunch, onPurchaseCredits }: MyAppsModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b sticky top-0 bg-white rounded-t-xl z-10">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">My Applications</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Your personally assigned applications.</p>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto bg-gray-50/50">
                    {assignedApps.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assignedApps.map(app => (
                                <AppCard
                                    key={app.id}
                                    app={app}
                                    setting={userAppsSettings[app.id]}
                                    used={usageCounts[app.id] ?? 0}
                                    onLaunch={onLaunch}
                                    onPurchaseCredits={onPurchaseCredits}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-500">
                             <h4 className="text-xl font-semibold">No Applications Found</h4>
                             <p>You have not been assigned any applications yet.</p>
                        </div>
                    )}
                </main>
                 <footer className="bg-white px-6 py-3 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Close</button>
                </footer>
            </div>
        </div>
    );
};
export default MyAppsModal;