

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Tangent, AppWindow, Compass, LogOut, Home, BarChart3, Zap, Rss, Edit, Facebook, Instagram, Youtube, Twitter as XIcon, Linkedin, Briefcase, IndianRupee } from 'lucide-react';
import { db, FieldValue } from '../../services/firebase.ts';
import type { UserProfile, AppDefinition, NotificationType, Review, SocialLinks, ConsultationPurchase, Appointment, ConsultantLedger, ConsultantPayout, PaymentOrder } from '../../types.ts';
import ExploreAppsModal from './ExploreAppsModal.tsx';
import AppIcon from '../shared/AppIcon.tsx';
import MyAccountModal from './MyAccountModal.tsx';
import UsageExhaustedModal from './UsageExhaustedModal.tsx';
import LogoutConfirmationModal from '../shared/LogoutConfirmationModal.tsx';
// FIX: Module 'MyAppsModal' is a default export. Changed from a named import to a default import to resolve cascading module resolution errors.
import MyAppsModal from './MyAppsModal.tsx';
import PopularityBanner from './PopularityBanner.tsx';
import TrainingVideosSection from './TrainingVideosSection.tsx';
import FeedbackModal from './FeedbackModal.tsx';
import { ExpiryWarningBanner } from '../shared/Notification.tsx';
import PurchaseCreditsModal from './PurchaseCreditsModal.tsx';
import VideoPlayerModal from '../public/VideoPlayerModal.tsx';
import UserBlogManager from './UserBlogManager.tsx';
import UserConsultantManager from './UserConsultantManager.tsx';
import UserConsultantSales from './UserConsultantSales.tsx';
import { formatDate } from '../../utils/date.ts';


interface UserDashboardProps {
    user: UserProfile;
    onLogout: () => Promise<void>;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    isExpiringToday: boolean;
    setShowPaymentSuccess: () => void;
}

type DashboardView = 'apps' | 'blog' | 'consultant';

// --- Helper Functions ---
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
};

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isWrappedArray = (value: any): value is { __isWrappedArray: true; value: any[] } => {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && value.__isWrappedArray === true && Array.isArray(value.value);
}
const sanitizeDataForFirestore = (data: any): any => {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) {
        return data.map(item => Array.isArray(item) ? { __isWrappedArray: true, value: sanitizeDataForFirestore(item) } : sanitizeDataForFirestore(item));
    }
    const sanitizedObject: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            sanitizedObject[key] = sanitizeDataForFirestore(data[key]);
        }
    }
    return sanitizedObject;
};
const restoreDataFromFirestore = (data: any): any => {
    if (isWrappedArray(data)) return restoreDataFromFirestore(data.value);
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => restoreDataFromFirestore(item));
    const restoredObject: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            restoredObject[key] = restoreDataFromFirestore(data[key]);
        }
    }
    return restoredObject;
};


