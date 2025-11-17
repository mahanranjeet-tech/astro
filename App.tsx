

import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, FieldValue } from './services/firebase.ts';

import type { UserProfile, NotificationState, NotificationType, CartItem, ConsultationPurchase } from './types.ts';

import LoginScreen from './components/auth/LoginScreen.tsx';
import AdminDashboard from './components/admin/AdminDashboard.tsx';
import UserDashboard from './components/user/UserDashboard.tsx';
import ForcePasswordChange from './components/auth/ForcePasswordChange.tsx';
import Notification from './components/shared/Notification.tsx';
import InitialLoadingScreen from './components/shared/InitialLoadingScreen.tsx';
import OfflineBanner from './components/shared/OfflineBanner.tsx';
import AccountExpiredScreen from './components/auth/AccountExpiredScreen.tsx';
import Footer from './components/public/Footer.tsx';
import InfoPage from './components/public/InfoPage.tsx';
import { PricingPage } from './components/public/PricingPage.tsx';
import PaymentSuccessAnimation from './components/user/PaymentSuccessAnimation.tsx';
import BlogListPage from './components/public/BlogListPage.tsx';
import BlogPostPage from './components/public/BlogPostPage.tsx';
import LandingPage from './components/public/LandingPage.tsx';
// FIX: Changed import to be a named import as ConsultantPage is not a default export.
import { ConsultantPage } from './components/public/ConsultantPage.tsx';
import BookingPage from './components/public/BookingPage.tsx';
import HomePage from './components/public/HomePage.tsx';
import OfferPage from './components/public/OfferPage.tsx';

declare global {
    interface Window {
        fbq: (...args: any[]) => void;
        _fbq: any;
    }
}

interface ViewState {
    view: string;
    slug?: string;
    id?: string;
}

