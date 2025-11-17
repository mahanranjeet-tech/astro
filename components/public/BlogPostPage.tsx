
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase.ts';
import { Calendar, User as UserIcon, Rss } from 'lucide-react';
import type { BlogPost } from '../../types.ts';
import PublicPageLayout from './PublicPageLayout.tsx';
import InitialLoadingScreen from '../shared/InitialLoadingScreen.tsx';
import { formatTimestamp } from '../../utils/date.ts';

interface BlogPostPageProps {
    slug: string;
}

// SVG Icon components for social sharing
const TwitterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
);

const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>
);

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.38 0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42 1.56 1.56 2.41 3.63 2.41 5.83.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.13c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-1.25-.68-1.42-1.84-1.59-2.16-.16-.32-.04-.5.08-.62.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.77-.2-.48-.4-.41-.54-.42-.14 0-.3 0-.46 0-.16 0-.42.06-.64.3-.22.24-.86.85-.86 2.07 0 1.22.88 2.4 1 2.56.12.16 1.72 2.64 4.18 3.72 2.34 1.02 2.46.68 2.9.62.44-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.05-.12-.2-.18-.44-.3z"></path></svg>
);


const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug }) => {
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            setError(null);
            try {
                const postQuery = db.collection('blogs').where('slug', '==', slug).limit(1);
                const snapshot = await postQuery.get();

                if (snapshot.empty) {
                    setError('Blog post not found.');
                } else {
                    const fetchedPost = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as BlogPost;
                    if (fetchedPost.status === 'published') {
                        setPost(fetchedPost);
                    } else {
                        setError('Blog post not found.');
                    }
                }
            } catch (err: any) {
                if (err.code === 'unavailable') {
                    console.warn("Could not fetch blog post while offline:", err.message);
                    setError('This post is not available offline. Please connect to the internet to view it.');
                } else {
                    console.error("Error fetching blog post:", err);
                    setError('Failed to load the blog post.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPost();

    }, [slug]);

    useEffect(() => {
        // This effect ensures meta tags are updated for client-side navigation
        // The new server.js handles the initial load for bots
        if (post) {
            const title = post.metaTitle || post.title;
            const description = post.metaDescription || post.excerpt;
            const imageUrl = post.featuredImageUrl || '';
            const postUrl = window.location.href;

            document.title = title;
            const metaDescription = document.getElementById('meta-description') as HTMLMetaElement | null;
            if (metaDescription) metaDescription.content = description;
            
            // Open Graph
            const ogTitle = document.getElementById('og-title') as HTMLMetaElement | null;
            if (ogTitle) ogTitle.content = title;
            const ogDescription = document.getElementById('og-description') as HTMLMetaElement | null;
            if (ogDescription) ogDescription.content = description;
            const ogImage = document.getElementById('og-image') as HTMLMetaElement | null;
            if (ogImage) ogImage.content = imageUrl;
            const ogUrl = document.getElementById('og-url') as HTMLMetaElement | null;
            if (ogUrl) ogUrl.content = postUrl;

            // Twitter Card
            const twitterTitle = document.getElementById('twitter-title') as HTMLMetaElement | null;
            if (twitterTitle) twitterTitle.content = title;
            const twitterDescription = document.getElementById('twitter-description') as HTMLMetaElement | null;
            if (twitterDescription) twitterDescription.content = description;
            const twitterImage = document.getElementById('twitter-image') as HTMLMetaElement | null;
            if (twitterImage) twitterImage.content = imageUrl;
            const twitterUrl = document.getElementById('twitter-url') as HTMLMetaElement | null;
            if (twitterUrl) twitterUrl.content = postUrl;
        }
    }, [post]);


    if (loading) {
        return <InitialLoadingScreen />;
    }

    if (error || !post) {
        return (
            <PublicPageLayout title="Error" icon={<Rss size={28} />}>
                <div className="text-center py-16 text-red-500">
                    <h3 className="text-xl font-semibold">{error || 'Could not find the requested post.'}</h3>
                    <a href="/blog" className="mt-4 inline-block text-blue-600 hover:underline">Return to Blog</a>
                </div>
            </PublicPageLayout>
        );
    }

    const postUrl = window.location.href;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedTitle = encodeURIComponent(post.title);

    return (
        <PublicPageLayout title={post.title} icon={<Rss size={28} />}>
            <article className="max-w-4xl mx-auto">
                <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 border-y py-4">
                    <span className="flex items-center gap-2"><UserIcon size={16} /> By {post.authorName}</span>
                    <span className="flex items-center gap-2"><Calendar size={16} /> Published on {formatTimestamp(post.createdAt)}</span>
                </div>
                
                <div
                    className="prose prose-lg max-w-none prose-img:rounded-lg"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {post.tags && post.tags.length > 0 && (
                     <div className="mt-12 pt-6 border-t">
                        <h4 className="font-semibold text-gray-700 mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map(tag => (
                                <span key={tag} className="bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-12 pt-8 border-t">
                    <h4 className="font-semibold text-gray-700 mb-4 text-center text-lg">Share This Post</h4>
                    <div className="flex justify-center items-center gap-4 flex-wrap">
                        <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition-colors">
                            <TwitterIcon />
                            <span>Share on X</span>
                        </a>
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-[#1877F2] text-white font-semibold hover:bg-[#166fe5] transition-colors">
                            <FacebookIcon />
                            <span>Share on Facebook</span>
                        </a>
                        <a href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-[#25D366] text-white font-semibold hover:bg-[#1ebe57] transition-colors">
                            <WhatsAppIcon />
                            <span>Share on WhatsApp</span>
                        </a>
                    </div>
                </div>
            </article>
        </PublicPageLayout>
    );
};

export default BlogPostPage;
