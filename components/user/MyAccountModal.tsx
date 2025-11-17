import React, { useState, useMemo, useEffect } from 'react';
import { X, Key, LogOut, CheckCircle, Clock, AlertCircle, User, Save, Edit, Star, MessageSquare, Users, Link as LinkIcon, Copy, Send, Loader } from 'lucide-react';
import { auth, db, functions, FieldValue } from '../../services/firebase.ts';


import type { UserProfile, NotificationType, AppDefinition, UserAppSetting, Review, AffiliateProfile, Payout, Referral, CartItem } from '../../types.ts';
import { formatDate, formatTimestamp } from '../../utils/date.ts';
import AppIcon from '../shared/AppIcon.tsx';
import LogoutConfirmationModal from '../shared/LogoutConfirmationModal.tsx';
import LeaveAffiliateConfirmationModal from './LeaveAffiliateConfirmationModal.tsx';

interface MyAccountModalProps {
    user: UserProfile;
    allApps: AppDefinition[];
    usageCounts: Record<string, number>;
    userReviews: Review[];
    onClose: () => void;
    onLogout: () => Promise<void>;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    onEditReview: (app: AppDefinition) => void;
}

const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const MyAccountModal = ({ user, allApps, usageCounts, userReviews, onClose, onLogout, showNotification, onEditReview }: MyAccountModalProps) => {
    const [name, setName] = useState(user.name || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isLeaveAffiliateConfirmOpen, setIsLeaveAffiliateConfirmOpen] = useState(false);

    // Affiliate state
    const [affiliateProfile, setAffiliateProfile] = useState<AffiliateProfile | null>(null);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isAffiliateLoading, setIsAffiliateLoading] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutDetails, setPayoutDetails] = useState('');
    const [commissionRate, setCommissionRate] = useState<number | null>(null);


    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const getConfig = functions.httpsCallable('getAffiliateConfiguration');
                const result = await getConfig();
                const data = result.data as { commissionRate: number };
                setCommissionRate(data.commissionRate);
            } catch (error) {
                console.error("Failed to fetch affiliate config", error);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        let unsubProfile: (() => void) | undefined;
        let unsubPayouts: (() => void) | undefined;
        let unsubReferrals: (() => void) | undefined;
    
        if (user.affiliateStatus && user.affiliateStatus !== 'none' && user.affiliateStatus !== 'left') {
            setIsAffiliateLoading(true);
            
            const profileRef = db.collection('affiliate_profiles').doc(user.id);
            unsubProfile = profileRef.onSnapshot((docSnap) => {
                if (docSnap.exists) {
                    setAffiliateProfile({ id: docSnap.id, ...docSnap.data() } as AffiliateProfile);
                }
                setIsAffiliateLoading(false);
            }, () => setIsAffiliateLoading(false));
    
            const payoutsQuery = db.collection('payouts').where('userId', '==', user.id);
            unsubPayouts = payoutsQuery.onSnapshot((querySnapshot) => {
                const fetchedPayouts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payout));
                // Sort client-side for robustness
                fetchedPayouts.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));
                setPayouts(fetchedPayouts);
            });

            // Listen for referrals
            const referralsQuery = db.collection('affiliate_profiles').doc(user.id).collection('referrals').orderBy('createdAt', 'desc');
            unsubReferrals = referralsQuery.onSnapshot((snapshot) => {
                const fetchedReferrals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
                setReferrals(fetchedReferrals);
            });
        }
    
        return () => {
            if (unsubProfile) unsubProfile();
            if (unsubPayouts) unsubPayouts();
            if (unsubReferrals) unsubReferrals();
        };
    }, [user.id, user.affiliateStatus]);


    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) {
            showNotification('Name cannot be empty.', 'error');
            return;
        }
        setIsSavingProfile(true);
        try {
            const userDocRef = db.collection("users").doc(user.id);
            await userDocRef.update({ name: name.trim() });
            setShowUpdateSuccess(true);
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
            showNotification(`Profile update failed: ${error.message}.`, 'error');
            console.error(error);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showNotification('Password must be at least 6 characters long.', 'error');
            return;
        }

        setIsChangingPassword(true);
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                await currentUser.updatePassword(newPassword);
                showNotification('Password updated successfully!', 'success');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                 showNotification('No authenticated user found. Please log in again.', 'error');
            }
        } catch (error: any) {
            showNotification(`Password update failed: ${error.message}.`, 'error');
            console.error(error);
        } finally {
            setIsChangingPassword(false);
        }
    };

    const assignedAppsWithDetails = useMemo(() => {
        const appMap = new Map(allApps.map(app => [app.id, app]));
        const userApps = user.apps || {};
        
        return Object.entries(userApps)
            .map(([appId, setting]) => {
                const appDetails = appMap.get(appId);
                return appDetails ? { ...appDetails, setting } : null;
            })
            .filter(Boolean) as (AppDefinition & { setting: UserAppSetting })[];
    }, [user.apps, allApps]);

    const appMap = useMemo(() => new Map(allApps.map(app => [app.id, app])), [allApps]);

    const handleJoinAffiliateProgram = async () => {
        setIsAffiliateLoading(true);
        try {
            const joinFunction = functions.httpsCallable('joinAffiliateProgram');
            await joinFunction();
            showNotification("Your request has been submitted for review!", "success");
        } catch (error: any) {
            showNotification(error.message, "error");
        } finally {
            setIsAffiliateLoading(false);
        }
    };
    
    const handleLeaveAffiliateProgram = async () => {
        setIsLeaveAffiliateConfirmOpen(false);
        setIsAffiliateLoading(true);
         try {
            const leaveFunction = functions.httpsCallable('leaveAffiliateProgram');
            await leaveFunction();
            showNotification("You have successfully left the affiliate program.", "info");
        } catch (error: any) {
            showNotification(error.message, "error");
        } finally {
            setIsAffiliateLoading(false);
        }
    };
    
    const handleRequestPayout = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(payoutAmount) * 100;
        if (isNaN(amountNum) || amountNum <= 0) {
            showNotification("Invalid amount.", "error");
            return;
        }
        if (!payoutDetails.trim()){
            showNotification("Payout details cannot be empty.", "error");
            return;
        }
        if (affiliateProfile && amountNum > affiliateProfile.balance) {
             showNotification("Requested amount exceeds your balance.", "error");
            return;
        }
        
        setIsAffiliateLoading(true);
        try {
            const requestPayoutFunction = functions.httpsCallable('requestAffiliatePayout');
            await requestPayoutFunction({ amount: amountNum, details: payoutDetails.trim() });
            showNotification("Payout request submitted successfully!", "success");
            setPayoutAmount('');
            setPayoutDetails('');
        } catch (error: any) {
            showNotification(error.message, "error");
        } finally {
             setIsAffiliateLoading(false);
        }
    }
    
    const handleCopyCode = () => {
        const code = affiliateProfile?.refId;
        if (code) {
            navigator.clipboard.writeText(code);
            showNotification("Referral code copied!", "success");
        }
    };

    const renderAffiliateSection = () => {
        const currentStatus = user.affiliateStatus || 'none';

        switch (currentStatus) {
            case 'active':
                if (isAffiliateLoading || !affiliateProfile) {
                    return <div className="p-4 text-center"><Loader className="animate-spin" /></div>;
                }
                const referralCode = affiliateProfile.refId;
                const displayRate = affiliateProfile.commissionRate ?? commissionRate;

                return (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500">
                             <h5 className="font-bold text-blue-800">Your Referral Code</h5>
                             <p className="text-sm text-gray-600 mt-1">Share this code with new users. They can enter it during their first purchase to link their account to you.</p>
                             <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                                <div className="w-full p-2 border-2 border-dashed bg-white text-gray-900 rounded-md font-mono text-center text-lg tracking-widest">{referralCode}</div>
                                <button onClick={handleCopyCode} className="flex-shrink-0 w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"><Copy size={16}/> Copy Code</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-gray-100 rounded-lg text-center">
                                <p className="text-sm text-gray-600">Balance</p>
                                <p className="text-2xl font-bold">{formatCurrency(affiliateProfile.balance)}</p>
                            </div>
                             <div className="p-4 bg-gray-100 rounded-lg text-center">
                                <p className="text-sm text-gray-600">Commission Rate</p>
                                <p className="text-2xl font-bold">{displayRate !== null ? `${displayRate}%` : '-'}</p>
                            </div>
                            <div className="p-4 bg-gray-100 rounded-lg text-center">
                                <p className="text-sm text-gray-600">Total Referrals</p>
                                <p className="text-2xl font-bold">{affiliateProfile.referralsCount ?? 0}</p>
                            </div>
                             <div className="p-4 bg-gray-100 rounded-lg text-center">
                                <p className="text-sm text-gray-600">Total Earnings</p>
                                <p className="text-2xl font-bold">{formatCurrency(affiliateProfile.totalEarnings)}</p>
                            </div>
                        </div>

                        {/* Referral History */}
                        <div className="p-4 border rounded-lg">
                            <h5 className="font-semibold mb-3">Referral History</h5>
                            <div className="overflow-x-auto max-h-64">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Customer</th>
                                            <th className="px-4 py-2">Purchase</th>
                                            <th className="px-4 py-2 text-right">Commission</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {referrals.length > 0 ? referrals.map(ref => (
                                            <tr key={ref.id} className="border-b">
                                                <td className="px-4 py-2 whitespace-nowrap">{formatTimestamp(ref.createdAt)}</td>
                                                <td className="px-4 py-2">{ref.newCustomerName}</td>
                                                <td className="px-4 py-2">
                                                    {ref.items.map(item => `${item.appName} - ${item.tierName}`).join(', ')}
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold text-green-600">{formatCurrency(ref.commissionAmount)}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="text-center italic py-4 text-gray-500">No referral history.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Payout Request */}
                             <div className="p-4 border rounded-lg space-y-3">
                                 <h5 className="font-semibold">Request a Payout</h5>
                                <form onSubmit={handleRequestPayout} className="space-y-3">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                        <input type="number" step="0.01" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="Amount" className="w-full pl-6 p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500" required/>
                                    </div>
                                    <textarea value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} placeholder="Payout Details (e.g., UPI ID, Bank Info)" className="w-full p-2 border rounded-md h-20 resize-y bg-white text-gray-900 placeholder-gray-500" required></textarea>
                                    <button type="submit" disabled={isAffiliateLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400">
                                        {isAffiliateLoading ? <Loader className="animate-spin"/> : <><Send size={16}/> Submit Request</>}
                                    </button>
                                </form>
                            </div>
                            {/* Payout History */}
                             <div className="p-4 border rounded-lg">
                                <h5 className="font-semibold mb-3">Payout History</h5>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {payouts.length > 0 ? payouts.map(p => (
                                        <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md">
                                            <div>
                                                <p className="font-medium">{formatCurrency(p.amount)}</p>
                                                <p className="text-xs text-gray-500">{formatTimestamp(p.requestedAt)}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 text-center italic py-4">No payout history.</p>}
                                </div>
                            </div>
                        </div>
                        <div className="text-center mt-4">
                             <button onClick={() => setIsLeaveAffiliateConfirmOpen(true)} className="text-sm text-red-600 hover:underline">Leave Affiliate Program</button>
                        </div>
                    </div>
                )
            case 'pending':
                return <div className="p-6 text-center bg-yellow-50 text-yellow-800 rounded-lg">Your affiliate application is under review.</div>
            
            case 'none':
            case 'left':
            case 'rejected':
            default:
                let message: React.ReactNode = <p className="text-gray-600 my-2">{commissionRate !== null ? `Earn a ${commissionRate}% commission on every sale you refer.` : 'Loading commission details...'}</p>;

                if (currentStatus === 'rejected') {
                    message = <p className="text-red-700 my-2">Your previous application was not approved. You can submit a new request.</p>
                } else if (currentStatus === 'left') {
                     message = <p className="text-purple-700 my-2">You have left the affiliate program. Feel free to rejoin anytime.</p>
                }

                return (
                    <div className="p-6 text-center bg-gray-50 rounded-lg">
                         <h5 className="font-semibold text-lg">Join our Affiliate Program!</h5>
                         {message}
                         <button onClick={handleJoinAffiliateProgram} disabled={isAffiliateLoading} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2 mx-auto">
                           {isAffiliateLoading ? <Loader className="animate-spin"/> : <><Users size={16}/> Become an Affiliate</>}
                        </button>
                    </div>
                )
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
                <header className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">My Account</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                     <p className="text-gray-500 text-sm mt-1">Manage your account details, application access, and reviews.</p>
                </header>

                <main className="p-6 space-y-8 overflow-y-auto">
                    {/* Profile Info Section */}
                    <section>
                         <h4 className="text-lg font-semibold text-gray-700 mb-3">Profile Information</h4>
                         <form onSubmit={handleUpdateProfile} className="p-4 bg-gray-50 border rounded-lg space-y-3">
                             <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500" placeholder="Your Name"/>
                            </div>
                            <button type="submit" disabled={isSavingProfile || name.trim() === (user.name || '')} className="w-full sm:w-auto flex justify-center items-center py-2 px-6 text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition disabled:bg-green-400 disabled:cursor-not-allowed">
                                {isSavingProfile ? 'Saving...' : <><Save className="mr-2 h-5 w-5"/> Update Name</>}
                            </button>
                         </form>
                    </section>
                    
                    {/* Affiliate Program Section */}
                    <section>
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">Affiliate Program</h4>
                        {renderAffiliateSection()}
                    </section>


                    {/* App Summary Section */}
                    <section>
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">My Application Access</h4>
                        <div className="space-y-4 md:space-y-0">
                            {/* Header for Desktop */}
                            <div className="hidden md:grid md:grid-cols-[2fr,1fr,1fr] gap-4 p-3 bg-gray-50 rounded-t-lg font-semibold text-gray-600 text-sm border-x border-t">
                                <div className="pl-12">Application</div>
                                <div>Usage</div>
                                <div>Status</div>
                            </div>

                            {/* App list */}
                            {assignedAppsWithDetails.length > 0 ? (
                                <div className="md:border-x md:border-b md:rounded-b-lg">
                                    {assignedAppsWithDetails.map((app, index) => {
                                        const usage = usageCounts[app.id] ?? 0;
                                        const limit = app.setting.usageLimit;
                                        const isLimitReached = limit > 0 && usage >= limit;

                                        let statusComponent;
                                        if (isLimitReached) {
                                            statusComponent = <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"><AlertCircle size={14} className="mr-1"/> Limit Reached</span>;
                                        } else {
                                            statusComponent = <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><CheckCircle size={14} className="mr-1"/> Active</span>;
                                        }

                                        const isLast = index === assignedAppsWithDetails.length - 1;

                                        return (
                                            <div key={app.id} className={`
                                                grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-x-4
                                                p-4 bg-white shadow-md rounded-lg space-y-2
                                                md:p-3 md:shadow-none md:rounded-none md:space-y-0
                                                ${!isLast ? 'md:border-b' : ''}
                                            `}>
                                                {/* App Name */}
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-gray-600 md:hidden">Application</span>
                                                    <div className="flex items-center gap-3">
                                                        <AppIcon icon={app.icon} name={app.name} className="h-8 w-8 rounded-md flex-shrink-0"/>
                                                        <span className="font-medium text-gray-800">{app.name}</span>
                                                    </div>
                                                </div>
                                                {/* Usage */}
                                                <div className="flex justify-between items-center pt-2 border-t md:border-t-0 md:pt-0">
                                                    <span className="font-semibold text-gray-600 md:hidden">Usage</span>
                                                    <span className="text-gray-600 font-mono text-xs">
                                                        {limit === 0 ? 'Unlimited' : `${usage} / ${limit}`}
                                                    </span>
                                                </div>
                                                {/* Status */}
                                                <div className="flex justify-between items-center pt-2 border-t md:border-t-0 md:pt-0">
                                                    <span className="font-semibold text-gray-600 md:hidden">Status</span>
                                                    {statusComponent}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-gray-500 italic border rounded-lg">
                                    You have no applications assigned.
                                </div>
                            )}
                        </div>
                    </section>
                    
                    {/* My Reviews Section */}
                    <section>
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">My Reviews</h4>
                        <div className="space-y-3">
                             {userReviews.length > 0 ? (
                                userReviews.map(review => {
                                    const app = appMap.get(review.appId);
                                    if (!app) return null;

                                    return (
                                        <div key={review.id} className="p-4 bg-white border rounded-lg shadow-sm">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <AppIcon icon={app.icon} name={app.name} className="h-8 w-8 rounded-md flex-shrink-0"/>
                                                        <span className="font-semibold text-gray-800">{app.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="flex">
                                                            {[...Array(5)].map((_, i) => <Star key={i} size={16} className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}/>)}
                                                        </div>
                                                        <span className="text-xs text-gray-500">({formatTimestamp(review.updatedAt)})</span>
                                                    </div>
                                                    {review.review && <p className="text-sm text-gray-600 italic">"{review.review}"</p>}
                                                </div>
                                                <button onClick={() => onEditReview(app)} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 py-1 px-3 rounded-md hover:bg-blue-50 transition-colors flex-shrink-0">
                                                    <Edit size={14} className="mr-1.5"/> Edit
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                             ) : (
                                 <div className="p-4 text-center text-gray-500 italic border rounded-lg">
                                    You have not submitted any reviews yet.
                                </div>
                             )}
                        </div>
                    </section>


                    {/* Change Password Section */}
                    <section>
                         <h4 className="text-lg font-semibold text-gray-700 mb-3">Change Password</h4>
                         <form onSubmit={handleChangePassword} className="p-4 bg-gray-50 border rounded-lg space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500" placeholder="New Password"/>
                                </div>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-500" placeholder="Confirm New Password"/>
                                </div>
                            </div>
                            <button type="submit" disabled={isChangingPassword} className="w-full md:w-auto flex justify-center items-center py-2 px-6 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:bg-blue-300">
                                {isChangingPassword ? 'Updating...' : 'Update Password'}
                            </button>
                         </form>
                    </section>

                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-between items-center rounded-b-xl border-t">
                    <button type="button" onClick={() => setIsLogoutConfirmOpen(true)} className="flex items-center py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold">
                       <LogOut className="mr-2 h-5 w-5" /> Logout
                    </button>
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Close</button>
                </footer>

                {showUpdateSuccess && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-20 rounded-xl transition-opacity duration-300 p-4">
                        <div className="bg-white p-8 rounded-lg shadow-2xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                            <CheckCircle className="text-green-500 h-8 w-8 flex-shrink-0"/>
                            <span className="text-lg font-semibold text-gray-800">Profile updated, refreshing it to show your updated name</span>
                        </div>
                    </div>
                )}
            </div>

            <LogoutConfirmationModal 
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={onLogout}
            />
            <LeaveAffiliateConfirmationModal
                isOpen={isLeaveAffiliateConfirmOpen}
                onClose={() => setIsLeaveAffiliateConfirmOpen(false)}
                onConfirm={handleLeaveAffiliateProgram}
            />
        </div>
    );
};

export default MyAccountModal;