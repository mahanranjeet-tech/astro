import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase.ts';
import { Rss, Calendar, User as UserIcon, ArrowRight } from 'lucide-react';
import type { BlogPost } from '../../types.ts';
import PublicPageLayout from './PublicPageLayout.tsx';
import LoadingIndicator from '../shared/LoadingIndicator.tsx';
import { formatTimestamp } from '../../utils/date.ts';

const BlogListPage: React.FC = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            try {
                // Query by creation date to get the latest posts first.
                // Filtering is now done on the client-side to avoid composite index requirement.
                const postsQuery = db.collection('blogs')
                    .orderBy('createdAt', 'desc');
                const snapshot = await postsQuery.get();
                const fetchedPosts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BlogPost));
                
                // Filter for published posts on the client
                const publishedPosts = fetchedPosts.filter(post => post.status === 'published');

                setPosts(publishedPosts);
            } catch (error: any) {
                if (error.code === 'unavailable') {
                    console.warn("Could not fetch blog posts while offline:", error.message);
                } else {
                    console.error("Error fetching blog posts:", error);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    if (loading) {
        return <LoadingIndicator text="Loading Blog Posts..." />;
    }

    return (
        <PublicPageLayout title="Our Blog" icon={<Rss size={28} />}>
            <p className="text-center -mt-4 mb-12 text-lg text-slate-600 max-w-3xl mx-auto">
                Stay updated with the latest news, tutorials, and insights about our applications.
            </p>

            {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map(post => (
                        <a key={post.id} href={`/blog/${post.slug}`} className="group block bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
                            {post.featuredImageUrl && (
                                <div className="aspect-video overflow-hidden bg-gray-100">
                                    <img src={post.featuredImageUrl} alt={post.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-in-out" />
                                </div>
                            )}
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{post.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-gray-500 my-3">
                                    <span className="flex items-center gap-1.5"><UserIcon size={14} /> {post.authorName}</span>
                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatTimestamp(post.createdAt)}</span>
                                </div>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                                <div className="font-semibold text-blue-600 flex items-center gap-1">
                                    Read More <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <Rss size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold">No Posts Yet</h3>
                    <p>There are no blog posts available at the moment. Please check back later!</p>
                </div>
            )}
        </PublicPageLayout>
    );
};

export default BlogListPage;