const App = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | 'loading' | null>('loading');
    const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'success' });
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
    const [consultationPurchaseId, setConsultationPurchaseId] = useState<string | null>(null);
    const [lastPurchaseDetails, setLastPurchaseDetails] = useState<CartItem[] | null>(null);

    const getViewFromPath = (path: string): ViewState => {
        const cleanPath = path.replace(/^\//, '');

        if (cleanPath === '') {
            return { view: 'home' };
        }

        if (cleanPath.startsWith('blog/')) {
            const slug = cleanPath.substring('blog/'.length);
            if (slug) {
                return { view: 'blog-post', slug };
            }
        }
        
        if (cleanPath.startsWith('app/')) {
            const slugAndMore = cleanPath.substring('app/'.length);
            if (slugAndMore.endsWith('/offers')) {
                const slug = slugAndMore.replace('/offers', '');
                return { view: 'offer-page', slug };
            }
            if (slugAndMore) {
                return { view: 'landing-page', slug: slugAndMore };
            }
        }

        if (cleanPath.startsWith('consultants/')) {
            const slug = cleanPath.substring('consultants/'.length);
            if (slug) {
                return { view: 'consultant-page', slug };
            }
        }
        
        if (cleanPath.startsWith('booking/')) {
            const id = cleanPath.substring('booking/'.length);
            if (id) {
                return { view: 'booking-page', id };
            }
        }

        const validViews = ['about', 'contact', 'pricing', 'privacy', 'terms', 'refund', 'dashboard', 'shipping', 'blog', 'login'];
        if (validViews.includes(cleanPath)) {
            return { view: cleanPath };
        }
        return { view: 'home' };
    };
    
    const [viewState, setViewState] = useState(getViewFromPath(window.location.pathname));
    const setView = useCallback((path: string) => {
        setViewState(getViewFromPath(path));
    }, []);

    const handlePurchaseSuccess = async (purchaseIdOrItems?: string | CartItem[]) => {
        if (typeof purchaseIdOrItems === 'string') {
            sessionStorage.setItem('lastPurchaseId', purchaseIdOrItems);
            setConsultationPurchaseId(purchaseIdOrItems);

            // Fetch purchase details to track the event
            if (window.fbq) {
                try {
                    const purchaseDoc = await db.collection('consultation_purchases').doc(purchaseIdOrItems).get();
                    if (purchaseDoc.exists) {
                        const purchaseData = purchaseDoc.data() as ConsultationPurchase;
                        const value = purchaseData.packagePrice / 100; // convert from paise
                        
                        window.fbq('track', 'Purchase', {
                            value: value.toFixed(2),
                            currency: 'INR',
                            content_ids: [purchaseData.packageId],
                            content_name: purchaseData.packageName,
                            content_type: 'product',
                            num_items: 1
                        });
                    }
                } catch (error) {
                    console.error("Failed to track consultation purchase:", error);
                }
            }
        } else {
            const items = Array.isArray(purchaseIdOrItems) ? purchaseIdOrItems : null;
            setLastPurchaseDetails(items);
            setShowPaymentSuccess(true);
    
            if (window.fbq && items && items.length > 0) {
                const totalValue = items.reduce((sum, item) => sum + item.price, 0) / 100; // Convert from paise
                const content_ids = items.map(item => item.tierId || item.appId);
                const contents = items.map(item => ({ id: item.tierId || item.appId, quantity: 1 }));
                
                window.fbq('track', 'Purchase', {
                    value: totalValue.toFixed(2),
                    currency: 'INR',
                    content_ids: content_ids,
                    content_type: 'product',
                    contents: contents,
                    num_items: items.length
                });
            }
        }
    };
    
    useEffect(() => {
        if (consultationPurchaseId) {
            window.history.pushState({}, '', `/booking/${consultationPurchaseId}`);
            setView(`/booking/${consultationPurchaseId}`);
        }
    }, [consultationPurchaseId, setView]);

    // Effect to handle browser navigation (back/forward buttons)
    useEffect(() => {
        const handlePopState = () => {
            setView(window.location.pathname);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [setView]);

    // Effect to handle internal link clicks to prevent full page reloads
    useEffect(() => {
        const handleLinkClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const anchor = target.closest('a');

            if (anchor && anchor.target !== '_blank' && anchor.origin === window.location.origin) {
                const href = anchor.getAttribute('href');
                
                // If it's an anchor link on the same page, let the browser handle it for smooth scrolling.
                if (href && href.startsWith('#')) {
                    return; 
                }

                const path = anchor.pathname;
                // Make sure it's a path we want to handle client-side
                if (path.startsWith('/')) {
                    event.preventDefault();
                    if (window.location.pathname !== path || window.location.search !== anchor.search) {
                        window.history.pushState({}, '', path + anchor.search);
                        setView(path);
                    }
                }
            }
        };
        document.addEventListener('click', handleLinkClick);
        return () => document.removeEventListener('click', handleLinkClick);
    }, [setView]);

    const showNotification = useCallback((message: string, type: NotificationType, duration = 2000) => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification(prev => ({ ...prev, show: false })), duration);
    }, []);

    useEffect(() => {
        const fetchSeoData = async () => {
            try {
                const seoDocRef = db.collection("site_content").doc("seo");
                const docSnap = await seoDocRef.get();
                if (docSnap.exists) {
                    const seoData = docSnap.data();
                    if (seoData) {
                        const pageUrl = window.location.href;
                        const defaultImageUrl = seoData.featuredImageUrl || 'https://powerfultools.in/default-og-image.png';
    
                        let title = seoData.title || 'Powerful Tools';
                        let description = seoData.description || 'Powerful & affordable Vastu, Numerology, and layout tools designed by experts. Get your instant analysis & more, with more apps coming soon.';
                        
                        // Check for static page specific SEO
                        const staticPageSeo = seoData.staticPages?.[viewState.view];
                        if (staticPageSeo) {
                            title = staticPageSeo.title || title;
                            description = staticPageSeo.description || description;
                        }
    
                        // Update tags
                        const titleTag = document.querySelector('title');
                        if(titleTag) titleTag.innerText = title;
                        
                        const descriptionTag = document.getElementById('meta-description') as HTMLMetaElement | null;
                        if(descriptionTag) descriptionTag.content = description;
                        
                        const keywordsTag = document.getElementById('meta-keywords') as HTMLMetaElement | null;
                        if(keywordsTag) keywordsTag.content = seoData.keywords || '';
                        
                        const ogTitleTag = document.getElementById('og-title') as HTMLMetaElement | null;
                        if(ogTitleTag) ogTitleTag.content = title;
                        const ogDescriptionTag = document.getElementById('og-description') as HTMLMetaElement | null;
                        if(ogDescriptionTag) ogDescriptionTag.content = description;
                        const ogImageTag = document.getElementById('og-image') as HTMLMetaElement | null;
                        if(ogImageTag) ogImageTag.content = defaultImageUrl;
                        const ogUrlTag = document.getElementById('og-url') as HTMLMetaElement | null;
                        if(ogUrlTag) ogUrlTag.content = pageUrl;
    
                        const twitterTitleTag = document.getElementById('twitter-title') as HTMLMetaElement | null;
                        if(twitterTitleTag) twitterTitleTag.content = title;
                        const twitterDescriptionTag = document.getElementById('twitter-description') as HTMLMetaElement | null;
                        if(twitterDescriptionTag) twitterDescriptionTag.content = description;
                        const twitterImageTag = document.getElementById('twitter-image') as HTMLMetaElement | null;
                        if(twitterImageTag) twitterImageTag.content = defaultImageUrl;
                        const twitterUrlTag = document.getElementById('twitter-url') as HTMLMetaElement | null;
                        if(twitterUrlTag) twitterUrlTag.content = pageUrl;
                        
                        const canonicalUrlTag = document.getElementById('canonical-url') as HTMLLinkElement | null;
                        if(canonicalUrlTag) canonicalUrlTag.href = pageUrl;
                    }
                }
            } catch (error: any) {
                if (error.code === 'unavailable') {
                    console.warn("Could not fetch SEO data while offline:", error.message);
                    showNotification("You are offline. Some content may not be up to date.", "info", 4000);
                } else {
                    console.error("Failed to fetch SEO data:", error);
                }
            }
        };
        
        const seoManagedByChild = ['home', 'blog-post', 'landing-page', 'consultant-page', 'offer-page'].includes(viewState.view);
    
        if (!seoManagedByChild) {
            fetchSeoData();
        } else {
            // Child component is responsible for its own SEO, but we ensure a default is set.
            const titleTag = document.querySelector('title');
            if(titleTag && titleTag.innerText === '__OG_TITLE__') {
                titleTag.innerText = 'Powerful Tools';
            }
        }
    }, [showNotification, viewState.view]);
    
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            document.body.classList.remove('is-offline');
        };
        const handleOffline = () => {
            setIsOnline(false);
            document.body.classList.add('is-offline');
        };
    
        if (!navigator.onLine) {
            handleOffline();
        }
    
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.body.classList.remove('is-offline');
        };
    }, []);

    const handleLogout = useCallback(async () => {
        await auth.signOut();
        window.location.href = '/'; // Go to home/login page
    }, []);

    // Effect for page view tracking
    useEffect(() => {
        const trackView = async (state: ViewState) => {
            if (!state || !state.view) return;
    
            // Don't track while auth state is loading
            if (userProfile === 'loading') return;
            // Don't track home/login for logged-in users since they are redirected to dashboard
            if (userProfile && (state.view === 'home' || state.view === 'login')) return;
    
            let pageId = state.view;
            if (state.slug) {
                pageId = `${state.view}/${state.slug}`;
            } else if (state.id) {
                pageId = `${state.view}/${state.id}`;
            }
            
            // Firestore document IDs must not contain slashes. We replace them with underscores.
            const docId = pageId.replace(/\//g, '_');
    
            const docRef = db.collection('page_views').doc(docId);
            try {
                // Use a transactionless increment for performance and offline capability
                await docRef.set({
                    count: FieldValue.increment(1),
                    pageId: pageId, // Store the original path for display purposes
                    lastViewed: FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (error) {
                // This is a non-critical operation, so we just log the warning.
                // It can fail if offline, which is an acceptable limitation.
                console.warn("Page view tracking failed:", error);
            }
        };
    
        trackView(viewState);
    
    }, [viewState, userProfile]);


    useEffect(() => {
        let firestoreUnsubscribe: () => void;

        const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
            if (firestoreUnsubscribe) {
                firestoreUnsubscribe();
            }
            
            if (user) {
                try {
                    const userDocRef = db.collection("users").doc(user.uid);

                    firestoreUnsubscribe = userDocRef.onSnapshot(async (userDocSnap) => {
                        if (userDocSnap.exists) {
                            const firestoreData = userDocSnap.data();
                            const profile: UserProfile = { 
                                email: user.email,
                                ...firestoreData,
                                id: userDocSnap.id,
                            } as UserProfile;
                            setUserProfile(profile);

                        } else {
                            if (user.email === 'vips1680@gmail.com') {
                                const adminProfileData = {
                                    email: user.email,
                                    name: "Acharya Preeti Sharma",
                                    role: "admin" as const,
                                    validity: '9999-12-31',
                                    apps: {},
                                    createdAt: FieldValue.serverTimestamp()
                                };
                                await userDocRef.set(adminProfileData);
                            } else {
                                showNotification("User profile not found. Contact admin.", "error");
                                await handleLogout();
                            }
                        }
                    }, (err) => {
                        console.error("Error with Firestore listener:", err);
                        showNotification(`Connection to profile lost: ${err.message}`, "error");
                        handleLogout();
                    });

                } catch (err: any) {
                    console.error("Error setting up user profile listener:", err);
                    showNotification(`Failed to listen for profile updates: ${err.message || 'Unknown error'}`, "error");
                    await handleLogout();
                }
            } else {
                setUserProfile(null);
            }
        });

        return () => {
            authUnsubscribe();
            if (firestoreUnsubscribe) {
                firestoreUnsubscribe();
            }
        };
    }, [handleLogout, showNotification]);

    const handleLogin = async (email: string, password: string) => {
        setUserProfile('loading');

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (user) {
                const userDoc = await db.collection("users").doc(user.uid).get();
                if (userDoc.exists) {
                    const profileData = userDoc.data();
                    const today = new Date().toISOString().split('T')[0];
                    if (profileData && (profileData.validity || '1970-01-01') < today) {
                        showNotification("Your account has expired. Please contact an administrator.", 'error', 5000);
                        await auth.signOut();
                        return;
                    }
                }
                // On successful login, redirect to the dashboard view
                window.history.pushState({}, '', '/dashboard');
                setView('/dashboard');
            }
        } catch (err: any) {
            const errorMessage = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : 'Invalid credentials';
            showNotification(`Login failed: ${errorMessage}`, 'error');
            setUserProfile(null);
        }
    };

    const handlePasswordReset = async (email: string) => {
        if (!email) {
            showNotification("Please enter an email address to reset the password.", "error");
            return;
        }
        try {
            await auth.sendPasswordResetEmail(email);
            showNotification("If an account exists, a password reset link has been sent to your email.", "info", 6000);
        } catch (err: any) {
             console.error("Password reset error:", err);
            const errorMessage = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : 'An error occurred.';
            showNotification(`Password reset failed: ${errorMessage}`, 'error');
        }
    };

    const renderAppContent = () => {
        if (userProfile === 'loading') {
            return <InitialLoadingScreen />;
        }

        // Handle pages accessible to both logged-in and guests first
        if (viewState.view === 'landing-page') {
            return <LandingPage slug={viewState.slug!} showNotification={showNotification} onPurchaseSuccess={handlePurchaseSuccess} userProfile={userProfile} />;
        }
        if (viewState.view === 'offer-page') {
            return <OfferPage slug={viewState.slug!} showNotification={showNotification} onPurchaseSuccess={handlePurchaseSuccess} userProfile={userProfile} />;
        }
        if (viewState.view === 'consultant-page') {
            return <ConsultantPage slug={viewState.slug!} showNotification={showNotification} onPurchaseSuccess={handlePurchaseSuccess} userProfile={userProfile} />;
        }
        if (viewState.view === 'booking-page') {
            return <BookingPage purchaseId={viewState.id!} userProfile={userProfile} showNotification={showNotification} />;
        }


        if (userProfile) {
            const today = new Date().toISOString().split('T')[0];
            // If validity field doesn't exist, default to 25 years in the future.
            const userValidity = userProfile.validity || (() => {
                const d = new Date();
                d.setFullYear(d.getFullYear() + 25);
                return d.toISOString().split('T')[0];
            })();
            const isAccountExpired = userValidity < today;
            const isExpiringToday = !isAccountExpired && userValidity === today;

            if (isAccountExpired) {
                return <AccountExpiredScreen user={userProfile} onLogout={handleLogout} />;
            }
            if (userProfile.mustChangePassword) {
                return <ForcePasswordChange user={userProfile} showNotification={showNotification} />;
            }
            
             // Handle views for logged-in users
            switch(viewState.view) {
                case 'about':
                    return <InfoPage pageKey="about" title="About Us" />;
                case 'contact':
                    return <InfoPage pageKey="contact" title="Contact Us" />;
                case 'pricing':
                    return <PricingPage userProfile={userProfile} showNotification={showNotification} onPurchaseSuccess={handlePurchaseSuccess} />;
                case 'privacy':
                    return <InfoPage pageKey="privacy" title="Privacy Policy" />;
                case 'terms':
                    return <InfoPage pageKey="terms" title="Terms & Conditions" />;
                case 'refund':
                    return <InfoPage pageKey="refund" title="Cancellation & Refund Policy" />;
                case 'shipping':
                    return <InfoPage pageKey="shipping" title="Shipping & Delivery Policy" />;
                case 'blog':
                    return <BlogListPage />;
                case 'blog-post':
                    return <BlogPostPage slug={viewState.slug!} />;
                case 'dashboard':
                case 'login': // if logged in and at login path, go to dashboard
                case 'home': // if logged in and at home path, go to dashboard
                default: 
                    if (userProfile.role === 'admin') {
                        // FIX: The original call had 7 arguments passed to a function/component expecting 4.
                        // Correcting the call to pass only the required props to AdminDashboard.
                        return <AdminDashboard currentUser={userProfile} onLogout={handleLogout} showNotification={showNotification} isExpiringToday={isExpiringToday} />;
                    }
                    // The `setShowPaymentSuccess` prop expects a function with no arguments.
                    // The `handlePurchaseSuccess` function can be called without arguments for a generic success animation,
                    // so wrapping it in an arrow function satisfies the prop type.
                    return <UserDashboard user={userProfile} onLogout={handleLogout} showNotification={showNotification} isExpiringToday={isExpiringToday} setShowPaymentSuccess={() => handlePurchaseSuccess()} />;
            }
        }

        // User is logged out, show public pages or login screen
        switch (viewState.view) {
            case 'about':
                return <InfoPage pageKey="about" title="About Us" />;
            case 'contact':
                return <InfoPage pageKey="contact" title="Contact Us" />;
            case 'pricing':
                return <PricingPage userProfile={userProfile} showNotification={showNotification} onPurchaseSuccess={handlePurchaseSuccess} />;
            case 'privacy':
                return <InfoPage pageKey="privacy" title="Privacy Policy" />;
            case 'terms':
                return <InfoPage pageKey="terms" title="Terms & Conditions" />;
            case 'refund':
                return <InfoPage pageKey="refund" title="Cancellation & Refund Policy" />;
            case 'shipping':
                return <InfoPage pageKey="shipping" title="Shipping & Delivery Policy" />;
            case 'blog':
                return <BlogListPage />;
            case 'blog-post':
                return <BlogPostPage slug={viewState.slug!} />;
            case 'login':
                return (
                    <div className="flex flex-col min-h-dvh">
                        <LoginScreen onLogin={handleLogin} onForgotPassword={handlePasswordReset} />
                        <Footer />
                    </div>
                );
            case 'home':
            default: // '/', or any other unknown path
                return <HomePage />;
        }
    };

    return (
        <div className="font-sans bg-gray-50 min-h-dvh">
             {!isOnline && <OfflineBanner />}
             {notification.show && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />}
             {showPaymentSuccess && <PaymentSuccessAnimation onClose={() => { setShowPaymentSuccess(false); setLastPurchaseDetails(null); }} items={lastPurchaseDetails} />}
             {renderAppContent()}
        </div>
    );
};

export default App;