

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Search, Edit, Trash2, Rss } from 'lucide-react';
import { db, FieldValue } from '../../services/firebase.ts';
import type { UserProfile, BlogPost, NotificationType } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';
import BlogModal from '../admin/BlogModal.tsx';
import DeleteBlogConfirmationModal from '../admin/DeleteBlogConfirmationModal.tsx';

interface UserBlogManagerProps {
    user: UserProfile;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const UserBlogManager: React.FC<UserBlogManagerProps> = ({ user, showNotification }) => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const postsQuery = db.collection('blogs')
            .where('authorId', '==', user.id);

        const unsubscribe = postsQuery.onSnapshot(snapshot => {
            const fetchedPosts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BlogPost));
            // Sort client-side
            fetchedPosts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setPosts(fetchedPosts);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching user blog posts:", error);
            showNotification("Could not load your blog posts.", "error");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user.id, showNotification]);

    const filteredPosts = useMemo(() => {
        if (!searchTerm) return posts;
        const lowercasedTerm = searchTerm.toLowerCase();
        return posts.filter(post => post.title.toLowerCase().includes(lowercasedTerm));
    }, [posts, searchTerm]);

    const handleOpenModal = (post: BlogPost | null = null) => {
        setEditingPost(post);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingPost(null);
        setIsModalOpen(false);
    };
    
    const handleDeleteClick = (post: BlogPost) => {
        setPostToDelete(post);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!postToDelete) return;
        try {
            await db.collection("blogs").doc(postToDelete.id).delete();
            showNotification(`Blog post '${postToDelete.title}' deleted.`, 'success');
        } catch(error: any) {
            showNotification(`Error deleting post: ${error.message}`, 'error');
        } finally {
            setIsDeleteConfirmOpen(false);
            setPostToDelete(null);
        }
    };

    const handleSavePost = async (postData: Omit<BlogPost, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>) => {
        const dataToSave = {
            ...postData,
            authorId: user.id,
            authorName: user.name,
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
            handleCloseModal();
        } catch (error: any) {
            showNotification(`Error saving post: ${error.message}`, 'error');
            console.error("Save Post Error: ", error);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col">
            <div className="flex-shrink-0">
                <h3 className="text-2xl font-bold text-gray-800">My Blog Posts</h3>
                <p className="mt-1 text-gray-500">Create and manage your articles for the public blog.</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Create New Post
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex-grow">
                <div className="overflow-x-auto h-full">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><p>Loading your posts...</p></div>
                    ) : (
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3 font-semibold">Title</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">Last Updated</th>
                                    <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredPosts.length > 0 ? filteredPosts.map(post => (
                                    <tr key={post.id} className="bg-white hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{post.title}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {post.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{formatTimestamp(post.updatedAt)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-1">
                                                <button onClick={() => handleOpenModal(post)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full" aria-label="Edit post"><Edit size={18} /></button>
                                                <button onClick={() => handleDeleteClick(post)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full" aria-label="Delete post"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-gray-500">
                                            <Rss size={32} className="mx-auto text-gray-300 mb-2" />
                                            You haven't created any blog posts yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <BlogModal 
                    post={editingPost} 
                    onClose={handleCloseModal} 
                    onSave={handleSavePost}
                    showNotification={showNotification} 
                />
            )}
            
            {isDeleteConfirmOpen && (
                <DeleteBlogConfirmationModal 
                    post={postToDelete}
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
};

export default UserBlogManager;
