



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogOut, PlusCircle, Search, BarChart3, FileText, User as UserIcon, IndianRupee, Users, ClipboardList, Megaphone, Rss, Video, Mail, Image, Facebook, Instagram, Youtube, Twitter as XIcon, Linkedin, Briefcase, Home, MessageSquare as WhatsAppIcon, Webhook, RefreshCcw, Loader } from 'lucide-react';
// FIX: Import the firebase namespace to be used for firestore types.
import firebase from "firebase/compat/app";
import { db, firebaseConfig, initializeSecondaryApp, deleteApp, FieldValue } from '../../services/firebase.ts';
import type { UserProfile, NotificationType, UserFormData, AppDefinition, Review, PaymentOrder, AffiliateProfile, Payout, CreditLog, BlogPost, LandingPageDefinition, Lead, WebinarProduct, WebinarPurchase, EmailTemplate, EmailAssignments, MediaFile, SocialLinks, Consultant, ConsultantPackage, Appointment, VideoTestimonial, WhatsAppTemplate, WhatsAppAssignments, PageView, ConsultantLedger, ConsultantPayout, Expense } from '../../types.ts';
import { v4 as uuidv4 } from 'uuid';

import UserTable from './UserTable.tsx';
import UserModal from './UserModal.tsx';
import DeleteConfirmationModal from './DeleteConfirmationModal.tsx';
import AppManager from './AppManager.tsx';
import AppModal from './AppModal.tsx';
import DeleteAppConfirmationModal from './DeleteAppConfirmationModal.tsx';
import LogoutConfirmationModal from '../shared/LogoutConfirmationModal.tsx';
import UserCreationSuccessModal from './UserCreationSuccessModal.tsx';
import AnalyticsDashboard from './AnalyticsDashboard.tsx';
import { ExpiryWarningBanner } from '../shared/Notification.tsx';
import CommercialDashboard from './CommercialDashboard.tsx';
import AffiliateDashboard from './AffiliateDashboard.tsx';
import CreditLogDashboard from './CreditLogDashboard.tsx';
import SeoManager from './SeoManager.tsx';
import BlogManager from './BlogManager.tsx';
import BlogModal from './BlogModal.tsx';
import DeleteBlogConfirmationModal from './DeleteBlogConfirmationModal.tsx';
import LeadsDashboard from './LeadsDashboard.tsx';
import WebinarManager from './WebinarManager.tsx';
import WebinarPurchasesDashboard from './WebinarPurchasesDashboard.tsx';
import EmailTemplateManager from './EmailTemplateManager.tsx';
import MediaLibraryManager from './MediaLibraryManager.tsx';
import ConsultantDashboard from './ConsultantDashboard.tsx';
import HomePageManager from './HomePageManager.tsx';
import WhatsAppTemplateManager from './WhatsAppTemplateManager.tsx';
import WebhookManager from './WebhookManager.tsx';
import SiteContentManager from './SiteContentManager.tsx';
import PackageManagerModal from './PackageManagerModal.tsx';
import ConsultantSalesDashboard from './ConsultantSalesDashboard.tsx';
import ExpenseManager from './ExpenseManager.tsx';


interface AdminDashboardProps {
    currentUser: UserProfile;
    onLogout: () => Promise<void>;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    isExpiringToday: boolean;
}

