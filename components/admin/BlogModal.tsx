import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Trash2 } from 'lucide-react';
import type { BlogPost, NotificationType } from '../../types.ts';

interface BlogModalProps {
    post: BlogPost | null;
    onClose: () => void;
    onSave: (postData: Omit<BlogPost, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove non-word [a-z0-9_], non-whitespace, non-hyphen chars
        .replace(/[\s_-]+/g, '-') // swap any length of whitespace, underscore, hyphen characters with a single -
        .replace(/^-+|-+$/g, ''); // remove leading, trailing -
};

const BlogModal: React.FC<BlogModalProps> = ({ post, onClose, onSave, showNotification }) => {
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        featuredImageUrl: '',
        status: 'draft' as 'draft' | 'published',
        metaTitle: '',
        metaDescription: '',
        tags: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');

    useEffect(() => {
        if (post) {
            setFormData({
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                featuredImageUrl: post.featuredImageUrl || '',
                status: post.status,
                metaTitle: post.metaTitle || '',
                metaDescription: post.metaDescription || '',
                tags: (post.tags || []).join(', '),
            });
        } else {
            setFormData({
                title: '', slug: '', content: '', excerpt: '',
                featuredImageUrl: '', status: 'draft',
                metaTitle: '', metaDescription: '', tags: '',
            });
        }
    }, [post]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'title') {
            setFormData(prev => ({ ...prev, title: value, slug: slugify(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const postData = {
            ...formData,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        };
        await onSave(postData);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{post ? 'Edit Blog Post' : 'Create New Blog Post'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 space-y-4 overflow-y-auto">
                    <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Post Title" required className="w-full p-3 border rounded-lg text-lg font-semibold" />
                    <input type="text" name="slug" value={formData.slug} onChange={handleChange} placeholder="URL Slug (auto-generated)" required className="w-full p-2 border rounded-lg bg-gray-100 font-mono text-sm" />
                    
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Content</label>
                        <div className="border border-gray-300 rounded-lg">
                            <div className="flex border-b bg-gray-50 rounded-t-lg">
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('visual')}
                                    className={`py-2 px-4 text-sm font-semibold rounded-tl-lg ${editorMode === 'visual' ? 'bg-white border-b-0 border-t-2 border-t-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Visual Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('code')}
                                    className={`py-2 px-4 text-sm font-semibold ${editorMode === 'code' ? 'bg-white border-b-0 border-t-2 border-t-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Code (HTML)
                                </button>
                            </div>
                            {editorMode === 'visual' ? (
                                <div
                                    className="prose max-w-none w-full p-3 h-64 overflow-y-auto bg-white rounded-b-lg"
                                    dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-gray-400">This is a preview. Switch to the Code (HTML) tab to write your post.</p>' }}
                                />
                            ) : (
                                <textarea
                                    name="content"
                                    value={formData.content}
                                    onChange={handleChange}
                                    placeholder="Write your HTML code here..."
                                    required
                                    className="w-full p-3 border-0 rounded-b-lg h-64 resize-y focus:ring-0 font-mono bg-gray-800 text-green-400 selection:bg-green-800"
                                />
                            )}
                        </div>
                    </div>

                    <textarea name="excerpt" value={formData.excerpt} onChange={handleChange} placeholder="Short excerpt for blog list (max 200 chars)" required maxLength={200} className="w-full p-3 border rounded-lg h-24 resize-y" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="featuredImageUrl" className="text-sm font-medium text-gray-700 mb-1 block">Featured Image URL</label>
                            <input
                                id="featuredImageUrl"
                                name="featuredImageUrl"
                                type="text"
                                value={formData.featuredImageUrl}
                                onChange={handleChange}
                                placeholder="https://example.com/image.jpg"
                                className="w-full p-3 border rounded-lg"
                            />
                            {formData.featuredImageUrl && (
                                <div className="mt-2 relative group">
                                    <img src={formData.featuredImageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg border"/>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, featuredImageUrl: ''}))}
                                        className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 text-white rounded-full"
                                        title="Remove Image URL"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Paste a direct link to an image. The image must be publicly hosted online.</p>
                        </div>
                         <select name="status" value={formData.status} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white self-start">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold text-gray-600 mb-2">SEO Settings</h4>
                        <div className="space-y-3 p-4 bg-gray-50 border rounded-lg">
                            <input type="text" name="metaTitle" value={formData.metaTitle} onChange={handleChange} placeholder="Meta Title (for search engines)" className="w-full p-2 border rounded-md" />
                            <textarea name="metaDescription" value={formData.metaDescription} onChange={handleChange} placeholder="Meta Description (for search engines, max 160 chars)" maxLength={160} className="w-full p-2 border rounded-md h-20 resize-y" />
                            <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="Tags (comma-separated)" className="w-full p-2 border rounded-md" />
                        </div>
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                       {isSaving && <Loader className="animate-spin mr-2" size={20} />}
                       {isSaving ? 'Saving...' : 'Save Post'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default BlogModal;