const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout, showNotification, isExpiringToday, setShowPaymentSuccess }) => {
    const [allApps, setAllApps] = useState<AppDefinition[]>([]);
    const [selectedApp, setSelectedApp] = useState<AppDefinition | null>(null);
    const [isIframeLoading, setIsIframeLoading] = useState(false);
    const [currentView, setCurrentView] = useState<DashboardView>('apps');
    const [isViewOnly, setIsViewOnly] = useState(false);
    
    const [isMyAppsModalOpen, setIsMyAppsModalOpen] = useState(false);
    const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
    const [isMyAccountModalOpen, setIsMyAccountModalOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [appToPurchaseFor, setAppToPurchaseFor] = useState<AppDefinition | null>(null);

    const [isUsageExhaustedModalOpen, setIsUsageExhaustedModalOpen] = useState(false);
    const [usageExhaustedData, setUsageExhaustedData] = useState<{ app: AppDefinition; mode: 'pre-launch' | 'in-app'; onProceed?: () => void; usageCount: number; limit: number; reason: 'limit_reached' | 'fair_use_limit_reached' | 'app_expired'; } | null>(null);
    
    const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
    const [isPopularityBannerVisible, setIsPopularityBannerVisible] = useState(false);
    const [isExpiryBannerVisible, setIsExpiryBannerVisible] = useState(isExpiringToday);
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
    const [socialLinks, setSocialLinks] = useState<SocialLinks | null>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    // --- Feedback and Review State ---
    const [userReviews, setUserReviews] = useState<Review[]>([]);
    const [showFeedbackModal, setShowFeedbackModal] = useState<{app: AppDefinition} | null>(null);
    const [pendingNavigationAction, setPendingNavigationAction] = useState<(() => void) | null>(null);
    const reviewedAppIds = useMemo(() => new Set(userReviews.map(r => r.appId)), [userReviews]);

    const [activeConsultantTab, setActiveConsultantTab] = useState<'manage' | 'sales'>('manage');


    // --- Data Fetching ---
    useEffect(() => {
        const fetchAllApps = async () => {
            try {
                const appsQuery = db.collection("apps");
                const querySnapshot = await appsQuery.get();
                const fetchedApps = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppDefinition));
                setAllApps(fetchedApps);
            } catch (error: any) {
                if (error.code === 'unavailable') {
                    console.warn("Could not fetch applications while offline:", error.message);
                    showNotification("You are offline. Application list may be incomplete.", "info");
                } else {
                    console.error("Failed to fetch applications:", error);
                    showNotification("Could not load application directory.", "error");
                }
            }
        };
        fetchAllApps();
    }, [showNotification]);
    
    // --- Review Fetching ---
    useEffect(() => {
        let unsubscribe: () => void;
        const fetchReviews = async () => {
            try {
                const reviewsQuery = db.collection("users").doc(user.id).collection("reviews");
                unsubscribe = reviewsQuery.onSnapshot(snapshot => {
                    const fetchedReviews = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review));
                    setUserReviews(fetchedReviews);
                });
            } catch (error) {
                console.error("Failed to fetch user reviews:", error);
            }
        };
        fetchReviews();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user.id]);
    
     useEffect(() => {
        const fetchSocialLinks = async () => {
            try {
                const doc = await db.collection('site_content').doc('social_links').get();
                if (doc.exists) {
                    setSocialLinks(doc.data() as SocialLinks);
                }
            } catch (error) {
                console.error("Failed to fetch social links:", error);
            }
        };
        fetchSocialLinks();
    }, []);

    const assignedAppIds = useMemo(() => Object.keys(user.apps || {}), [user.apps]);

    // Pre-fetch all personal usage counts for assigned apps for better performance
    useEffect(() => {
        if (assignedAppIds.length === 0) {
            setUsageCounts({});
            return;
        }

        const fetchUsageCounts = async () => {
            try {
                const usageDocIds = assignedAppIds.map(appId => `${user.id}_${appId}`);
                
                const chunks = [];
                for (let i = 0; i < usageDocIds.length; i += 30) {
                    chunks.push(usageDocIds.slice(i, i + 30));
                }

                const newUsageCounts: Record<string, number> = {};

                for (const chunk of chunks) {
                    if (chunk.length === 0) continue;
                    const usageQuery = db.collection('usage_counts').where('__name__', 'in', chunk);
                    const querySnapshot = await usageQuery.get();
                    querySnapshot.forEach(doc => {
                        const [, appId] = doc.id.split('_');
                        newUsageCounts[appId] = doc.data().count || 0;
                    });
                }
                
                assignedAppIds.forEach(appId => {
                    if (!newUsageCounts[appId]) {
                        newUsageCounts[appId] = 0;
                    }
                });

                setUsageCounts(newUsageCounts);

            } catch (error: any) {
                if (error.code === 'unavailable') {
                    console.warn("Could not fetch usage counts while offline:", error.message);
                } else {
                    console.error("Failed to fetch usage counts:", error);
                }
            }
        };

        fetchUsageCounts();
    }, [user.id, assignedAppIds]);


    // Real-time listener for the selected application to get live totalUsage updates
    useEffect(() => {
        if (!selectedApp) {
            return;
        }

        let unsubscribe: () => void;
        const setupAppListener = async () => {
            try {
                const appDocRef = db.collection("apps").doc(selectedApp.id);
                
                unsubscribe = appDocRef.onSnapshot((docSnap) => {
                    if (docSnap.exists) {
                        const updatedAppData = { ...docSnap.data(), id: docSnap.id } as AppDefinition;
                        
                        setSelectedApp(currentApp => {
                            if (currentApp && currentApp.id === updatedAppData.id) {
                                return updatedAppData;
                            }
                            return currentApp;
                        });

                        setAllApps(prevApps =>
                            prevApps.map(app => app.id === updatedAppData.id ? updatedAppData : app)
                        );
                    }
                }, (error) => {
                    console.error("Error listening to app document:", error);
                    showNotification("Could not get live updates for this app's popularity.", "error");
                });
            } catch (error) {
                console.error("Failed to set up app listener:", error);
            }
        };

        setupAppListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [selectedApp?.id, showNotification]);

    // Listen for messages from child iframes for usage tracking and data persistence
    useEffect(() => {
        const handleMessageFromIframe = async (event: MessageEvent) => {
            if (!selectedApp || !iframeRef.current?.contentWindow) {
                return;
            }
            
            const expectedOrigin = new URL(selectedApp.url).origin;
            if (event.origin !== expectedOrigin || event.source !== iframeRef.current.contentWindow) return;
            
            const { type, payload } = event.data;
            
            if (type === 'getProjectLimits') {
                const userAppSetting = user.apps[selectedApp.id];
                
                // Read the settings directly from the user's profile.
                // These were snapshotted at the time of purchase.
                const maxProjects = userAppSetting?.maxProjects;
                const projectExpirationDays = userAppSetting?.projectExpirationDays;

                // Only respond if the values are configured (are numbers >= 0) on the user's profile.
                if (typeof maxProjects === 'number' && typeof projectExpirationDays === 'number') {
                    iframeRef.current.contentWindow.postMessage({
                        type: 'projectLimits',
                        payload: { maxProjects, projectExpirationDays }
                    }, event.origin);
                }
                // If not configured, do not respond, allowing the child app to use its defaults.
                return;
            }

            if (!type || !payload) return; 

            const { userId, appId } = payload;

            if (userId !== user.id || appId !== selectedApp.id) return;
    
            const targetOrigin = event.origin;
    
            if (type === 'getUsage') {
                const appSetting = user.apps[appId];
                if (!appSetting) {
                    iframeRef.current.contentWindow.postMessage({ type: 'usageStatus', payload: { used: 0, limit: 0, userName: user.name || '', canGenerate: false, reason: 'no_settings' } }, targetOrigin);
                    return;
                }
            
                const limit = appSetting.usageLimit ?? 0;
                const isUnlimited = limit === 0;

                if (isUnlimited) {
                    const userPolicy = appSetting.fairUsePolicy;
                    const appPolicy = selectedApp.fairUsePolicy;
                    const policy = userPolicy || appPolicy;

                    if (policy && policy.limit > 0) {
                         try {
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            const day = String(now.getDate()).padStart(2, '0');

                            let collectionName: string, docIdSuffix: string;
                            switch (policy.frequency) {
                                case 'daily': collectionName = 'daily_usage_counts'; docIdSuffix = `${year}-${month}-${day}`; break;
                                case 'monthly': collectionName = 'monthly_usage_counts'; docIdSuffix = `${year}-${month}`; break;
                                case 'yearly': collectionName = 'yearly_usage_counts'; docIdSuffix = `${year}`; break;
                                default: throw new Error("Invalid fair use policy frequency.");
                            }

                            const usageDocId = `${userId}_${appId}_${docIdSuffix}`;
                            const usageDoc = await db.collection(collectionName).doc(usageDocId).get();
                            const currentUsed = usageDoc.exists ? usageDoc.data()!.count : 0;
                            const canGenerate = currentUsed < policy.limit;
                            
                            iframeRef.current.contentWindow.postMessage({
                                type: 'usageStatus',
                                payload: {
                                    used: currentUsed,
                                    limit: policy.limit,
                                    userName: user.name || '',
                                    canGenerate,
                                    reason: canGenerate ? 'active' : 'fair_use_limit_reached',
                                }
                            }, targetOrigin);

                        } catch (error) {
                             console.error("Failed to check fair use limit:", error);
                            iframeRef.current.contentWindow.postMessage({ type: 'usageStatus', payload: { used: 0, limit: 0, userName: user.name || '', canGenerate: false, reason: 'error_checking_limit' }}, targetOrigin);
                            showNotification("Could not verify your usage limit. Please try again.", "error");
                        }
                        return;
                    }
                }
            
                const used = usageCounts[appId] ?? 0;
                const userName = user.name || '';
            
                const isUsageLimitReached = limit > 0 && used >= limit;
                
                const canGenerate = !isUsageLimitReached;
                
                let reason: 'active' | 'limit_reached' = 'active';
                if (isUsageLimitReached) reason = 'limit_reached';

                iframeRef.current.contentWindow.postMessage({ 
                    type: 'usageStatus', 
                    payload: { 
                        used, 
                        limit, 
                        userName,
                        canGenerate,
                        reason,
                    } 
                }, targetOrigin);
            }
    
            if (type === 'incrementUsage') {
                const appSetting = user.apps[appId];
                if (!appSetting) {
                    const errorMessage = "Application settings not found for this user.";
                    iframeRef.current.contentWindow.postMessage({ type: 'incrementFailure', payload: { reason: errorMessage } }, targetOrigin);
                    console.error(errorMessage, "userId:", userId, "appId:", appId);
                    return;
                }

                const limit = appSetting.usageLimit ?? 0;
                const isUnlimited = limit === 0;

                if (isUnlimited) {
                    const userPolicy = appSetting.fairUsePolicy;
                    const appPolicy = selectedApp.fairUsePolicy;
                    const policy = userPolicy || appPolicy;
                    
                    if (policy && policy.limit > 0) {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        
                        let collectionName: string, docIdSuffix: string;
                        switch (policy.frequency) {
                            case 'daily': collectionName = 'daily_usage_counts'; docIdSuffix = `${year}-${month}-${day}`; break;
                            case 'monthly': collectionName = 'monthly_usage_counts'; docIdSuffix = `${year}-${month}`; break;
                            case 'yearly': collectionName = 'yearly_usage_counts'; docIdSuffix = `${year}`; break;
                            default:
                                iframeRef.current.contentWindow.postMessage({ type: 'incrementFailure', payload: { reason: 'Invalid fair use policy configuration.' } }, targetOrigin);
                                return;
                        }

                        const usageDocId = `${userId}_${appId}_${docIdSuffix}`;
                        const usageDocRef = db.collection(collectionName).doc(usageDocId);
                        const usageDoc = await usageDocRef.get();
                        const currentUsed = usageDoc.exists ? usageDoc.data()!.count : 0;

                        if (currentUsed < policy.limit) {
                            const batch = db.batch();
                            batch.set(usageDocRef, { count: FieldValue.increment(1) }, { merge: true });
                            const creditLogRef = db.collection('credit_logs').doc();
                            batch.set(creditLogRef, { userId: user.id, userName: user.name, userEmail: user.email, appId: selectedApp.id, appName: selectedApp.name, creditsDeducted: 1, timestamp: FieldValue.serverTimestamp() });
                            await batch.commit();
                            iframeRef.current.contentWindow.postMessage({ type: 'incrementSuccess' }, targetOrigin);
                        } else {
                            iframeRef.current.contentWindow.postMessage({ type: 'incrementFailure', payload: { reason: 'fair_use_limit_reached' } }, targetOrigin);
                            setUsageExhaustedData({ app: selectedApp, mode: 'in-app', usageCount: currentUsed, limit: policy.limit, reason: 'fair_use_limit_reached' });
                            setIsUsageExhaustedModalOpen(true);
                        }
                    } else {
                        // Truly unlimited, no usage tracking, but we can still log the activity
                        const creditLogRef = db.collection('credit_logs').doc();
                        await creditLogRef.set({ userId: user.id, userName: user.name, userEmail: user.email, appId: selectedApp.id, appName: selectedApp.name, creditsDeducted: 1, timestamp: FieldValue.serverTimestamp() });
                        iframeRef.current.contentWindow.postMessage({ type: 'incrementSuccess' }, targetOrigin);
                    }
                } else {
                    // This is the existing logic for limited plans
                    const used = usageCounts[appId] ?? 0;
                    const isUsageLimitReached = used >= limit;

                    if (!isUsageLimitReached) {
                        try {
                            const usageDocRef = db.collection('usage_counts').doc(`${userId}_${appId}`);
                            const creditLogRef = db.collection('credit_logs').doc();

                            const batch = db.batch();
                            
                            batch.set(usageDocRef, { count: FieldValue.increment(1) }, { merge: true });

                            batch.set(creditLogRef, { userId: user.id, userName: user.name, userEmail: user.email, appId: selectedApp.id, appName: selectedApp.name, creditsDeducted: 1, timestamp: FieldValue.serverTimestamp() });
                            
                            await batch.commit();

                            setUsageCounts(prev => ({ ...prev, [appId]: (prev[appId] ?? 0) + 1 }));
                
                            iframeRef.current.contentWindow.postMessage({ type: 'incrementSuccess' }, targetOrigin);
                        } catch (error) {
                            console.error("Usage increment failed:", error);
                            const detailedMessage = `Could not update usage count. Please try again.`;
                            iframeRef.current.contentWindow.postMessage({ type: 'incrementFailure', payload: { reason: detailedMessage } }, targetOrigin);
                        }
                    } else {
                        const detailedMessage = `You have exhausted the usage limits (${limit}/${limit}) for this app. Please contact your administrator for more credits.`;
                        
                        iframeRef.current.contentWindow.postMessage({ type: 'incrementFailure', payload: { reason: detailedMessage } }, targetOrigin);
                        
                        setUsageExhaustedData({ app: selectedApp, mode: 'in-app', usageCount: used, limit, reason: 'limit_reached' });
                        setIsUsageExhaustedModalOpen(true);
                    }
                }
            }
            
            if (type === 'saveChildAppData' && 'data' in payload) {
                const chunksCollectionPath = `users/${userId}/appData/${appId}/chunks`;
                const chunksCollectionRef = db.collection(chunksCollectionPath);
                const metadataDocRef = chunksCollectionRef.doc('--metadata--');
                
                try {
                    const sanitizedData = sanitizeDataForFirestore(payload.data);
                    const dataString = JSON.stringify(sanitizedData);
            
                    const CHUNK_SIZE = 900 * 1024;
                    const chunks = [];
                    for (let i = 0; i < dataString.length; i += CHUNK_SIZE) {
                        chunks.push(dataString.substring(i, i + CHUNK_SIZE));
                    }
            
                    const saveBatch = db.batch();
    
                    const oldMetadataSnap = await metadataDocRef.get();
                    const oldChunkCount = oldMetadataSnap.exists ? oldMetadataSnap.data()?.chunkCount : 0;
                    
                    if (chunks.length < oldChunkCount) {
                        for (let i = chunks.length; i < oldChunkCount; i++) {
                            const chunkDocId = `part-${String(i).padStart(4, '0')}`;
                            saveBatch.delete(chunksCollectionRef.doc(chunkDocId));
                        }
                    }
            
                    saveBatch.set(metadataDocRef, { 
                        chunkCount: chunks.length, 
                        savedAt: FieldValue.serverTimestamp() 
                    });
    
                    chunks.forEach((chunk, index) => {
                        const chunkDocId = `part-${String(index).padStart(4, '0')}`;
                        const chunkDocRef = chunksCollectionRef.doc(chunkDocId);
                        saveBatch.set(chunkDocRef, { data: chunk });
                    });
            
                    await saveBatch.commit();
            
                    const legacyDocRef = db.collection('users').doc(userId).collection('appData').doc(appId);
                    const legacyDocSnap = await legacyDocRef.get();
                    if (legacyDocSnap.exists) {
                        await legacyDocRef.delete();
                    }
    
                    iframeRef.current.contentWindow.postMessage({ type: 'saveSuccess' }, targetOrigin);
            
                } catch (error) {
                    console.error("Parent: Failed to save chunked child app data", error);
                    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                    iframeRef.current.contentWindow.postMessage({ type: 'saveError', payload: { message: `Failed to save project to the cloud: ${errorMessage}` } }, targetOrigin);
                }
            }
            
            if (type === 'loadChildAppData') {
                const chunksCollectionPath = `users/${userId}/appData/${appId}/chunks`;
                const chunksCollectionRef = db.collection(chunksCollectionPath);
                const metadataDocRef = chunksCollectionRef.doc('--metadata--');

                try {
                    const metadataSnap = await metadataDocRef.get();
            
                    if (metadataSnap.exists) {
                        const chunkCount = metadataSnap.data()?.chunkCount;

                        if (typeof chunkCount !== 'number' || chunkCount <= 0) {
                             iframeRef.current.contentWindow.postMessage({ type: 'dataLoaded', payload: {} }, targetOrigin);
                             return;
                        }

                        const chunkPromises = [];
                        for (let i = 0; i < chunkCount; i++) {
                            const chunkDocId = `part-${String(i).padStart(4, '0')}`;
                            chunkPromises.push(chunksCollectionRef.doc(chunkDocId).get());
                        }
                        const chunkDocs = await Promise.all(chunkPromises);
                        const dataString = chunkDocs.map(docSnap => {
                            if (!docSnap.exists) throw new Error(`Chunk ${docSnap.id} is missing.`);
                            return docSnap.data()?.data;
                        }).join('');
                        
                        const parsedData = dataString ? JSON.parse(dataString) : {};
                        const restoredData = restoreDataFromFirestore(parsedData);
                        iframeRef.current.contentWindow.postMessage({ type: 'dataLoaded', payload: restoredData }, targetOrigin);
    
                    } else {
                        const legacyDocRef = db.collection('users').doc(userId).collection('appData').doc(appId);
                        const legacyDocSnap = await legacyDocRef.get();
                        if (legacyDocSnap.exists) {
                            const docData = legacyDocSnap.data();
                            const restoredData = docData ? restoreDataFromFirestore(docData) : {};
                            iframeRef.current.contentWindow.postMessage({ type: 'dataLoaded', payload: restoredData }, targetOrigin);
                        } else {
                            iframeRef.current.contentWindow.postMessage({ type: 'noDataFound' }, targetOrigin);
                        }
                    }
                } catch (error) {
                    console.error("Parent: Failed to load child app data", error);
                    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                    iframeRef.current.contentWindow.postMessage({ type: 'loadError', payload: { message: `Failed to load project from the cloud: ${errorMessage}` } }, targetOrigin);
                }
            }
        };
        
        window.addEventListener('message', handleMessageFromIframe);
        return () => window.removeEventListener('message', handleMessageFromIframe);
    }, [selectedApp, user, showNotification, usageCounts]);

    useEffect(() => {
        if (!selectedApp && isIframeLoading) {
            setIsIframeLoading(false);
        }
    }, [selectedApp, isIframeLoading]);

    const assignedApps = useMemo(() => {
        return allApps
            .filter(app => assignedAppIds.includes(app.id));
    }, [allApps, assignedAppIds]);

    const assignedAppsWithVideos = useMemo(() => {
        return assignedApps.filter(app => app.trainingVideos && app.trainingVideos.filter(v => v.name && v.url).length > 0);
    }, [assignedApps]);
    
    const isPlanInactive = useMemo(() => {
        if (!selectedApp || !user.apps[selectedApp.id]) return false;

        const setting = user.apps[selectedApp.id];
        const limit = setting.usageLimit;
        const used = usageCounts[selectedApp.id] ?? 0;
        const isLimitReached = limit > 0 && used >= limit;

        const todayStr = getLocalDateString(new Date());
        const isExpired = setting.expiryDate && setting.expiryDate < todayStr;
        
        return isLimitReached || isExpired;
    }, [selectedApp, user.apps, usageCounts]);

    const activePlanInfo = useMemo(() => {
        if (!selectedApp || !user.apps[selectedApp.id]) {
            return null;
        }

        const appSetting = user.apps[selectedApp.id];
        const tiers = selectedApp.pricingTiers || [];

        const expiryDateText = appSetting.expiryDate ? `, valid till ${formatDate(appSetting.expiryDate)}` : '';

        if (appSetting.usageLimit === 0) {
            // It's an unlimited plan. Find a matching tier name.
            const unlimitedTier = tiers.find(t => t.credits === 0);
            const tierName = unlimitedTier ? unlimitedTier.name : 'Unlimited';
            return `Plan Active: ${tierName}${expiryDateText}`;
        } else {
            // It's a credit-based plan. Show usage as before, but add expiry date.
            const used = usageCounts[selectedApp.id] ?? 0;
            const limit = appSetting.usageLimit;
            return `Usage: ${used} / ${limit}${expiryDateText}`;
        }
    }, [selectedApp, user.apps, usageCounts]);


    const doLaunchApp = (app: AppDefinition, viewOnly: boolean = false) => {
        setIsIframeLoading(true);
        setSelectedApp(app);
        setIsViewOnly(viewOnly);
        setCurrentView('apps');
        setIsMyAppsModalOpen(false);
        setIsExploreModalOpen(false);
        setIsPopularityBannerVisible(true);
    };
    
    const handleAppClick = (app: AppDefinition, viewOnly: boolean = false) => {
        if (app.comingSoon) {
            showNotification("This app is coming soon and cannot be launched yet.", "info");
            return;
        }
        
        if (selectedApp?.id === app.id) {
            setIsMyAppsModalOpen(false);
            return;
        }

        if (selectedApp && !reviewedAppIds.has(selectedApp.id)) {
            setPendingNavigationAction(() => () => doLaunchApp(app, viewOnly));
            setShowFeedbackModal({ app: selectedApp });
        } else {
            doLaunchApp(app, viewOnly);
        }
    };
    
    const handleAppLaunchAttempt = (app: AppDefinition) => {
        const setting = user.apps[app.id];
    
        // 1. Expiry check
        const todayStr = getLocalDateString(new Date());
        const isExpired = setting?.expiryDate && setting.expiryDate < todayStr;
        
        if (isExpired) {
            setUsageExhaustedData({
                app,
                mode: 'pre-launch',
                usageCount: 0,
                limit: 0,
                reason: 'app_expired',
            });
            setIsUsageExhaustedModalOpen(true);
            setIsMyAppsModalOpen(false); // Close the app list modal
            return;
        }
    
        // 2. Pre-launch usage check
        const limit = user.apps[app.id]?.usageLimit ?? 0;
        const used = usageCounts[app.id] ?? 0;
        const isLimitReached = limit > 0 && used >= limit;
    
        if (isLimitReached) {
            setUsageExhaustedData({
                app,
                mode: 'pre-launch',
                usageCount: used,
                limit,
                reason: 'limit_reached',
            });
            setIsUsageExhaustedModalOpen(true);
            setIsMyAppsModalOpen(false); // Close the app list modal
        } else {
            handleAppClick(app, false); // Launch normally
        }
    };

    const handleGoHome = () => {
        if (selectedApp && !reviewedAppIds.has(selectedApp.id)) {
            setPendingNavigationAction(() => () => {
                setSelectedApp(null);
                setIsViewOnly(false);
                setCurrentView('apps');
            });
            setShowFeedbackModal({ app: selectedApp });
        } else {
            setSelectedApp(null);
            setIsViewOnly(false);
            setCurrentView('apps');
        }
    };
    
    const handlePurchaseCreditsClick = (app: AppDefinition) => {
        setAppToPurchaseFor(app);
        setIsPurchaseModalOpen(true);
        setIsMyAppsModalOpen(false);
    };

    const handlePurchaseFromExploreClick = (app: AppDefinition) => {
        setIsExploreModalOpen(false); // Close explore modal
        setAppToPurchaseFor(app); // Set the app for purchase modal
        setIsPurchaseModalOpen(true); // Open purchase modal
    };
    
    const handlePurchaseFromUsageModal = (app: AppDefinition) => {
        setIsUsageExhaustedModalOpen(false); // Close usage modal
        setAppToPurchaseFor(app); // Set app for purchase
        setIsPurchaseModalOpen(true); // Open purchase modal
    };

    const getAppUrlWithParams = (app: AppDefinition, viewOnly: boolean): string => {
        const url = new URL(app.url);
        url.searchParams.append('userId', user.id);
        url.searchParams.append('appId', app.id);
        url.searchParams.append('theme', 'light');
        if (viewOnly) {
            url.searchParams.append('viewOnly', 'true');
        }
        return url.toString();
    }
    
    const totalUsageForSelectedApp = selectedApp?.totalUsage ?? 0;

    const handleFeedbackSubmit = (app: AppDefinition, data: { rating: number; reviewText: string }) => {
        const existingReview = userReviews.find(r => r.appId === app.id);
        const isEditing = !!existingReview;
    
        // Optimistic UI update
        setUserReviews(prevReviews => {
            const now = new Date();
            const newReviewData: Review = {
                id: existingReview?.id || `${user.id}_${app.id}`,
                userId: user.id,
                appId: app.id,
                appName: app.name,
                userName: user.name,
                rating: data.rating,
                review: data.reviewText,
                createdAt: existingReview?.createdAt || now,
                updatedAt: now,
            };
    
            if (isEditing) {
                return prevReviews.map(r => r.appId === app.id ? newReviewData : r);
            } else {
                return [...prevReviews, newReviewData];
            }
        });
    
        // Async background sync
        (async () => {
            try {
                const reviewDataForDb: { [key: string]: any } = {
                    userId: user.id,
                    appId: app.id,
                    appName: app.name,
                    userName: user.name,
                    rating: data.rating,
                    review: data.reviewText,
                    updatedAt: FieldValue.serverTimestamp(),
                };
    
                // Only add createdAt if it's a new review OR if it's an old review being edited for the first time.
                const hasTimestamp = existingReview && existingReview.createdAt && typeof (existingReview.createdAt as any).toDate === 'function';
                if (!hasTimestamp) {
                    reviewDataForDb.createdAt = FieldValue.serverTimestamp();
                }
    
                const batch = db.batch();
    
                // 1. Write to user's subcollection (for 'My Account' page)
                const userReviewDocRef = db.collection("users").doc(user.id).collection("reviews").doc(app.id);
                batch.set(userReviewDocRef, reviewDataForDb, { merge: true });
    
                // 2. Write to top-level 'reviews' collection (for public landing pages)
                const publicReviewDocRef = db.collection("reviews").doc(`${user.id}_${app.id}`);
                batch.set(publicReviewDocRef, reviewDataForDb, { merge: true });
    
                await batch.commit();
                
            } catch (error) {
                console.error("Background sync for review failed:", error);
                showNotification("Your feedback was received, but failed to sync to the cloud.", "error");
            }
        })();
    };
    
    const executePendingNavigation = () => {
        if (pendingNavigationAction) {
            pendingNavigationAction();
            setPendingNavigationAction(null);
        }
    };

    const handleEditReview = (app: AppDefinition) => {
        setShowFeedbackModal({ app });
    };

    const renderMainContent = () => {
        switch (currentView) {
            case 'blog':
                return <UserBlogManager user={user} showNotification={showNotification} />;
            case 'consultant':
                if (user.linkedConsultantId) {
                    const getTabClass = (tabName: 'manage' | 'sales') => `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeConsultantTab === tabName ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`;
                    return (
                        <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col">
                            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg self-start flex-shrink-0">
                                <button onClick={() => setActiveConsultantTab('manage')} className={getTabClass('manage')}><Briefcase size={16} className="mr-2"/> Manage Profile</button>
                                <button onClick={() => setActiveConsultantTab('sales')} className={getTabClass('sales')}><IndianRupee size={16} className="mr-2"/> Sales & Payouts</button>
                            </div>
                            <div className="flex-grow min-h-0">
                                {activeConsultantTab === 'manage' && <UserConsultantManager user={user} showNotification={showNotification} />}
                                {activeConsultantTab === 'sales' && <UserConsultantSales user={user} showNotification={showNotification} />}
                            </div>
                        </div>
                    );
                }
                // Fallback if somehow this view is selected without a linked ID
                setCurrentView('apps');
                return null;
            case 'apps':
            default:
                if (selectedApp) {
                    return (
                        <iframe 
                            ref={iframeRef}
                            key={selectedApp.id}
                            src={getAppUrlWithParams(selectedApp, isViewOnly)}
                            title={selectedApp.name}
                            className={`w-full h-full border-0 rounded-lg ${isIframeLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-popups-to-escape-sandbox"
                            onLoad={() => setIsIframeLoading(false)}
                        ></iframe>
                    );
                } else if (assignedAppsWithVideos.length > 0) {
                    return <TrainingVideosSection apps={assignedAppsWithVideos} onWatchVideo={setPlayingVideoUrl} />;
                } else {
                    return (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
                            <Tangent size={64} className="mb-4 text-blue-400"/>
                            <h3 className="text-2xl font-semibold">Application Portal</h3>
                            <p className="mt-2">
                                {assignedApps.length > 0 
                                    ? "Launch an application from the 'My Apps' menu. No training videos are available for your apps yet." 
                                    : "You have no active applications assigned."
                                }
                            </p>
                            <p className="mt-1 text-sm">You can see all available software in the 'Explore More Apps' menu.</p>
                        </div>
                    );
                }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
             <header className="flex-shrink-0 shadow-md z-20">
                <div className="bg-primary">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="w-full text-center py-2">
                            <p className="text-base font-semibold text-white">
                                {`${getGreeting()}, ${user.name || user.email}`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
                        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4 flex-grow min-w-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0">
                                    <path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"></path>
                                    <path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"></path>
                                    <path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"></path>
                                    <path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"></path>
                                </svg>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-baseline gap-3 flex-wrap">
                                        <h1 className="text-xl font-bold text-gray-800 text-center sm:text-left">
                                            Powerful Tools
                                        </h1>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>By Acharya Preeti Sharma</span>
                                            {socialLinks?.facebook?.url && (
                                                <a href={socialLinks.facebook.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:opacity-80 transition-opacity" aria-label="Facebook">
                                                    <Facebook size={14} />
                                                </a>
                                            )}
                                            {socialLinks?.instagram?.url && (
                                                <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:opacity-80 transition-opacity" aria-label="Instagram">
                                                    <Instagram size={14} />
                                                </a>
                                            )}
                                            {socialLinks?.youtube?.url && (
                                                <a href={socialLinks.youtube.url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:opacity-80 transition-opacity" aria-label="YouTube">
                                                    <Youtube size={14} />
                                                </a>
                                            )}
                                            {socialLinks?.x?.url && (
                                                <a href={socialLinks.x.url} target="_blank" rel="noopener noreferrer" className="text-black hover:opacity-80 transition-opacity" aria-label="X (Twitter)">
                                                    <XIcon size={14} />
                                                </a>
                                            )}
                                            {socialLinks?.linkedin?.url && (
                                                <a href={socialLinks.linkedin.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:opacity-80 transition-opacity" aria-label="LinkedIn">
                                                    <Linkedin size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 mt-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {selectedApp ? (
                                                <AppIcon icon={selectedApp.icon} name={selectedApp.name} className="h-5 w-5 rounded-md flex-shrink-0" />
                                            ) : (
                                                <Tangent size={14} className="text-blue-600"/>
                                            )}
                                            <p className="text-sm text-gray-500 truncate">
                                                {selectedApp ? selectedApp.name : `Dashboard Home`}
                                            </p>
                                            {selectedApp && user.apps[selectedApp.id] && (
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors duration-300 ${
                                                    isPlanInactive
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-blue-600 text-white'
                                                } flex-shrink-0 whitespace-nowrap`}>
                                                    {activePlanInfo}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center flex-nowrap justify-center sm:justify-end gap-1 sm:gap-2">
                                <button onClick={handleGoHome} className="flex items-center bg-gray-100 text-gray-800 font-medium py-1 px-2.5 rounded-md hover:bg-gray-200 transition-colors text-xs">
                                    <Home className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Home</span>
                                </button>
                                <button onClick={() => setIsMyAccountModalOpen(true)} className="flex items-center bg-gray-100 text-gray-800 font-medium py-1 px-2.5 rounded-md hover:bg-gray-200 transition-colors text-xs">
                                    <User className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">My Account</span>
                                </button>
                                
                                {assignedApps.length > 0 && (
                                    <button 
                                        onClick={() => setIsMyAppsModalOpen(true)} 
                                        className="flex items-center bg-blue-600 text-white font-medium py-1 px-2.5 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-xs"
                                    >
                                        <AppWindow className="mr-0 sm:mr-2 h-4 w-4" />
                                        <span className="hidden sm:inline">My Apps</span>
                                    </button>
                                )}
                                
                                <a href="/blog" className="flex items-center bg-gray-100 text-gray-800 font-medium py-1 px-2.5 rounded-md hover:bg-gray-200 transition-colors text-xs">
                                    <Rss className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Blog</span>
                                </a>
                                
                                {user.canWriteBlog && (
                                    <button onClick={() => setCurrentView('blog')} className="flex items-center bg-gray-100 text-gray-800 font-medium py-1 px-2.5 rounded-md hover:bg-gray-200 transition-colors text-xs">
                                        <Edit className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Manage Blog</span>
                                    </button>
                                )}
                                
                                {user.linkedConsultantId && (
                                    <button onClick={() => setCurrentView('consultant')} className="flex items-center bg-purple-600 text-white font-medium py-1 px-2.5 rounded-md hover:bg-purple-700 transition-colors text-xs">
                                        <Briefcase className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Consultant</span>
                                    </button>
                                )}

                                <button 
                                    onClick={() => setIsExploreModalOpen(true)}
                                    className="flex items-center bg-gray-100 text-gray-800 font-medium py-1 px-2.5 rounded-md hover:bg-gray-200 transition-colors focus:outline-none text-xs"
                                >
                                    <Compass className="mr-0 sm:mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Explore More Apps</span>
                                </button>
                                <button onClick={() => setIsLogoutConfirmOpen(true)} className="flex items-center bg-red-500 text-white font-medium py-1 px-2.5 rounded-md hover:bg-red-600 transition-colors text-xs">
                                    <LogOut className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow flex flex-col px-4 sm:px-6 lg:px-8 py-4 gap-4">
                {isExpiryBannerVisible && <ExpiryWarningBanner onClose={() => setIsExpiryBannerVisible(false)} />}
                {selectedApp && isPopularityBannerVisible && totalUsageForSelectedApp > 0 && (
                    <PopularityBanner 
                        totalUsage={totalUsageForSelectedApp}
                        onClose={() => setIsPopularityBannerVisible(false)} 
                    />
                )}
                 <div className="flex-grow bg-white rounded-xl shadow-inner border border-gray-200 relative overflow-hidden">
                    {isIframeLoading && currentView === 'apps' && selectedApp && (
                         <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center text-gray-600 z-10 rounded-lg">
                            <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-lg font-semibold">Loading {selectedApp.name}...</p>
                        </div>
                    )}
                    {renderMainContent()}
                </div>
            </main>
            {isExploreModalOpen && (
                <ExploreAppsModal
                    allApps={allApps}
                    assignedAppsMap={user.apps || {}}
                    onClose={() => setIsExploreModalOpen(false)}
                    onPurchase={handlePurchaseFromExploreClick}
                />
            )}
            {isMyAppsModalOpen && (
                <MyAppsModal
                    assignedApps={assignedApps}
                    usageCounts={usageCounts}
                    userAppsSettings={user.apps || {}}
                    onLaunch={handleAppLaunchAttempt}
                    onPurchaseCredits={handlePurchaseCreditsClick}
                    onClose={() => setIsMyAppsModalOpen(false)}
                />
            )}
             {isMyAccountModalOpen && (
                <MyAccountModal
                    user={user}
                    allApps={allApps}
                    usageCounts={usageCounts}
                    userReviews={userReviews}
                    onClose={() => setIsMyAccountModalOpen(false)}
                    onLogout={onLogout}
                    showNotification={showNotification}
                    onEditReview={handleEditReview}
                />
            )}
            {isUsageExhaustedModalOpen && usageExhaustedData && (
                <UsageExhaustedModal
                    app={usageExhaustedData.app}
                    mode={usageExhaustedData.mode}
                    onClose={() => setIsUsageExhaustedModalOpen(false)}
                    onProceed={usageExhaustedData.onProceed}
                    onPurchase={handlePurchaseFromUsageModal}
                    usageCount={usageExhaustedData.usageCount}
                    limit={usageExhaustedData.limit}
                    reason={usageExhaustedData.reason}
                />
            )}
            {showFeedbackModal && (
                <FeedbackModal
                    app={showFeedbackModal.app}
                    user={user}
                    existingReview={userReviews.find(r => r.appId === showFeedbackModal.app.id)}
                    onSubmit={handleFeedbackSubmit}
                    onClose={() => {
                        setShowFeedbackModal(null);
                        executePendingNavigation();
                    }}
                />
            )}
             <LogoutConfirmationModal 
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={onLogout}
            />
            {isPurchaseModalOpen && appToPurchaseFor && (
                <PurchaseCreditsModal
                    app={appToPurchaseFor}
                    userProfile={user}
                    onClose={() => setIsPurchaseModalOpen(false)}
                    showNotification={showNotification}
                    onSuccess={setShowPaymentSuccess}
                />
            )}
             {playingVideoUrl && (
<VideoPlayerModal videoUrl={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />
)}
        </div>
    );
};

export default UserDashboard;