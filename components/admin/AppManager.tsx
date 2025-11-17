
import React, { useState, useMemo } from 'react';
import { Edit, Trash2, Link, BarChart3, Star, Copy, BookOpen, PlusCircle, Search } from 'lucide-react';
import type { AppDefinition, NotificationType, LandingPageDefinition } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';
import StarRating from '../shared/StarRating.tsx';
import LandingPageManagerModal from './LandingPageManagerModal.tsx';

interface AppManagerProps {
    apps: AppDefinition[];
    landingPages: LandingPageDefinition[];
    appUsageTotals: Record<string, number>;
    appRatingStats: Record<string, { totalReviews: number; averageRating: number }>;
    onEdit: (app: AppDefinition) => void;
    onDelete: (app: AppDefinition) => void;
    onAddNew: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const AppManager: React.FC<AppManagerProps> = ({ apps, landingPages, appUsageTotals, appRatingStats, onEdit, onDelete, onAddNew, showNotification }) => {
    const [managingPagesForApp, setManagingPagesForApp] = useState<AppDefinition | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredApps = useMemo(() => {
        if (!searchTerm) return apps;
        const lowercasedTerm = searchTerm.toLowerCase();
        return apps.filter(app => app.name.toLowerCase().includes(lowercasedTerm));
    }, [apps, searchTerm]);

    const handleOpenLandingPageManager = (app: AppDefinition) => {
        setManagingPagesForApp(app);
    };

    const handleCopyLink = (slug?: string) => {
        if (!slug) return;
        const url = `${window.location.origin}/app/${slug}`;
        navigator.clipboard.writeText(url);
        showNotification('Landing page link copied!', 'success');
    };

    return (
        <>
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by app name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                    <button onClick={onAddNew} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-5 w-5" /> Add New App
                    </button>
                </div>
                {filteredApps.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                            <AppIcon icon="" name="No Apps" className="h-12 w-12 text-gray-300 mb-2"/>
                            <p>{apps.length > 0 ? 'No apps match your search.' : 'No applications have been added yet.'}</p>
                            {apps.length === 0 && <p className="text-sm">Click "Add New App" to get started.</p>}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">Application</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">URL</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">Total Usage</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">Rating</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">Landing Pages</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredApps.map(app => {
                                        const totalUsage = appUsageTotals[app.id] ?? 0;
                                        const appStats = appRatingStats[app.id];
                                        return (
                                        <tr key={app.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 sm:px-6 font-medium text-gray-900 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <AppIcon icon={app.icon} name={app.name} className="h-10 w-10 mr-4 rounded-lg flex-shrink-0" />
                                                    <div>
                                                        <div className="font-bold">{app.name}</div>
                                                        <div className="text-sm text-gray-500 truncate max-w-xs">{app.description || 'No description'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 sm:px-6">
                                                <a href={app.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline max-w-xs truncate">
                                                    <Link size={14} className="mr-1 flex-shrink-0" />
                                                    <span className="truncate">{app.url}</span>
                                                </a>
                                            </td>
                                            <td className="px-4 py-4 sm:px-6">
                                                <div className="flex items-center text-gray-700">
                                                    <BarChart3 size={16} className="mr-2 text-indigo-500 flex-shrink-0"/>
                                                    <span className="font-semibold">{totalUsage}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 sm:px-6">
                                                {appStats ? (
                                                    <div className="flex items-center gap-2">
                                                        <StarRating rating={appStats.averageRating} setRating={() => {}} size={16} disabled={true} />
                                                        <span className="font-semibold text-gray-700">{appStats.averageRating.toFixed(1)}</span>
                                                        <span className="text-gray-500 text-xs">({appStats.totalReviews})</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">No reviews</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 sm:px-6">
                                                <div className="flex items-center gap-1">
                                                    {app.hasLandingPage && app.slug && (
                                                        <div className="flex items-center" title="Default Landing Page">
                                                            <a href={`/app/${app.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full" title="Open Default Landing Page">
                                                                <Link size={16} />
                                                            </a>
                                                            <button onClick={() => handleCopyLink(app.slug)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full" title="Copy Default Link">
                                                                <Copy size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <button onClick={() => handleOpenLandingPageManager(app)} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-gray-100 rounded-full" title="Manage Landing Pages">
                                                        <BookOpen size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 sm:px-6 text-right">
                                                <div className="flex justify-end items-center gap-1">
                                                    <button onClick={() => onEdit(app)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors" aria-label="Edit app"><Edit size={18} /></button>
                                                    <button onClick={() => onDelete(app)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors" aria-label="Delete app"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            {managingPagesForApp && (
                <LandingPageManagerModal
                    app={managingPagesForApp}
                    landingPages={landingPages.filter(p => p.appId === managingPagesForApp.id)}
                    onClose={() => setManagingPagesForApp(null)}
                    showNotification={showNotification}
                />
            )}
        </>
    );
};

export default AppManager;
