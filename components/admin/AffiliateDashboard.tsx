import React, { useState, useMemo, useEffect, Fragment } from 'react';
import type { AffiliateProfile, Payout, UserProfile, NotificationType, Referral } from '../../types.ts';
import { ThumbsUp, ThumbsDown, Search, Send, Loader, Percent, Save, UserX, UserCheck, RefreshCw, ChevronDown, ChevronRight, Edit } from 'lucide-react';
import { formatTimestamp } from '../../utils/date.ts';

import { db, functions } from '../../services/firebase.ts';
import PayoutModal from './PayoutModal.tsx';


interface AffiliateDashboardProps {
    affiliateProfiles: AffiliateProfile[];
    payouts: Payout[];
    users: UserProfile[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ReferralDetails: React.FC<{ referrals: Referral[] }> = ({ referrals }) => (
    <div className="bg-blue-50 p-4">
        <h5 className="font-semibold text-blue-800 mb-2">Referral History</h5>
        {referrals.length > 0 ? (
            <div className="overflow-x-auto max-h-60">
                <table className="w-full text-xs">
                    <thead className="text-blue-900 bg-blue-100">
                        <tr>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Customer</th>
                            <th className="px-3 py-2 text-left">Purchase</th>
                            <th className="px-3 py-2 text-right">Commission</th>
                        </tr>
                    </thead>
                    <tbody>
                        {referrals.map(ref => (
                            <tr key={ref.id} className="border-b border-blue-200 last:border-b-0">
                                <td className="px-3 py-2 whitespace-nowrap">{formatTimestamp(ref.createdAt)}</td>
                                <td className="px-3 py-2">{ref.newCustomerName}</td>
                                <td className="px-3 py-2">{ref.items.map(i => i.appName).join(', ')}</td>
                                <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(ref.commissionAmount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <p className="text-center italic text-gray-500 py-3">No referral history for this affiliate.</p>
        )}
    </div>
);


const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({ affiliateProfiles, payouts, users, showNotification }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null); // userId for affiliate, payoutId for payout
    const [payoutToProcess, setPayoutToProcess] = useState<Payout | null>(null);
    const [commissionRate, setCommissionRate] = useState('');
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [pendingCommissionRates, setPendingCommissionRates] = useState<Record<string, string>>({}); // For pending users
    const [editingRates, setEditingRates] = useState<Record<string, string>>({}); // For active users

    const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
    const [referralDetails, setReferralDetails] = useState<Record<string, Referral[]>>({});
    const [isLoadingReferrals, setIsLoadingReferrals] = useState<string | null>(null);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const fetchConfig = async () => {
        setIsSettingsLoading(true);
        try {
            const getConfig = functions.httpsCallable('getAffiliateConfiguration');
            const result = await getConfig();
            const data = result.data as { commissionRate: number };
            setCommissionRate(String(data.commissionRate));
            affiliateProfiles.forEach(p => {
                if(p.status === 'pending') {
                    setPendingCommissionRates(prev => ({...prev, [p.userId]: String(data.commissionRate)}));
                }
            })

        } catch (error) {
            showNotification('Failed to load affiliate settings.', 'error');
        } finally {
            setIsSettingsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchConfig();
    }, [showNotification, affiliateProfiles]);

    const handleToggleExpand = async (profileId: string) => {
        const newExpandedId = expandedProfileId === profileId ? null : profileId;
        setExpandedProfileId(newExpandedId);
        
        if (newExpandedId && !referralDetails[newExpandedId]) {
            setIsLoadingReferrals(newExpandedId);
            try {
                const query = db.collection('affiliate_profiles').doc(newExpandedId).collection('referrals').orderBy('createdAt', 'desc');
                const snapshot = await query.get();
                const fetchedReferrals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
                setReferralDetails(prev => ({ ...prev, [newExpandedId]: fetchedReferrals }));
            } catch (error) {
                console.error("Failed to fetch referral details:", error);
                showNotification("Could not load referral details.", "error");
            } finally {
                setIsLoadingReferrals(null);
            }
        }
    };

    const handleSaveSettings = async () => {
        const rate = parseFloat(commissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            showNotification('Please enter a valid commission rate between 0 and 100.', 'error');
            return;
        }
        setIsSettingsLoading(true);
        try {
            const updateSettingsFn = functions.httpsCallable('updateAffiliateSettings');
            await updateSettingsFn({ commissionRate: rate });
            showNotification('Affiliate settings updated successfully!', 'success');
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setIsSettingsLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        setActionLoading(userId);
        try {
            const rateInput = pendingCommissionRates[userId];
            const rate = rateInput ? parseFloat(rateInput) : undefined;

            if (rate !== undefined && (isNaN(rate) || rate < 0 || rate > 100)) {
                throw new Error("Invalid commission rate provided.");
            }

            const approveFunction = functions.httpsCallable('approveAffiliateRequest');
            await approveFunction({ userId, commissionRate: rate });
            showNotification(`User has been approved.`, 'success');
        } catch (error: any) {
             showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleReject = async (userId: string) => {
        setActionLoading(userId);
        try {
            const rejectFunction = functions.httpsCallable('rejectAffiliateRequest');
            await rejectFunction({ userId });
            showNotification(`User has been rejected.`, 'success');
        } catch (error: any) {
             showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setActionLoading(null);
        }
    }
    
    const handleUpdateRate = async (userId: string) => {
        setActionLoading(userId);
        try {
            const updateFunction = functions.httpsCallable('updateAffiliateProfile');
            
            const rateInput = editingRates[userId];
            let rate: number | null = null;
            
            if (rateInput === '' || rateInput == null) {
                // User cleared the input, so we reset to global by deleting the field.
                rate = null;
            } else {
                rate = parseFloat(rateInput);
                if (isNaN(rate) || rate < 0 || rate > 100) {
                    throw new Error("Invalid commission rate. Must be between 0 and 100.");
                }
            }
            
            await updateFunction({ userId, commissionRate: rate });
            showNotification('Commission rate updated!', 'success');
            // Clear the editing state for this user
            setEditingRates(prev => {
                const newRates = { ...prev };
                delete newRates[userId];
                return newRates;
            });
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setActionLoading(null);
        }
    };


    const handleDeactivate = async (userId: string) => {
        if (!window.confirm("Are you sure you want to deactivate this affiliate? They will stop earning new commissions.")) return;
        
        setActionLoading(userId);
        try {
            const deactivateFunction = functions.httpsCallable('deactivateAffiliate');
            await deactivateFunction({ userId });
            showNotification(`Affiliate has been deactivated.`, 'success');
        } catch (error: any) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            setActionLoading(null);
        }
    }

    const filteredAffiliates = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return affiliateProfiles
            .map(profile => ({ ...profile, user: userMap.get(profile.userId) }))
            .filter(profile => profile.user && (
                profile.user.name.toLowerCase().includes(lowercasedTerm) ||
                profile.user.email?.toLowerCase().includes(lowercasedTerm) ||
                profile.refId?.toLowerCase().includes(lowercasedTerm)
            ))
            .sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    }, [searchTerm, affiliateProfiles, userMap]);

    const pendingPayouts = useMemo(() => payouts.filter(p => p.status === 'pending').sort((a,b) => (a.requestedAt?.toMillis() || 0) - (b.requestedAt?.toMillis() || 0)), [payouts]);
    
    const renderActionButtons = (profile: AffiliateProfile & { user?: UserProfile }) => {
        const isLoading = actionLoading === profile.userId;

        switch (profile.status) {
            case 'pending':
            case 'left':
            case 'rejected':
                return (
                    <div className="flex items-center justify-center gap-2">
                        <div className="relative w-20">
                            <input
                                type="number"
                                value={pendingCommissionRates[profile.userId] || ''}
                                onChange={e => setPendingCommissionRates(prev => ({...prev, [profile.userId]: e.target.value}))}
                                className="w-full p-1.5 pr-6 border rounded-md text-xs bg-white text-gray-900 placeholder-gray-500"
                                placeholder="Rate"
                                disabled={isLoading}
                            />
                             <Percent className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
                        </div>
                        <button onClick={() => handleApprove(profile.userId)} disabled={isLoading} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Approve">
                           {isLoading ? <Loader className="animate-spin" size={18}/> : <UserCheck size={18}/>}
                        </button>
                        {profile.status === 'pending' && (
                             <button onClick={() => handleReject(profile.userId)} disabled={isLoading} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Reject">
                                 <UserX size={18}/>
                             </button>
                        )}
                    </div>
                );
            case 'active':
                return (
                    <div className="flex items-center justify-center gap-1">
                        <button 
                            onClick={() => handleUpdateRate(profile.userId)} 
                            disabled={isLoading || editingRates[profile.userId] === undefined}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-full disabled:text-gray-300 disabled:hover:bg-transparent" title="Save Commission Rate">
                            {isLoading ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>}
                        </button>
                        <button onClick={() => handleDeactivate(profile.userId)} disabled={isLoading} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Deactivate Affiliate">
                            <UserX size={18}/>
                        </button>
                    </div>
                );
            default:
                return 'N/A';
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Affiliate Management</h2>
            
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Payouts Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Pending Payouts</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Date Requested</th>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Payout Details</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingPayouts.map(payout => (
                                    <tr key={payout.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">{formatTimestamp(payout.requestedAt)}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{payout.userName}</td>
                                        <td className="px-6 py-4 whitespace-pre-wrap max-w-xs">{payout.details}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(payout.amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setPayoutToProcess(payout)} 
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-semibold flex items-center gap-2"
                                            >
                                                <Send size={14}/> Process
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {pendingPayouts.length === 0 && <p className="text-center text-gray-500 py-4 italic">No pending payouts.</p>}
                    </div>
                </div>
                {/* Settings section */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">Affiliate Settings</h3>
                        <button onClick={fetchConfig} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full" title="Refresh settings"><RefreshCw size={16}/></button>
                    </div>

                    {isSettingsLoading && !commissionRate ? (
                        <div className="flex justify-center items-center h-24"><Loader className="animate-spin text-blue-500"/></div>
                    ) : (
                        <div className="space-y-3">
                             <div>
                                <label htmlFor="commissionRate" className="text-sm font-medium text-gray-700 block mb-1">Global Commission Rate</label>
                                <div className="relative">
                                    <input
                                        id="commissionRate"
                                        type="number"
                                        value={commissionRate}
                                        onChange={e => setCommissionRate(e.target.value)}
                                        className="w-full p-2 pr-8 border rounded-md bg-white text-gray-900 placeholder-gray-500"
                                        placeholder="e.g., 20"
                                        min="0"
                                        max="100"
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">This is the default rate for new affiliates.</p>
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSettingsLoading}
                                className="w-full flex justify-center items-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
                            >
                                {isSettingsLoading ? <Loader className="animate-spin"/> : <Save size={16} />}
                                Save Global Rate
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Affiliate Profiles Section */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold text-gray-700">Affiliate Profiles</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, email, ref ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500"
                        />
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 w-px"></th>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Referral ID</th>
                                <th className="px-6 py-3">Commission Rate</th>
                                <th className="px-6 py-3 text-right">Balance</th>
                                <th className="px-6 py-3 text-right">Total Earnings</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAffiliates.map(profile => (
                                <Fragment key={profile.id}>
                                    <tr className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleToggleExpand(profile.id)} className="p-1 rounded-full hover:bg-gray-200">
                                                {expandedProfileId === profile.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div>{profile.user?.name}</div>
                                            <div className="text-xs text-gray-500">{profile.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 capitalize">{profile.status}</td>
                                        <td className="px-6 py-4 font-mono">{profile.refId || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            {profile.status === 'active' ? (
                                                <div className="relative w-24">
                                                    <input
                                                        type="number"
                                                        value={editingRates[profile.userId] ?? profile.commissionRate ?? ''}
                                                        onChange={e => setEditingRates(prev => ({ ...prev, [profile.userId]: e.target.value }))}
                                                        className="w-full p-1.5 pr-6 border rounded-md text-xs bg-white"
                                                        placeholder={String(commissionRate)}
                                                        disabled={actionLoading === profile.userId}
                                                    />
                                                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={12}/>
                                                </div>
                                            ) : (
                                                profile.commissionRate !== undefined ? `${profile.commissionRate}%` : 'N/A'
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold">{formatCurrency(profile.balance)}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(profile.totalEarnings)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {renderActionButtons(profile)}
                                        </td>
                                    </tr>
                                    {expandedProfileId === profile.id && (
                                        <tr>
                                            <td colSpan={8} className="p-0">
                                                 {isLoadingReferrals === profile.id ? (
                                                    <div className="flex justify-center items-center p-4"><Loader className="animate-spin text-blue-500" /></div>
                                                ) : (
                                                    <ReferralDetails referrals={referralDetails[profile.id] || []} />
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                     {filteredAffiliates.length === 0 && <p className="text-center text-gray-500 py-4 italic">No matching affiliate profiles found.</p>}
                </div>
            </div>

            
            {payoutToProcess && (
                <PayoutModal
                    payout={payoutToProcess}
                    onClose={() => setPayoutToProcess(null)}
                    showNotification={showNotification}
                />
            )}
        </div>
    )
}
export default AffiliateDashboard;