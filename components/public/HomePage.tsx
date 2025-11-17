
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../services/firebase.ts';
import type { HomePageDefinition, HomePageSection, UserProfile, AppDefinition, BlogPost, Review, VideoTestimonial } from '../../types.ts';
import { LogIn, ArrowRight, Rss, Star, PlayCircle, Users, CheckCircle, Smartphone, UserPlus, Infinity, Eye, Briefcase, PercentSquare, Crosshair, Compass, Ruler, User as UserIcon, ArrowLeft } from 'lucide-react';
import Footer from './Footer.tsx';
import InitialLoadingScreen from '../shared/InitialLoadingScreen.tsx';
import LoginPromptModal from './LoginPromptModal.tsx';
import AppIcon from '../shared/AppIcon.tsx';
import { formatTimestamp } from '../../utils/date.ts';
import VideoPlayerModal from './VideoPlayerModal.tsx';
import { getYoutubeVideoId } from '../../utils/url.ts';
import StarRating from '../shared/StarRating.tsx';

const VastuChakraSvg = () => (
    <svg className="w-full max-w-sm h-auto" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="50" width="400" height="400" rx="10" className="assistant-svg-outline" strokeWidth="3"/>
        <path d="M100 100H400V400H100V100Z" fill="#2d295b"/>
        <path d="M100 100L400 400M400 100L100 400" stroke="#4f478a" strokeWidth="1"/>
        <rect x="150" y="150" width="100" height="100" fill="#4f478a"/>
        <rect x="250" y="250" width="100" height="100" fill="#4f478a"/>
        <circle cx="250" cy="250" r="180" className="assistant-svg-outline" strokeWidth="2" opacity="0.6"/>
        <circle cx="250" cy="250" r="150" className="assistant-svg-inner" opacity="0.4"/>
        <text x="240" y="50" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">N</text>
        <text x="440" y="250" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">E</text>
        <text x="240" y="460" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">S</text>
        <text x="40" y="250" fontFamily="Inter, sans-serif" fontSize="20" fill="#f8fafc">W</text>
        <circle cx="250" cy="250" r="5" className="assistant-svg-fill"/>
        <line x1="250" y1="250" x2="250" y2="70" className="assistant-svg-outline" strokeWidth="2"/>
        <line x1="250" y1="250" x2="430" y2="250" className="assistant-svg-outline" strokeWidth="2"/>
        <line x1="250" y1="250" x2="250" y2="430" className="assistant-svg-outline" strokeWidth="2"/>
        <line x1="250" y1="250" x2="70" y2="250" className="assistant-svg-outline" strokeWidth="2"/>
    </svg>
);

const ImageCarousel: React.FC<{ urls: string[]; title: string; speed?: number; }> = ({ urls, title, speed = 1000 }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isInView && urls && urls.length > 1) {
            const interval = setInterval(() => {
                setCurrentIndex(prevIndex => (prevIndex + 1) % urls.length);
            }, speed);
            return () => clearInterval(interval);
        }
    }, [isInView, urls, speed]);

    if (!urls || urls.length === 0) {
        return <div className="w-full h-64 bg-gray-200 rounded-xl flex items-center justify-center">No Image</div>;
    }

    const currentUrl = urls[currentIndex];

    return (
        <div ref={ref} className="w-full flex justify-center">
            {currentUrl === 'svg' ? <VastuChakraSvg /> : <img src={currentUrl} alt={title} className="rounded-xl shadow-lg border-4 border-yellow-300 w-full object-contain"/>}
        </div>
    );
};

const IconWrapper: React.FC<{ icon: string; className?: string }> = ({ icon, className = "w-5 h-5 text-accent flex-shrink-0 mt-1 mr-2" }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        "crosshair": <Crosshair className={className} />,
        "compass": <Compass className={className} />,
        "ruler": <Ruler className={className} />,
        "user-plus": <UserPlus className={className} />,
        "infinity": <Infinity className={className} />,
        "eye": <Eye className={className} />,
        "smartphone": <Smartphone className={className} />,
        "briefcase": <Briefcase className={className} />,
        "percent-square": <PercentSquare className={className} />,
        "star": <Star className={className} />,
        "hand-heart": <svg data-lucide="hand-heart" className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"></path><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.7-2.9l-4.4 4.3c-.4.4-1 .4-1.4 0l-3-3a2 2 0 0 0-2.8 0l-2.8 2.8a2 2 0 0 0 0 2.8l3.6 3.6c.4.4 1 .4 1.4 0L11 14z"></path></svg>,
        "gem": <svg data-lucide="gem" className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 13L2 9Z"></path><path d="M12 22 6 9l12 0-6 13Z"></path><path d="M2 9h20"></path></svg>,
        "check-circle": <CheckCircle className={className}/>
    };
    return <>{iconMap[icon] || null}</>;
};

