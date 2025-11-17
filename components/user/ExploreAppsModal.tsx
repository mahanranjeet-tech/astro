
import React, { useMemo } from 'react';
import { X, Zap } from 'lucide-react';
import type { AppDefinition, UserApps } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';
import TruncatedText from '../shared/TruncatedText.tsx';

interface ExploreAppsModalProps {
    allApps: AppDefinition[];
    assignedAppsMap: UserApps;
    onClose: () => void;
    onPurchase: (app: AppDefinition) => void;
}


const ExploreAppsModal: React.FC<ExploreAppsModalProps> = ({ allApps, assignedAppsMap, onClose, onPurchase }) => {
    
    const purchasableApps = useMemo(() => {
        return allApps.filter(app => !app.comingSoon && !assignedAppsMap.hasOwnProperty(app.id));
    }, [allApps, assignedAppsMap]);

    const comingSoonApps = useMemo(() => {
        return allApps.filter(app => app.comingSoon && !assignedAppsMap.hasOwnProperty(app.id));
    }, [allApps, assignedAppsMap]);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b sticky top-0 bg-white rounded-t-xl z-10">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">Explore More Apps</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Browse other software available in the portal. Purchase credits to gain access.</p>
                </header>
                <main className="p-6 space-y-6 overflow-y-auto bg-gray-50/50">
                    {purchasableApps.length > 0 && (
                        <div>
                             <h4 className="text-lg font-semibold text-gray-700 mb-4">Available for Purchase</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {purchasableApps.map(app => (
                                    <div key={app.id} className="p-4 rounded-lg flex flex-col justify-between bg-white border shadow-sm">
                                        <div>
                                            <div className="flex items-center mb-3">
                                                 <AppIcon icon={app.icon} name={app.name} className="h-12 w-12 mr-4 rounded-lg flex-shrink-0"/>
                                                <div className="flex-grow">
                                                    <h4 className="text-lg font-bold text-gray-800">{app.name}</h4>
                                                </div>
                                            </div>
                                            <TruncatedText text={app.description || ''} maxLength={80} />
                                        </div>
                                        <div className="mt-4">
                                            <button
                                                onClick={() => onPurchase(app)}
                                                className="w-full flex items-center justify-center py-2 px-4 rounded-md font-semibold text-sm text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
                                            >
                                                <Zap size={16} className="mr-2" /> Buy App Credits
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {comingSoonApps.length > 0 && (
                         <div>
                            <h4 className={`text-lg font-semibold text-gray-700 mb-4 ${purchasableApps.length > 0 ? 'border-t pt-6 mt-6' : ''}`}>Coming Soon</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {comingSoonApps.map(app => (
                                    <div key={app.id} className="p-4 rounded-lg flex flex-col justify-between bg-white border shadow-sm opacity-70">
                                        <div>
                                            <div className="flex items-center mb-3">
                                                <AppIcon icon={app.icon} name={app.name} className="h-12 w-12 mr-4 rounded-lg flex-shrink-0"/>
                                                <div className="flex-grow">
                                                    <h4 className="text-lg font-bold text-gray-800">{app.name}</h4>
                                                     <span className="text-xs font-bold uppercase text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Coming Soon</span>
                                                </div>
                                            </div>
                                            <TruncatedText text={app.description || ''} maxLength={80} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {purchasableApps.length === 0 && comingSoonApps.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                             <h4 className="text-xl font-semibold">No Other Apps Available</h4>
                             <p>You have been assigned all available applications.</p>
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

export default ExploreAppsModal;