type UserSortKeys = 'name' | 'validity' | 'updatedAt';
type ActiveTab = 'commercial' | 'expenses' | 'analytics' | 'credit_logs' | 'users' | 'apps' | 'seo' | 'affiliates' | 'blog' | 'leads' | 'webinars' | 'webinar_users' | 'email_templates' | 'whatsapp_templates' | 'media_library' | 'consultants' | 'homepage' | 'webhooks' | 'site_content' | 'consultant_sales';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout, showNotification, isExpiringToday }) => {
    // Data State
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [apps, setApps] = useState<AppDefinition[]>([]);
    const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [affiliateProfiles, setAffiliateProfiles] = useState<AffiliateProfile[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [landingPages, setLandingPages] = useState<LandingPageDefinition[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [webinarProducts, setWebinarProducts] = useState<WebinarProduct[]>([]);
    const [webinarPurchases, setWebinarPurchases] = useState<WebinarPurchase[]>([]);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [emailAssignments, setEmailAssignments] = useState<EmailAssignments | null>(null);
    const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>([]);
    const [whatsAppAssignments, setWhatsAppAssignments] = useState<WhatsAppAssignments | null>(null);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [socialLinks, setSocialLinks] = useState<SocialLinks | null>(null);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [consultantPackages, setConsultantPackages] = useState<ConsultantPackage[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [videoTestimonials, setVideoTestimonials] = useState<VideoTestimonial[]>([]);
    const [pageViews, setPageViews] = useState<PageView[]>([]);
    const [consultantLedgers, setConsultantLedgers] = useState<ConsultantLedger[]>([]);
    const [consultantPayouts, setConsultantPayouts] = useState<ConsultantPayout[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    
    // Performance-optimized states
    const [recentPaymentOrders, setRecentPaymentOrders] = useState<PaymentOrder[]>([]);
    const [historicalPaymentOrders, setHistoricalPaymentOrders] = useState<PaymentOrder[] | null>(null);

    // State for Analytics Tab filters to persist across tab changes
    const [analyticsSelectedPageIds, setAnalyticsSelectedPageIds] = useState<Set<string> | null>(() => {
        try {
            const stored = sessionStorage.getItem('analyticsPageFilter');
            if (stored) {
                return new Set(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to read page filter from session storage", e);
        }
        return null; // Return null if nothing is stored or if there's an error
    });


    // UI State
    const [activeTab, setActiveTab] = useState<ActiveTab>('commercial');
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isExpiryBannerVisible, setIsExpiryBannerVisible] = useState(isExpiringToday);

    // --- NEW LOADING STATES ---
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);


    // User Management State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isUserCreationSuccessModalOpen, setIsUserCreationSuccessModalOpen] = useState(false);
    const [newUserCredentials, setNewUserCredentials] = useState({email: '', password: ''});
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userSortConfig, setUserSortConfig] = useState<{ key: UserSortKeys, direction: 'ascending' | 'descending' }>({ key: 'updatedAt', direction: 'descending' });

    // App Management State
    const [isAppModalOpen, setIsAppModalOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<AppDefinition | null>(null);
    const [isDeleteAppConfirmOpen, setIsDeleteAppConfirmOpen] = useState(false);
    const [appToDelete, setAppToDelete] = useState<AppDefinition | null>(null);
    
    // Consultant Management State
    const [managingPackagesFor, setManagingPackagesFor] = useState<Consultant | null>(null);


    // Blog Management State
    const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    const [isDeleteBlogPostConfirmOpen, setIsDeleteBlogPostConfirmOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
    
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

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        if (isRefreshing) return;
        
        if (isInitialLoading) {
            // Already loading
        } else {
            setIsRefreshing(true);
        }

        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            // FIX: The type 'firebase.firestore.CollectionGroup' is not a valid type for a query.
            // The correct type is 'firebase.firestore.Query', which is returned by both 'collection' and 'collectionGroup' methods.
            const fetchCollection = async <T,>(query: firebase.firestore.Query): Promise<T[]> => {
                const snapshot = await query.get();
                return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
            };

            const fetchDoc = async <T,>(docRef: firebase.firestore.DocumentReference): Promise<T | null> => {
                const docSnap = await docRef.get();
                return docSnap.exists ? docSnap.data() as T : null;
            };

            const [
                recentOrdersData, historicalOrdersData, reviewsData, usersData, appsData,
                usageCountsSnap, affiliateProfilesData, payoutsData, creditLogsData,
                blogPostsData, landingPagesData, leadsData, webinarProductsData,
                webinarPurchasesData, emailTemplatesData, whatsAppTemplatesData,
                mediaFilesData, consultantsData, consultantPackagesData, appointmentsData,
                pageViewsData, consultantLedgersData, consultantPayoutsData, expensesData,
                emailAssignmentsData, whatsAppAssignmentsData, liveContentData
            ] = await Promise.all([
                fetchCollection<PaymentOrder>(db.collection("payment_orders").where("createdAt", ">=", thirtyDaysAgo).orderBy("createdAt", "desc")),
                fetchCollection<PaymentOrder>(db.collection("payment_orders").where("createdAt", "<", thirtyDaysAgo)),
                fetchCollection<Review>(db.collection('reviews')),
                fetchCollection<UserProfile>(db.collection("users")),
                fetchCollection<AppDefinition>(db.collection("apps")),
                db.collection('usage_counts').get(),
                fetchCollection<AffiliateProfile>(db.collection("affiliate_profiles")),
                fetchCollection<Payout>(db.collection("payouts")),
                fetchCollection<CreditLog>(db.collection("credit_logs").orderBy("timestamp", "desc")),
                fetchCollection<BlogPost>(db.collection("blogs").orderBy("createdAt", "desc")),
                fetchCollection<LandingPageDefinition>(db.collection("landingPages").orderBy("createdAt", "desc")),
                fetchCollection<Lead>(db.collection("leads").orderBy("createdAt", "desc")),
                fetchCollection<WebinarProduct>(db.collection("webinar_products").orderBy("createdAt", "desc")),
                fetchCollection<WebinarPurchase>(db.collection("webinar_purchases").orderBy("purchaseDate", "desc")),
                fetchCollection<EmailTemplate>(db.collection("email_templates").orderBy("createdAt", "desc")),
                fetchCollection<WhatsAppTemplate>(db.collection("whatsApp_templates").orderBy("createdAt", "desc")),
                fetchCollection<MediaFile>(db.collection("media_library").orderBy("createdAt", "desc")),
                fetchCollection<Consultant>(db.collection("consultants").orderBy("createdAt", "desc")),
                fetchCollection<ConsultantPackage>(db.collectionGroup('consultant_packages')),
                fetchCollection<Appointment>(db.collection("appointments").orderBy("appointmentStart", "desc")),
                fetchCollection<PageView>(db.collection("page_views")),
                fetchCollection<ConsultantLedger>(db.collection("consultant_ledgers")),
                fetchCollection<ConsultantPayout>(db.collection("consultant_payouts").orderBy("requestedAt", "desc")),
                fetchCollection<Expense>(db.collection("expenses").orderBy("date", "desc")),
                fetchDoc<EmailAssignments>(db.collection("site_content").doc("email_assignments")),
                fetchDoc<WhatsAppAssignments>(db.collection("site_content").doc("whatsApp_assignments")),
                fetchDoc<any>(db.collection('site_content').doc('live')),
            ]);

            // Set all states
            setRecentPaymentOrders(recentOrdersData);
            setHistoricalPaymentOrders(historicalOrdersData);
            setUsers(usersData);
            setApps(appsData);
            const newUsageCounts: Record<string, number> = {};
            usageCountsSnap.forEach(doc => { newUsageCounts[doc.id] = doc.data().count || 0; });
            setUsageCounts(newUsageCounts);
            setAffiliateProfiles(affiliateProfilesData);
            setPayouts(payoutsData);
            setCreditLogs(creditLogsData);
            setBlogPosts(blogPostsData);
            setLandingPages(landingPagesData);
            setLeads(leadsData);
            setWebinarProducts(webinarProductsData);
            setWebinarPurchases(webinarPurchasesData);
            setEmailTemplates(emailTemplatesData);
            setWhatsAppTemplates(whatsAppTemplatesData);
            setMediaFiles(mediaFilesData);
            setConsultants(consultantsData);
            setConsultantPackages(consultantPackagesData);
            setAppointments(appointmentsData);
            setPageViews(pageViewsData);
            setConsultantLedgers(consultantLedgersData);
            setConsultantPayouts(consultantPayoutsData);
            setExpenses(expensesData);
            setEmailAssignments(emailAssignmentsData);
            setWhatsAppAssignments(whatsAppAssignmentsData);
            setVideoTestimonials((liveContentData?.videoTestimonials || []).map((vt: any) => ({ ...vt, id: vt.id || uuidv4() })));

            // Re-apply review patching logic
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const timeRange = new Date().getTime() - threeMonthsAgo.getTime();
            const hashString = (str: string) => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = ((hash << 5) - hash) + str.charCodeAt(i);
                    hash |= 0;
                }
                return Math.abs(hash);
            };

            const reviewsWithPatchedDates = reviewsData.map(review => {
                const patchedReview = { ...review };
                let createdAtDate: Date;
                if (patchedReview.createdAt && typeof (patchedReview.createdAt as any).toDate === 'function') {
                    createdAtDate = (patchedReview.createdAt as any).toDate();
                } else {
                    // This patching logic seems to be for old data that might not have a proper timestamp.
                    const stableRandomTime = threeMonthsAgo.getTime() + (hashString(patchedReview.id) % timeRange);
                    createdAtDate = new Date(stableRandomTime);
                }

                let updatedAtDate: Date;
                if (patchedReview.updatedAt && typeof (patchedReview.updatedAt as any).toDate === 'function') {
                    updatedAtDate = (patchedReview.updatedAt as any).toDate();
                } else {
                    // If updatedAt is missing or invalid, fall back to createdAt.
                    updatedAtDate = createdAtDate;
                }

                return {
                    ...patchedReview,
                    createdAt: createdAtDate,
                    updatedAt: updatedAtDate,
                };
            }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            setAllReviews(reviewsWithPatchedDates as Review[]);

            if (!isInitialLoading) {
                 showNotification('Dashboard data has been refreshed.', 'success');
            }

        } catch (error: any) {
            console.error("Error fetching data:", error);
            showNotification(`Failed to refresh data: ${error.message}`, 'error');
        } finally {
            setIsInitialLoading(false);
            setIsRefreshing(false);
        }
    }, [isInitialLoading, isRefreshing, showNotification]);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    // This effect synchronizes the stored filter with the available pages and sets the default if needed.
    useEffect(() => {
        if (pageViews.length > 0) {
            const allPageIds = new Set(pageViews.map(p => p.id));
            
            if (analyticsSelectedPageIds) {
                // Filter out any stale IDs that might be in storage but no longer exist
                const validStoredIds = new Set(
                    Array.from(analyticsSelectedPageIds).filter(id => allPageIds.has(id))
                );
                // If the state differs (because we filtered out stale IDs), update it.
                if (validStoredIds.size !== analyticsSelectedPageIds.size) {
                    setAnalyticsSelectedPageIds(validStoredIds);
                }
            } else {
                // If state is null (nothing in storage), set the default to all pages
                setAnalyticsSelectedPageIds(allPageIds);
            }
        }
    }, [pageViews, analyticsSelectedPageIds]);

    // Effect to save filter state to sessionStorage
    useEffect(() => {
        if (analyticsSelectedPageIds) {
            try {
                const ids = Array.from(analyticsSelectedPageIds);
                sessionStorage.setItem('analyticsPageFilter', JSON.stringify(ids));
            } catch (e) {
                console.error("Failed to save page filter to session storage", e);
            }
        }
    }, [analyticsSelectedPageIds]);

    const allPaymentOrders = useMemo(() => {
        if (historicalPaymentOrders === null) return recentPaymentOrders;
        return [...recentPaymentOrders, ...historicalPaymentOrders];
    }, [recentPaymentOrders, historicalPaymentOrders]);


    // Calculate total usage per app from the detailed creditLogs collection data
    const appUsageTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        // Initialize totals for all known apps to 0.
        apps.forEach(app => {
            totals[app.id] = 0;
        });
        
        // Aggregate usage from the single source of truth: creditLogs.
        // This captures usage from limited, unlimited, and fair-use plans.
        creditLogs.forEach(log => {
            if (totals.hasOwnProperty(log.appId)) {
                // Each log represents an action. We sum creditsDeducted to get total usage.
                // For standard usage, creditsDeducted is 1.
                totals[log.appId] += log.creditsDeducted;
            }
        });
        
        return totals;
    }, [apps, creditLogs]);
    
    // Calculate average rating and total reviews for each app
    const appRatingStats = useMemo(() => {
        const stats: Record<string, { sum: number, count: number }> = {};

        for (const review of allReviews) {
            if (review.appId && typeof review.rating === 'number') {
                if (!stats[review.appId]) {
                    stats[review.appId] = { sum: 0, count: 0 };
                }
                stats[review.appId].sum += review.rating;
                stats[review.appId].count++;
            }
        }

        const finalStats: Record<string, { totalReviews: number, averageRating: number }> = {};
        for (const appId in stats) {
            finalStats[appId] = {
                totalReviews: stats[appId].count,
                averageRating: stats[appId].count > 0 ? stats[appId].sum / stats[appId].count : 0
            };
        }
        return finalStats;
    }, [allReviews]);

    // EFFECT TO SYNC TOTALS
    useEffect(() => {
        const syncTotalsToFirestore = async () => {
            if (apps.length === 0 || Object.keys(appUsageTotals).length === 0) return;

            const batch = db.batch();
            let updatesMade = 0;

            apps.forEach(app => {
                const calculatedTotal = appUsageTotals[app.id] ?? 0;
                const storedTotal = app.totalUsage ?? 0;

                if (calculatedTotal !== storedTotal) {
                    const appDocRef = db.collection("apps").doc(app.id);
                    batch.update(appDocRef, { totalUsage: calculatedTotal });
                    updatesMade++;
                }
            });

            if (updatesMade > 0) {
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Failed to sync app usage totals:", error);
                }
            }
        };

        syncTotalsToFirestore();
    }, [appUsageTotals, apps]);


    // --- Filtering and Sorting ---
    const filteredAndSortedUsers = useMemo(() => {
        let sortableUsers = users.filter(u => u.role === 'user');

        if (userSearchTerm) {
            const lowercasedTerm = userSearchTerm.toLowerCase();
            sortableUsers = sortableUsers.filter(user =>
                user.name.toLowerCase().includes(lowercasedTerm) ||
                (user.email && user.email.toLowerCase().includes(lowercasedTerm)) ||
                (user.phone && user.phone.includes(userSearchTerm))
            );
        }

        sortableUsers.sort((a, b) => {
            const { key, direction } = userSortConfig;
            const dir = direction === 'ascending' ? 1 : -1;

            let aValue, bValue;

            if (key === 'updatedAt') {
                aValue = a.updatedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
                bValue = b.updatedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
            } else {
                aValue = a[key as keyof UserProfile] || '';
                bValue = b[key as keyof UserProfile] || '';
            }

            if (aValue < bValue) return -1 * dir;
            if (aValue > bValue) return 1 * dir;
            return 0;
        });

        return sortableUsers;
    }, [users, userSearchTerm, userSortConfig]);

    const usersForConsultantDashboard = useMemo(() => users.filter(u => u.role === 'user'), [users]);

    // --- User Management Handlers ---
    const handleOpenUserModal = (user: UserProfile | null = null) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleCloseUserModal = () => {
        setIsUserModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userData: UserFormData) => {
        if (editingUser) {
             try {
                const { password, ...firestoreDataWithoutPassword } = userData;
                
                const updateData: { [key: string]: any } = {
                    ...firestoreDataWithoutPassword,
                    updatedAt: FieldValue.serverTimestamp()
                };
    
                const userDocRef = db.collection("users").doc(editingUser.id);
                await userDocRef.update(updateData);
                showNotification('User updated successfully!', 'success');
                handleCloseUserModal();
                fetchData(); // Refresh data after update
            } catch (error: any) {
                showNotification(`Error updating user: ${error.message}`, 'error');
                console.error("Update User Error: ", error);
            }
        } else {
            // Logic for creating a new user
            if (!userData.password || userData.password.length < 6) {
                showNotification('Password is required and must be at least 6 characters long.', 'error');
                return;
            }
            
            const tempAppName = `temp-user-creation-${Date.now()}`;
            const { app: tempApp, auth: tempAuth } = initializeSecondaryApp(firebaseConfig, tempAppName);
            
            try {
                const userCredential = await tempAuth.createUserWithEmailAndPassword(userData.email, userData.password);
                const newUid = userCredential.user!.uid;

                const userDocRef = db.collection("users").doc(newUid);
                const { password, ...firestoreData } = userData;
                await userDocRef.set({ 
                    ...firestoreData, 
                    role: 'user', 
                    mustChangePassword: true, 
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });

                showNotification(`User ${userData.email} created successfully!`, 'success');
                setNewUserCredentials({ email: userData.email, password: userData.password });
                setIsUserCreationSuccessModalOpen(true);
                handleCloseUserModal();
                fetchData(); // Refresh data after creation
            } catch (error: any) {
                const errorMessage = error.code ? error.code.replace('auth/', '').replace(/-/g, ' ') : error.message;
                showNotification(`Error saving user: ${errorMessage}`, 'error');
                console.error("Save User Error: ", error);
            } finally {
                // Important: Clean up the temporary Firebase app instance
                await deleteApp(tempApp).catch(e => console.error("Failed to delete temp app", e));
            }
        }
    };
    
    const handleDeleteUserClick = (user: UserProfile) => {
        setUserToDelete(user);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await db.collection("users").doc(userToDelete.id).delete();
            showNotification(`User record for ${userToDelete.name} deleted. Remember to also delete their login from the Firebase Authentication console.`, 'info', 8000);
            setIsDeleteConfirmOpen(false);
            setUserToDelete(null);
            fetchData();
        } catch(error: any) {
            showNotification(`Error deleting user record: ${error.message}`, 'error');
        }
    };

    // --- App Management Handlers ---
    const handleOpenAppModal = (app: AppDefinition | null = null) => {
        setEditingApp(app);
        setIsAppModalOpen(true);
    };
    
    const handleCloseAppModal = () => {
        setIsAppModalOpen(false);
        setEditingApp(null);
    };

    const handleSaveApp = async (appData: Omit<AppDefinition, 'id'>) => {
        try {
            if (editingApp) {
                const appDocRef = db.collection("apps").doc(editingApp.id);
                await appDocRef.update(appData);
                showNotification('Application updated successfully!', 'success');
            } else {
                const dataToCreate = { ...appData, totalUsage: 0 };
                await db.collection("apps").add(dataToCreate);
                showNotification('Application added successfully!', 'success');
            }
            handleCloseAppModal();
            fetchData();
        } catch (error: any) {
            showNotification(`Error saving application: ${error.message}`, 'error');
            console.error("Save App Error: ", error);
        }
    };

    const handleDeleteAppClick = (app: AppDefinition) => {
        setAppToDelete(app);
        setIsDeleteAppConfirmOpen(true);
    };

    const confirmDeleteApp = async () => {
        if (!appToDelete) return;
        try {
            await db.collection("apps").doc(appToDelete.id).delete();
            showNotification(`Application '${appToDelete.name}' deleted successfully.`, 'success');
            setIsDeleteAppConfirmOpen(false);
            setAppToDelete(null);
            fetchData();
        } catch(error: any) {
            showNotification(`Error deleting application: ${error.message}`, 'error');
        }
    };

    // --- Blog Management Handlers ---
    const handleOpenBlogModal = (post: BlogPost | null = null) => {
        setEditingPost(post);
        setIsBlogModalOpen(true);
    };
    
    const handleCloseBlogModal = () => {
        setIsBlogModalOpen(false);
        setEditingPost(null);
    };

    const handleSaveBlogPost = async (postData: Omit<BlogPost, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>) => {
        const dataToSave = {
            ...postData,
            authorId: currentUser.id,
            authorName: "Acharya Preeti Sharma",
            updatedAt: FieldValue.serverTimestamp(),
        };

        try {
            if (editingPost) {
                const postDocRef = db.collection("blogs").doc(editingPost.id);
                await postDocRef.update(dataToSave);
                showNotification('Blog post updated!', 'success');
            } else {
                await db.collection("blogs").add({
                    ...dataToSave,
                    createdAt: FieldValue.serverTimestamp(),
                });
                showNotification('Blog post created!', 'success');
            }
            handleCloseBlogModal();
            fetchData();
        } catch (error: any) {
            showNotification(`Error saving post: ${error.message}`, 'error');
            console.error("Save Post Error: ", error);
        }
    };
    
    const handleDeleteBlogPostClick = (post: BlogPost) => {
        setPostToDelete(post);
        setIsDeleteBlogPostConfirmOpen(true);
    };

    const confirmDeleteBlogPost = async () => {
        if (!postToDelete) return;
        try {
            await db.collection("blogs").doc(postToDelete.id).delete();
            showNotification(`Blog post '${postToDelete.title}' deleted.`, 'success');
            setIsDeleteBlogPostConfirmOpen(false);
            setPostToDelete(null);
            fetchData();
        } catch(error: any) {
            showNotification(`Error deleting post: ${error.message}`, 'error');
        }
    };

     // --- Consultant Management Handlers ---
    const handleSaveConsultant = async (consultantData: any) => {
        try {
            const batch = db.batch();
            let consultantRef;
            const { id, ...data } = consultantData;

            const previousConsultantState = consultants.find(c => c.id === id);
            const previouslyLinkedUserId = previousConsultantState?.linkedUserId;
            const newLinkedUserId = data.linkedUserId;

            // 1. Create or update the consultant document
            if (id) {
                consultantRef = db.collection('consultants').doc(id);
                batch.update(consultantRef, data);
            } else {
                consultantRef = db.collection('consultants').doc();
                data.createdAt = FieldValue.serverTimestamp();
                batch.set(consultantRef, data);
            }

            // 2. Handle user linking logic transactionally
            if (newLinkedUserId !== previouslyLinkedUserId) {
                // Unlink the old user if there was one
                if (previouslyLinkedUserId) {
                    const oldUserRef = db.collection('users').doc(previouslyLinkedUserId);
                    batch.update(oldUserRef, { linkedConsultantId: FieldValue.delete() });
                }
                // Link the new user
                if (newLinkedUserId) {
                    const newUserRef = db.collection('users').doc(newLinkedUserId);
                    batch.update(newUserRef, { linkedConsultantId: consultantRef.id });
                }
            }
            
            await batch.commit();
            showNotification(id ? 'Consultant updated successfully!' : 'Consultant created successfully!', 'success');
            fetchData();
        } catch (error: any) {
            showNotification(`Error saving consultant: ${error.message}`, 'error');
            console.error("Save Consultant Error: ", error);
            throw error; // re-throw to be caught by modal
        }
    };


    const getTabClass = (tabName: ActiveTab) => {
        return `flex-1 sm:flex-none justify-center whitespace-nowrap flex items-center gap-2 py-4 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === tabName
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`;
    };

    if (isInitialLoading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center h-[80vh]">
                <div className="text-center">
                    <Loader className="animate-spin text-blue-500 mx-auto" size={48} />
                    <p className="mt-4 text-gray-600 font-semibold">Loading dashboard data...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
             {isExpiryBannerVisible && (
                <div className="mb-6">
                    <ExpiryWarningBanner onClose={() => setIsExpiryBannerVisible(false)} />
                </div>
            )}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <div className="flex items-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0">
                        <path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"></path>
                        <path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"></path>
                        <path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"></path>
                        <path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"></path>
                    </svg>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Powerful Tools</h1>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <span>By Acharya Preeti Sharma</span>
                            {socialLinks?.facebook?.url && (
                                <a href={socialLinks.facebook.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:opacity-80 transition-opacity" aria-label="Facebook">
                                    <Facebook size={16} />
                                </a>
                            )}
                            {socialLinks?.instagram?.url && (
                                <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:opacity-80 transition-opacity" aria-label="Instagram">
                                    <Instagram size={16} />
                                </a>
                            )}
                            {socialLinks?.youtube?.url && (
                                <a href={socialLinks.youtube.url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:opacity-80 transition-opacity" aria-label="YouTube">
                                    <Youtube size={16} />
                                </a>
                            )}
                            {socialLinks?.x?.url && (
                                <a href={socialLinks.x.url} target="_blank" rel="noopener noreferrer" className="text-black hover:opacity-80 transition-opacity" aria-label="X (Twitter)">
                                    <XIcon size={16} />
                                </a>
                            )}
                            {socialLinks?.linkedin?.url && (
                                <a href={socialLinks.linkedin.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:opacity-80 transition-opacity" aria-label="LinkedIn">
                                    <Linkedin size={16} />
                                </a>
                            )}
                        </div>
                        <p className="text-gray-500 mt-1">Admin Dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                     <div className="flex flex-col items-start sm:items-end">
                        <p className="text-gray-500 text-sm">Logged in as: <span className="font-medium">{currentUser.email}</span></p>
                        <div className="flex items-center gap-2 mt-2">
                            <button onClick={fetchData} disabled={isRefreshing} className="flex items-center bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-wait">
                                {isRefreshing ? <Loader className="animate-spin mr-2 h-5 w-5" /> : <RefreshCcw className="mr-2 h-5 w-5" />}
                                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                            </button>
                            <button onClick={() => setIsLogoutConfirmOpen(true)} className="flex items-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                                <LogOut className="mr-2 h-5 w-5" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="space-y-8">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                         <button onClick={() => setActiveTab('commercial')} className={getTabClass('commercial')} title="Commercial">
                            <IndianRupee size={16} />
                            <span className="hidden sm:inline">Commercial</span>
                        </button>
                        <button onClick={() => setActiveTab('expenses')} className={getTabClass('expenses')} title="Expenses">
                            <IndianRupee size={16} />
                            <span className="hidden sm:inline">Expenses</span>
                        </button>
                        <button onClick={() => setActiveTab('consultant_sales')} className={getTabClass('consultant_sales')} title="Consultant Sales">
                            <IndianRupee size={16} />
                            <span className="hidden sm:inline">Consultant Sales</span>
                        </button>
                         <button onClick={() => setActiveTab('analytics')} className={getTabClass('analytics')} title="Analytics">
                            <BarChart3 size={16} />
                            <span className="hidden sm:inline">Analytics</span>
                        </button>
                         <button onClick={() => setActiveTab('leads')} className={getTabClass('leads')} title="Leads">
                            <ClipboardList size={16} />
                            <span className="hidden sm:inline">Leads</span>
                        </button>
                         <button onClick={() => setActiveTab('credit_logs')} className={getTabClass('credit_logs')} title="Credit Logs">
                            <ClipboardList size={16} />
                            <span className="hidden sm:inline">Credit Logs</span>
                        </button>
                        <button onClick={() => setActiveTab('users')} className={getTabClass('users')} title="Users">
                           <UserIcon size={16} />
                           <span className="hidden sm:inline">Users</span>
                        </button>
                        <button onClick={() => setActiveTab('apps')} className={getTabClass('apps')} title="Apps">
                           <PlusCircle size={16} />
                           <span className="hidden sm:inline">Apps</span>
                        </button>
                         <button onClick={() => setActiveTab('homepage')} className={getTabClass('homepage')} title="Homepage">
                           <Home size={16} />
                           <span className="hidden sm:inline">Homepage</span>
                        </button>
                        <button onClick={() => setActiveTab('consultants')} className={getTabClass('consultants')} title="Consultants">
                           <Briefcase size={16} />
                           <span className="hidden sm:inline">Consultants</span>
                        </button>
                        <button onClick={() => setActiveTab('media_library')} className={getTabClass('media_library')} title="Media Library">
                            <Image size={16} />
                            <span className="hidden sm:inline">Media Library</span>
                        </button>
                        <button onClick={() => setActiveTab('webinars')} className={getTabClass('webinars')} title="Webinars">
                           <Video size={16} />
                           <span className="hidden sm:inline">Webinars</span>
                        </button>
                        <button onClick={() => setActiveTab('webinar_users')} className={getTabClass('webinar_users')} title="Webinar Users">
                           <Users size={16} />
                           <span className="hidden sm:inline">Webinar Users</span>
                        </button>
                        <button onClick={() => setActiveTab('blog')} className={getTabClass('blog')} title="Blog">
                           <Rss size={16} />
                           <span className="hidden sm:inline">Blog</span>
                        </button>
                        <button onClick={() => setActiveTab('site_content')} className={getTabClass('site_content')} title="Site Content">
                            <FileText size={16} />
                            <span className="hidden sm:inline">Site Content</span>
                        </button>
                        <button onClick={() => setActiveTab('webhooks')} className={getTabClass('webhooks')} title="Webhooks">
                            <Webhook size={16} />
                            <span className="hidden sm:inline">Webhooks</span>
                        </button>
                        <button onClick={() => setActiveTab('email_templates')} className={getTabClass('email_templates')} title="Email Templates">
                            <Mail size={16} />
                            <span className="hidden sm:inline">Email</span>
                        </button>
                        <button onClick={() => setActiveTab('whatsapp_templates')} className={getTabClass('whatsapp_templates')} title="WhatsApp Templates">
                            <WhatsAppIcon size={16} />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button onClick={() => setActiveTab('seo')} className={getTabClass('seo')} title="SEO">
                            <Megaphone size={16} />
                            <span className="hidden sm:inline">SEO</span>
                        </button>
                        <button onClick={() => setActiveTab('affiliates')} className={getTabClass('affiliates')} title="Affiliates">
                            <Users size={16} />
                            <span className="hidden sm:inline">Affiliates</span>
                        </button>
                    </nav>
                </div>

                 {activeTab === 'commercial' && (
                    <CommercialDashboard
                        paymentOrders={allPaymentOrders}
                        apps={apps}
                        users={users}
                        showNotification={showNotification}
                        expenses={expenses}
                    />
                )}

                {activeTab === 'expenses' && (
                    <ExpenseManager currentUser={currentUser} showNotification={showNotification} />
                )}

                {activeTab === 'consultant_sales' && (
                    <ConsultantSalesDashboard
                        paymentOrders={allPaymentOrders.filter(o => o.consultantId && (o.status === 'completed' || o.status === 'completed_manual'))}
                        consultants={consultants}
                        ledgers={consultantLedgers}
                        payouts={consultantPayouts}
                        showNotification={showNotification}
                    />
                )}
                
                 {activeTab === 'analytics' && (
                    <AnalyticsDashboard
                        users={users.filter(u => u.role === 'user')}
                        apps={apps}
                        allReviews={allReviews}
                        appUsageTotals={appUsageTotals}
                        appRatingStats={appRatingStats}
                        pageViews={pageViews}
                        selectedPageIds={analyticsSelectedPageIds}
                        setSelectedPageIds={setAnalyticsSelectedPageIds}
                    />
                )}
                
                {activeTab === 'leads' && (
                    <LeadsDashboard
                        leads={leads}
                        showNotification={showNotification}
                    />
                )}

                {activeTab === 'credit_logs' && (
                    <CreditLogDashboard
                        users={users.filter(u => u.role === 'user')}
                        apps={apps}
                        creditLogs={creditLogs}
                    />
                )}

                {activeTab === 'users' && (
                    <section className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or phone..."
                                    value={userSearchTerm}
                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>
                            <button onClick={() => handleOpenUserModal()} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-5 w-5" /> Create User Profile
                            </button>
                        </div>
                        <UserTable 
                            users={filteredAndSortedUsers} 
                            allUsers={users}
                            allApps={apps} 
                            usageCounts={usageCounts} 
                            onEdit={handleOpenUserModal} 
                            onDelete={handleDeleteUserClick}
                            onSortChange={setUserSortConfig}
                            sortConfig={userSortConfig}
                            consultants={consultants}
                            affiliateProfiles={affiliateProfiles}
                        />
                    </section>
                )}

                {activeTab === 'apps' && (
                    <AppManager 
                        apps={apps} 
                        landingPages={landingPages}
                        appUsageTotals={appUsageTotals} 
                        appRatingStats={appRatingStats}
                        onEdit={handleOpenAppModal} 
                        onDelete={handleDeleteAppClick} 
                        showNotification={showNotification}
                        onAddNew={() => handleOpenAppModal(null)}
                    />
                )}

                 {activeTab === 'homepage' && (
                    <HomePageManager
                        showNotification={showNotification}
                        apps={apps}
                        blogPosts={blogPosts}
                        allReviews={allReviews}
                        videoTestimonials={videoTestimonials}
                    />
                )}

                 {activeTab === 'consultants' && (
                    <ConsultantDashboard
                        consultants={consultants}
                        packages={consultantPackages}
                        appointments={appointments}
                        mediaFiles={mediaFiles}
                        videoTestimonials={videoTestimonials}
                        showNotification={showNotification}
                        users={usersForConsultantDashboard}
                        onSaveConsultant={handleSaveConsultant}
                        // FIX: Pass a no-op function to satisfy the type checker, as the parent component does not use this state.
                        setEditingConsultant={() => {}}
                    />
                )}

                {activeTab === 'media_library' && (
                    <MediaLibraryManager
                        mediaFiles={mediaFiles}
                        showNotification={showNotification}
                    />
                )}

                {activeTab === 'webinars' && (
                    <WebinarManager
                        webinarProducts={webinarProducts}
                        apps={apps}
                        showNotification={showNotification}
                    />
                )}
                
                {activeTab === 'webinar_users' && (
                    <WebinarPurchasesDashboard
                        purchases={webinarPurchases}
                        showNotification={showNotification}
                    />
                )}

                {activeTab === 'blog' && (
                     <BlogManager
                        posts={blogPosts}
                        onEdit={handleOpenBlogModal}
                        onDelete={handleDeleteBlogPostClick}
                        onAddNew={() => handleOpenBlogModal(null)}
                     />
                )}

                {activeTab === 'site_content' && (
                    <SiteContentManager showNotification={showNotification} videoTestimonials={videoTestimonials} />
                )}

                {activeTab === 'webhooks' && (
                    <WebhookManager showNotification={showNotification} />
                )}

                {activeTab === 'email_templates' && (
                    <EmailTemplateManager
                        templates={emailTemplates}
                        assignments={emailAssignments}
                        showNotification={showNotification}
                    />
                )}
                
                {activeTab === 'whatsapp_templates' && (
                    <WhatsAppTemplateManager
                        templates={whatsAppTemplates}
                        assignments={whatsAppAssignments}
                        showNotification={showNotification}
                    />
                )}

                {activeTab === 'seo' && (
                    <SeoManager showNotification={showNotification} />
                )}

                {activeTab === 'affiliates' && (
                    <AffiliateDashboard 
                        affiliateProfiles={affiliateProfiles}
                        payouts={payouts}
                        users={users}
                        showNotification={showNotification}
                    />
                )}
                
                <div className="pt-4 grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg">
                        <h4 className="font-bold mb-2">New User Workflow</h4>
                        <ol className="list-decimal list-inside text-sm space-y-1">
                            <li>Click "Create User Profile".</li>
                            <li>Fill in their name, email, and a temporary password (min 6 characters).</li>
                            <li>Assign applications and set validity dates as needed.</li>
                            <li>After creation, copy the provided instructions and send them to the new user.</li>
                        </ol>
                    </div>
                     <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-800 rounded-r-lg">
                        <h4 className="font-bold mb-2">Important: App Compatibility</h4>
                        <p className="text-sm">For an app to work inside the portal's iframe, its server must allow embedding. If an app shows a blank screen, you must remove the `X-Frame-Options` header from its server response on its hosting platform (e.g., Google Cloud Run).</p>
                    </div>
                </div>
            </main>

            {isUserModalOpen && <UserModal user={editingUser} allApps={apps} onClose={handleCloseUserModal} onSave={handleSaveUser} showNotification={showNotification} consultants={consultants} />}
            {isDeleteConfirmOpen && <DeleteConfirmationModal user={userToDelete} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={confirmDeleteUser} />}
            
            {isAppModalOpen && <AppModal app={editingApp} onClose={handleCloseAppModal} onSave={handleSaveApp} showNotification={showNotification} />}
            {isDeleteAppConfirmOpen && <DeleteAppConfirmationModal app={appToDelete} onClose={() => setIsDeleteAppConfirmOpen(false)} onConfirm={confirmDeleteApp} />}
            
            {isBlogModalOpen && <BlogModal post={editingPost} onClose={handleCloseBlogModal} onSave={handleSaveBlogPost} showNotification={showNotification} />}
            {isDeleteBlogPostConfirmOpen && <DeleteBlogConfirmationModal post={postToDelete} onClose={() => setIsDeleteBlogPostConfirmOpen(false)} onConfirm={confirmDeleteBlogPost} />}
            
            {managingPackagesFor && (
                <PackageManagerModal
                    consultant={managingPackagesFor}
                    packages={consultantPackages.filter(p => p.consultantId === managingPackagesFor.id)}
                    onClose={() => setManagingPackagesFor(null)}
                    showNotification={showNotification}
                />
            )}
            
            <LogoutConfirmationModal 
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={onLogout}
            />

            {isUserCreationSuccessModalOpen && (
                <UserCreationSuccessModal 
                    isOpen={isUserCreationSuccessModalOpen}
                    onClose={() => setIsUserCreationSuccessModalOpen(false)}
                    email={newUserCredentials.email}
                    password={newUserCredentials.password}
                />
            )}
        </div>
    );
};

export default AdminDashboard;