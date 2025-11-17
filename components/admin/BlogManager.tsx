
import React, { useState, useMemo } from 'react';
import { PlusCircle, Search, Edit, Trash2, Rss } from 'lucide-react';
import type { BlogPost } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';

interface BlogManagerProps {
    posts: BlogPost[];
    onEdit: (post: BlogPost) => void;
    onDelete: (post: BlogPost) => void;
    onAddNew: () => void;
}

const BlogManager: React.FC<BlogManagerProps> = ({ posts, onEdit, onDelete, onAddNew }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPosts = useMemo(() => {
        if (!searchTerm) {
            return posts;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return posts.filter(post =>
            post.title.toLowerCase().includes(lowercasedTerm) ||
            post.authorName.toLowerCase().includes(lowercasedTerm)
        );
    }, [posts, searchTerm]);

    return (
        <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by title or author..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>
                <button onClick={onAddNew} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Create New Post
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-semibold">Title</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Author</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Last Updated</th>
                                <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.length > 0 ? filteredPosts.map(post => (
                                <tr key={post.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{post.title}</td>
                                    <td className="px-6 py-4">{post.authorName}</td>
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
                                            <button onClick={() => onEdit(post)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full" aria-label="Edit post"><Edit size={18} /></button>
                                            <button onClick={() => onDelete(post)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full" aria-label="Delete post"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">
                                        <Rss size={32} className="mx-auto text-gray-300 mb-2" />
                                        No blog posts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default BlogManager;