const AnimatedMetric: React.FC<{ value: string; label: string }> = ({ value: valueStr, label }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const parseValue = (str: string) => {
        const num = parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
        const suffix = str.replace(/[0-9,]/g, '') || '';
        return { num, suffix };
    };

    const { num: target, suffix } = parseValue(valueStr);

    useEffect(() => {
        if (!target) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    let startTimestamp: number | null = null;
                    const duration = 2000;
                    const step = (timestamp: number) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        setCount(Math.floor(progress * target));
                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    window.requestAnimationFrame(step);
                    observer.disconnect(); // Animate only once
                }
            },
            { threshold: 0.7 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [target]);

    return (
        <div ref={ref} className="text-center p-6 bg-indigo-700/50 rounded-xl border border-yellow-300">
            <p className="text-5xl font-extrabold text-accent">{count.toLocaleString()}{suffix}</p>
            <p className="text-lg mt-2 font-medium text-gray-200">{label}</p>
        </div>
    );
};


const HomePage = () => {
    const [pageDef, setPageDef] = useState<HomePageDefinition | null>(null);
    const [apps, setApps] = useState<AppDefinition[]>([]);
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [videoTestimonials, setVideoTestimonials] = useState<VideoTestimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

    const blogCarouselRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const pageDefPromise = db.collection('site_content').doc('homepage').get();
                const appsPromise = db.collection('apps').get();
                const postsPromise = db.collection('blogs').where('status', '==', 'published').get();
                const reviewsPromise = db.collection('reviews').get();
                const videoTestimonialsPromise = db.collection('site_content').doc('live').get();

                const [pageDefSnap, appsSnap, postsSnap, reviewsSnap, videoTestimonialsSnap] = await Promise.all([
                    pageDefPromise, appsPromise, postsPromise, reviewsPromise, videoTestimonialsPromise
                ]);
                
                if (pageDefSnap.exists) {
                    const data = pageDefSnap.data() as HomePageDefinition;
                    setPageDef(data);
                    
                    const title = data.metaTitle || 'Powerful Tools';
                    const description = data.metaDescription || 'Powerful & affordable Vastu, Numerology, and layout tools designed by experts. Get your instant analysis & more, with more apps coming soon.';
                    let imageUrl = data.featuredImageUrl || 'https://powerfultools.in/default-og-image.png';
                    if (imageUrl.startsWith('/')) {
                        imageUrl = window.location.origin + imageUrl;
                    }
                    const pageUrl = window.location.origin + '/';

                    // Update all relevant meta tags
                    document.title = title;
                    
                    const metaDescriptionEl = document.getElementById('meta-description') as HTMLMetaElement;
                    if (metaDescriptionEl) metaDescriptionEl.content = description;

                    // Open Graph
                    const ogTitleEl = document.getElementById('og-title') as HTMLMetaElement;
                    if (ogTitleEl) ogTitleEl.content = title;
                    const ogDescriptionEl = document.getElementById('og-description') as HTMLMetaElement;
                    if (ogDescriptionEl) ogDescriptionEl.content = description;
                    const ogImageEl = document.getElementById('og-image') as HTMLMetaElement;
                    if (ogImageEl) ogImageEl.content = imageUrl;
                    const ogUrlEl = document.getElementById('og-url') as HTMLMetaElement;
                    if (ogUrlEl) ogUrlEl.content = pageUrl;

                    // Twitter Card
                    const twitterTitleEl = document.getElementById('twitter-title') as HTMLMetaElement;
                    if (twitterTitleEl) twitterTitleEl.content = title;
                    const twitterDescriptionEl = document.getElementById('twitter-description') as HTMLMetaElement;
                    if (twitterDescriptionEl) twitterDescriptionEl.content = description;
                    const twitterImageEl = document.getElementById('twitter-image') as HTMLMetaElement;
                    if (twitterImageEl) twitterImageEl.content = imageUrl;
                    const twitterUrlEl = document.getElementById('twitter-url') as HTMLMetaElement;
                    if (twitterUrlEl) twitterUrlEl.content = pageUrl;
                    
                    // Canonical URL
                    const canonicalUrlEl = document.getElementById('canonical-url') as HTMLLinkElement;
                    if(canonicalUrlEl) canonicalUrlEl.href = pageUrl;
                }

                setApps(appsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppDefinition)));
                setPosts(postsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BlogPost)));
                setReviews(reviewsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review)));
                if(videoTestimonialsSnap.exists) {
                    setVideoTestimonials(videoTestimonialsSnap.data()?.videoTestimonials || []);
                }

            } catch (error) {
                console.error("Error fetching homepage data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const renderSection = (section: HomePageSection) => {
        if (!section.enabled) return null;

        switch (section.type) {
            case 'hero':
                return (
                    <section className="text-center bg-white rounded-b-xl shadow-lg mb-8 py-12 md:py-16 px-4">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary leading-tight mb-4" dangerouslySetInnerHTML={{ __html: section.title }}></h1>
                        <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">{section.subtitle}</p>
                        <div className="flex justify-center space-x-4 mt-8">
                            <a href={section.ctaLink} className="cta-button text-lg font-bold bg-accent text-white py-3 px-8 rounded-lg hover:bg-orange-600">
                                {section.ctaText}
                            </a>
                        </div>
                    </section>
                );
            case 'expert':
                return (
                    <section className="py-8">
                        <h2 className="section-heading text-4xl mb-12" dangerouslySetInnerHTML={{ __html: section.title }}></h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="flex flex-col items-center">
                                <div className="relative w-64 h-64 lg:w-72 lg:h-72">
                                    <div className="absolute inset-0 bg-yellow-300 rounded-full transform translate-x-3 translate-y-3"></div>
                                    <div className="relative w-full h-full rounded-full bg-gray-200 overflow-hidden shadow-lg border-4 border-white">
                                        {section.imageUrl ? (
                                            <img src={section.imageUrl} alt={section.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-yellow-200 text-primary text-6xl font-bold">
                                                {section.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-yellow-100 p-6 rounded-2xl shadow-lg w-full max-w-sm text-center -mt-16 pt-20">
                                    <h3 className="text-2xl font-bold text-primary">{section.name}</h3>
                                    <p className="text-md font-semibold text-gray-700 mt-1">{section.role}</p>
                                    <p className="text-sm text-gray-600 mt-1">{section.qualifications}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-primary mb-6">{section.subheading}</h3>
                                <ul className="space-y-4">
                                    {(section.achievements || []).map(ach => (
                                        <li key={ach.id} className="flex items-start">
                                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1 mr-3" />
                                            <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: ach.text }} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                );
            case 'app_showcase_title':
                 return <h2 className="section-heading text-4xl" dangerouslySetInnerHTML={{ __html: section.title }}></h2>;
            case 'app_item':
                const app = apps.find(a => a.id === section.appId);
                const title = section.customTitle || app?.name;
                const description = section.customDescription || app?.description;
                const features = section.customFeatures;
                const ctaText = section.customCtaText || `Learn more about ${app?.name}`;
                const imageUrls = section.imageOverrideUrls;
                const layoutClass = section.layout === 'image_right' ? 'md:flex-row-reverse' : 'md:flex-row';

                return (
                    <div>
                        <div className={`flex flex-col ${layoutClass} items-center gap-10 bg-white p-8 rounded-xl shadow-2xl app-card border-t-8 ${section.layout === 'image_right' ? 'border-accent' : 'border-primary'}`}>
                            <div className="md:w-3/5 w-full">
                                <h3 className="text-3xl font-extrabold text-primary mb-4">{title}</h3>
                                <p className="text-lg text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: description || '' }}></p>
                                
                                <div className="md:hidden my-6">
                                     <ImageCarousel urls={imageUrls || []} title={title || ''} speed={section.imageCarouselSpeed} />
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    {(features || []).map(f => (
                                        <div key={f.id} className="flex items-start">
                                            <IconWrapper icon={f.icon} className="w-6 h-6 text-accent flex-shrink-0 mt-1 mr-3"/>
                                            <div>
                                                <h4 className="font-bold text-primary">{f.title}</h4>
                                                <p className="text-gray-600 text-sm">{f.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-center">
                                    <button onClick={() => setShowLoginPrompt(true)} className={`cta-button text-lg font-bold text-white py-3 px-8 rounded-xl ${section.layout === 'image_right' ? 'bg-accent hover:bg-orange-600' : 'bg-primary hover:bg-indigo-700'}`}>
                                        {ctaText}
                                    </button>
                                </div>
                            </div>
                            <div className="hidden md:flex md:w-2/5 justify-center">
                                <ImageCarousel urls={imageUrls || []} title={title || ''} speed={section.imageCarouselSpeed} />
                            </div>
                        </div>
                    </div>
                );
            case 'stats':
                 return (
                    <section className="py-12 md:py-16 bg-primary rounded-xl shadow-2xl my-8 text-white">
                        <h2 className="text-3xl font-bold text-center mb-10" dangerouslySetInnerHTML={{ __html: section.title }}></h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto px-4">
                            {(section.metrics || []).map(metric => (
                                <AnimatedMetric key={metric.id} value={metric.value} label={metric.label} />
                            ))}
                        </div>
                    </section>
                 );
            case 'upcoming_apps':
                return (
                    <section className="py-8 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-8" dangerouslySetInnerHTML={{ __html: section.title }}></h2>
                        <p className="text-center text-lg text-gray-600 max-w-2xl mx-auto mb-10">{section.subtitle}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {(section.apps || []).map(app => (
                                <div key={app.id} className="bg-warm p-6 rounded-xl shadow-lg border-2 border-yellow-300 text-center">
                                    <div className="w-12 h-12 text-accent mx-auto mb-3 flex items-center justify-center"><IconWrapper icon={app.icon} className="w-12 h-12" /></div>
                                    <h3 className="text-xl font-bold text-primary mb-2">{app.title}</h3>
                                    <p className="text-gray-700">{app.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'video_testimonials':
                const testimonialIds = section.testimonialIds || [];
                const selectedTestimonials = videoTestimonials.filter(vt => testimonialIds.includes(vt.id));
                if (selectedTestimonials.length === 0) return null;
                return (
                     <section className="py-8 md:py-12 bg-gray-50 my-8 rounded-xl shadow-inner border border-gray-200">
                        <h2 className="section-heading text-4xl mb-10" dangerouslySetInnerHTML={{ __html: section.title }}></h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             {selectedTestimonials.map(vt => (
                                <div key={vt.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-300 cursor-pointer" onClick={() => setPlayingVideoUrl(vt.url)}>
                                    <img src={vt.url.includes('placeholder') ? vt.url : `https://img.youtube.com/vi/${getYoutubeVideoId(vt.url)}/hqdefault.jpg`} alt={vt.name} className="w-full h-auto"/>
                                    <p className="p-4 text-center font-medium text-primary">"{vt.name}"</p>
                                </div>
                             ))}
                        </div>
                    </section>
                );
            case 'text_reviews':
                const reviewIds = section.reviewIds || [];
                const selectedReviews = reviews.filter(r => reviewIds.includes(r.id));
                 if (selectedReviews.length === 0) return null;
                return (
                     <section className="py-8 border-t border-gray-200">
                        <h2 className="section-heading text-4xl mb-10" dangerouslySetInnerHTML={{ __html: section.title }}></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {selectedReviews.map(r => (
                                <div key={r.id} className="bg-warm p-6 rounded-xl shadow-lg border-2 border-yellow-300 flex flex-col">
                                    <div className="flex items-center mb-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center mr-4 flex-shrink-0">
                                            <UserIcon size={24} className="text-primary"/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-primary">{r.userName}</p>
                                            <StarRating rating={r.rating} setRating={() => {}} size={16} disabled={true} />
                                        </div>
                                    </div>
                                    <p className="text-gray-700 italic flex-grow">"{r.review}"</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'blog':
                const postIds = section.postIds || [];
                 const selectedPosts = posts.filter(p => postIds.includes(p.id));
                 if (selectedPosts.length === 0) return null;
                return (
                    <section className="py-12 md:py-16 bg-primary rounded-xl shadow-2xl my-8 text-white">
                        <h2 className="text-3xl font-bold text-center mb-10 px-4" dangerouslySetInnerHTML={{ __html: section.title }}></h2>
                        <div className="relative">
                             <button onClick={() => blogCarouselRef.current?.scrollBy({ left: -300, behavior: 'smooth' })} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm ml-2 hidden md:block" aria-label="Scroll left">
                                <ArrowLeft size={24} />
                            </button>
                        <div ref={blogCarouselRef} className="blog-carousel-container flex space-x-6 px-4 py-4">
                           {selectedPosts.map(p => (
                                 <a href={`/blog/${p.slug}`} key={p.id} className="flex-shrink-0 w-80 bg-white text-gray-800 rounded-xl shadow-lg border-t-4 border-accent app-card block">
                                     <img src={p.featuredImageUrl} alt={p.title} className="rounded-t-xl w-full h-40 object-cover"/>
                                     <div className="p-4">
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                            <span>by {p.authorName}</span>
                                            <span>&bull;</span>
                                            <span>{formatTimestamp(p.createdAt)}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-primary mb-2 h-14 overflow-hidden" title={p.title}>{p.title}</h3>
                                        <p className="text-sm text-gray-600 mb-3 h-12 overflow-hidden">{p.excerpt}</p>
                                        <span className="text-accent font-semibold text-sm hover:underline">Read Article &rarr;</span>
                                     </div>
                                 </a>
                           ))}
                            <a href="/blog" className="flex-shrink-0 w-80 bg-white text-gray-800 rounded-xl shadow-lg border-t-4 border-accent app-card flex items-center justify-center p-6">
                                <p className="text-center font-bold text-lg text-primary">View All Latest Blogs &rarr;</p>
                            </a>
                        </div>
                        <button onClick={() => blogCarouselRef.current?.scrollBy({ left: 300, behavior: 'smooth' })} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm mr-2 hidden md:block" aria-label="Scroll right">
                                <ArrowRight size={24} />
                            </button>
                        </div>
                    </section>
                );
            default:
                return null;
        }
    };
    
    if (loading) return <InitialLoadingScreen />;
    if (!pageDef) return <div className="min-h-dvh flex items-center justify-center">Homepage content not configured. Please set it up in the admin dashboard.</div>;

    const sectionsByOrder = [...pageDef.sections].sort((a,b) => (a.order || 0) - (b.order || 0));

    // Group app items to be rendered inside the showcase section
    const appShowcaseTitleIndex = sectionsByOrder.findIndex(s => s.type === 'app_showcase_title');
    let appItems: HomePageSection[] = [];
    let mainSections = [...sectionsByOrder];

    if (appShowcaseTitleIndex !== -1) {
        appItems = sectionsByOrder.filter(s => s.type === 'app_item');
        mainSections = sectionsByOrder.filter(s => s.type !== 'app_item');
    }


    return (
        <div className="bg-slate-50 text-slate-800">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 z-20 sticky top-0">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0">
                            <path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"></path>
                            <path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"></path>
                            <path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"></path>
                            <path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"></path>
                        </svg>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Powerful Tools</h1>
                            <p className="text-sm text-gray-500">By Acharya Preeti Sharma</p>
                        </div>
                    </a>
                    <div className="flex items-center gap-4">
                        <a href="/login" className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-lg shadow-md">
                            <LogIn size={16} className="mr-2" />
                            Login / Sign Up
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">
                {mainSections.map(section => {
                    if (section.type === 'app_showcase_title') {
                        return (
                             <section key={section.id} id="applications" className="space-y-8">
                                {renderSection(section)}
                                {appItems.map(item => <React.Fragment key={item.id}>{renderSection(item)}</React.Fragment>)}
                            </section>
                        )
                    }
                    return (
                        <React.Fragment key={section.id}>
                            {renderSection(section)}
                        </React.Fragment>
                    )
                })}
            </main>

            <Footer />

            {showLoginPrompt && <LoginPromptModal onClose={() => setShowLoginPrompt(false)} />}
            {playingVideoUrl && <VideoPlayerModal videoUrl={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />}
        </div>
    );
};

export default HomePage;
