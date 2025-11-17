import React, { useState, useMemo } from 'react';
import { X, Check, ThumbsUp, ThumbsDown, Loader, Briefcase } from 'lucide-react';
import type { UserProfile, UserFormData, AppDefinition, UserApps, NotificationType, AffiliateStatus, Consultant, FairUsePolicy, UserAppSetting } from '../../types.ts';

import { functions } from '../../services/firebase.ts';

interface UserModalProps {
    user: UserProfile | null;
    allApps: AppDefinition[];
    onClose: () => void;
    onSave: (userData: UserFormData) => Promise<void>;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    consultants: Consultant[];
}

const UserModal: React.FC<UserModalProps> = ({ user, allApps, onClose, onSave, showNotification, consultants }) => {

    const [formData, setFormData] = useState<UserFormData>({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        validity: user?.validity || (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 25); return d.toISOString().split('T')[0]; })(),
        apps: user?.apps || {},
        password: '',
        affiliateStatus: user?.affiliateStatus || 'none',
        referredBy: user?.referredBy || '',
        canWriteBlog: user?.canWriteBlog || false,
    });

    const linkedConsultant = useMemo(() => {
        if (!user?.linkedConsultantId) return null;
        return consultants.find(c => c.id === user.linkedConsultantId);
    }, [user, consultants]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleAppAssignmentChange = (appId: string, isChecked: boolean) => {
        setFormData(prev => {
            const newApps: UserApps = { ...prev.apps };
            if (isChecked) {
                // When assigning a new app, default usage limit to 0 (unlimited).
                newApps[appId] = {
                    usageLimit: 0,
                };
            } else {
                delete newApps[appId];
            }
            return { ...prev, apps: newApps };
        });
    };

    const handleAppSettingChange = (appId: string, setting: keyof UserAppSetting, value: number | string | undefined) => {
        setFormData(prev => {
            const newApps = { ...prev.apps };
            const currentSetting = { ...newApps[appId] };

            if (value === undefined) {
                delete currentSetting[setting];
            } else {
                (currentSetting as any)[setting] = value;
            }

            newApps[appId] = currentSetting;
            return { ...prev, apps: newApps };
        });
    };
    
    const handleAppFairUsePolicyChange = (appId: string, field: keyof FairUsePolicy, value: string | number) => {
        setFormData(prev => {
            const currentAppSetting = prev.apps[appId];
            const currentPolicy = currentAppSetting?.fairUsePolicy;
    
            // If the change results in an empty/zero limit, we can remove the policy object
            if (field === 'limit' && Number(value) <= 0) {
                const { fairUsePolicy, ...restOfSetting } = currentAppSetting;
                return {
                    ...prev,
                    apps: {
                        ...prev.apps,
                        [appId]: restOfSetting,
                    }
                };
            }
    
            return {
                ...prev,
                apps: {
                    ...prev.apps,
                    [appId]: {
                        ...currentAppSetting,
                        fairUsePolicy: {
                            ...(currentPolicy || { limit: 0, frequency: 'daily' }),
                            [field]: value
                        }
                    }
                }
            };
        });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <header className="p-6 sm:p-8 border-b">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800">{user ? 'Edit User Profile' : 'Create New User Profile'}</h3>
                            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                    </header>
                    <main className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                        {linkedConsultant && (
                            <div className="p-3 bg-purple-50 border-l-4 border-purple-400 text-purple-800 rounded-r-lg">
                                <h4 className="font-bold flex items-center gap-2"><Briefcase size={16}/> Consultant Link</h4>
                                <p className="text-sm mt-1">This user is linked to and can manage the profile for <span className="font-semibold">{linkedConsultant.name}</span>.</p>
                                <p className="text-xs mt-1">This link can only be changed from the Consultant Dashboard.</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"/>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500" disabled={!!user} />
                            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Mobile Number (Optional)" className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"/>
                             <div>
                                <label htmlFor="validity" className="text-sm font-medium text-gray-700 mb-1 block">Account Validity Until</label>
                                <input id="validity" type="date" name="validity" value={formData.validity} onChange={handleChange} required className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900"/>
                            </div>
                            {!user && (
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Temporary Password (min. 6 chars)"
                                    required
                                    minLength={6}
                                    className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500 md:col-span-2"
                                />
                            )}
                            <div className="md:col-span-2">
                                <label htmlFor="referredBy" className="text-sm font-medium text-gray-700 mb-1 block">Referred By (Affiliate ID)</label>
                                <input 
                                    id="referredBy"
                                    name="referredBy"
                                    type="text"
                                    value={formData.referredBy}
                                    onChange={handleChange}
                                    placeholder="Enter affiliate's ref ID (optional)"
                                    className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                                />
                            </div>
                        </div>

                        <div>
                           <label className="text-sm font-medium text-gray-700 mb-2 block">Application Access & Usage Limits</label>
                           <div className="p-3 bg-gray-50 rounded-lg border max-h-64 overflow-y-auto space-y-2">
                               {allApps.length > 0 ? allApps.map(app => {
                                   const isAssigned = !!formData.apps[app.id];
                                   const appSettings = formData.apps[app.id];
                                   return (
                                       <div key={app.id} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                                           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                               <label className="flex items-center space-x-3 mb-2 sm:mb-0 cursor-pointer">
                                                   <input 
                                                       type="checkbox" 
                                                       checked={isAssigned} 
                                                       onChange={(e) => handleAppAssignmentChange(app.id, e.target.checked)} 
                                                       className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                   <span className="text-gray-800 font-medium">{app.name}</span>
                                               </label>
                                               {isAssigned && appSettings && (
                                                   <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center w-full sm:w-auto pl-8 sm:pl-0">
                                                        <div className="flex items-center gap-2">
                                                            <label htmlFor={`limit-${app.id}`} className="text-sm text-gray-600">Limit:</label>
                                                            <input 
                                                                id={`limit-${app.id}`}
                                                                type="number"
                                                                min="0"
                                                                placeholder="0 for unlimited"
                                                                value={appSettings.usageLimit}
                                                                onChange={(e) => handleAppSettingChange(app.id, 'usageLimit', parseInt(e.target.value, 10) || 0)}
                                                                className="p-1 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition text-sm w-28 bg-white text-gray-900 placeholder-gray-500"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <label htmlFor={`expiry-${app.id}`} className="text-sm text-gray-600">Expiry:</label>
                                                            <input 
                                                                id={`expiry-${app.id}`}
                                                                type="date"
                                                                value={appSettings.expiryDate || ''}
                                                                onChange={(e) => handleAppSettingChange(app.id, 'expiryDate', e.target.value)}
                                                                className="p-1 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition text-sm w-40 bg-white text-gray-900"
                                                            />
                                                        </div>
                                                   </div>
                                               )}
                                           </div>
                                            {isAssigned && appSettings && (
                                                <div className="mt-3 pt-3 border-t border-gray-200 w-full pl-8 space-y-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label htmlFor={`maxProjects-${app.id}`} className="text-xs font-medium text-gray-500">Max Projects (Override)</label>
                                                            <input
                                                                id={`maxProjects-${app.id}`}
                                                                type="number"
                                                                min="0"
                                                                placeholder="App Default"
                                                                value={appSettings.maxProjects ?? ''}
                                                                onChange={(e) => handleAppSettingChange(app.id, 'maxProjects', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                                                className="p-1 border rounded-md w-full text-sm mt-1"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor={`projExpiry-${app.id}`} className="text-xs font-medium text-gray-500">Project Expiry Days (Override)</label>
                                                            <input
                                                                id={`projExpiry-${app.id}`}
                                                                type="number"
                                                                min="0"
                                                                placeholder="App Default"
                                                                value={appSettings.projectExpirationDays ?? ''}
                                                                onChange={(e) => handleAppSettingChange(app.id, 'projectExpirationDays', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                                                className="p-1 border rounded-md w-full text-sm mt-1"
                                                            />
                                                        </div>
                                                    </div>

                                                    {appSettings.usageLimit === 0 && (
                                                        <div className="pt-3 border-t border-gray-200">
                                                            <label className="text-xs font-medium text-gray-500">User-Specific Fair Use Policy (Overrides App Default)</label>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                                                                <div>
                                                                    <label htmlFor={`fup-limit-${app.id}`} className="sr-only">Limit</label>
                                                                    <input
                                                                        id={`fup-limit-${app.id}`}
                                                                        type="number"
                                                                        value={appSettings.fairUsePolicy?.limit || ''}
                                                                        onChange={e => handleAppFairUsePolicyChange(app.id, 'limit', parseInt(e.target.value, 10) || 0)}
                                                                        placeholder="Limit"
                                                                        min="0"
                                                                        className="p-1 border rounded-md w-full text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`fup-freq-${app.id}`} className="sr-only">Frequency</label>
                                                                    <select
                                                                        id={`fup-freq-${app.id}`}
                                                                        value={appSettings.fairUsePolicy?.frequency || 'daily'}
                                                                        onChange={e => handleAppFairUsePolicyChange(app.id, 'frequency', e.target.value as 'daily'|'monthly'|'yearly')}
                                                                        className="p-1 border rounded-md w-full text-sm bg-white"
                                                                    >
                                                                        <option value="daily">Daily</option>
                                                                        <option value="monthly">Monthly</option>
                                                                        <option value="yearly">Yearly</option>
                                                                    </select>
                                                                </div>
                                                                <div className="sm:col-span-3">
                                                                    <label htmlFor={`fup-text-${app.id}`} className="sr-only">Custom Text</label>
                                                                    <input
                                                                        id={`fup-text-${app.id}`}
                                                                        type="text"
                                                                        value={appSettings.fairUsePolicy?.customText || ''}
                                                                        onChange={e => handleAppFairUsePolicyChange(app.id, 'customText', e.target.value)}
                                                                        placeholder="Custom text (optional)"
                                                                        className="p-1 border rounded-md w-full text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-1">Set a specific limit for this user on this unlimited plan. Leave limit blank or 0 to use the app's default policy.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                       </div>
                                   );
                               }) : <p className="text-sm text-gray-500 italic p-2">No applications have been created yet. Add apps in the admin dashboard.</p>}
                           </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Permissions</label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                                 <label className="flex items-center space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="canWriteBlog"
                                        checked={!!formData.canWriteBlog} 
                                        onChange={handleChange} 
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-gray-800 font-medium">Can Write Blog Posts</span>
                                </label>
                            </div>
                        </div>
                    </main>
                    <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Save Profile</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default UserModal;