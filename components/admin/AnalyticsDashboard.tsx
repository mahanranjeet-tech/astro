import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Users, AppWindow, Star, MessageSquare, TrendingUp, Search, ArrowUp, ArrowDown, User, Eye as EyeIcon, Filter, ChevronDown } from 'lucide-react';
import firebase from "firebase/compat/app";

import type { UserProfile, AppDefinition, Review, PageView } from '../../types.ts';
import SummaryCard from './SummaryCard.tsx';
import StarRating from '../shared/StarRating.tsx';
import AppIcon from '../shared/AppIcon.tsx';
import { formatTimestamp } from '../../utils/date.ts';

interface AnalyticsDashboardProps {
    users: UserProfile[];
    apps: AppDefinition[];
    allReviews: Review[];
    appUsageTotals: Record<string, number>;
    appRatingStats: Record<string, { totalReviews: number; averageRating: number }>;
    pageViews: PageView[];
    selectedPageIds: Set<string> | null;
    setSelectedPageIds: React.Dispatch<React.SetStateAction<Set<string> | null>>;
}

type ReviewSortKeys = 'appName' | 'userName' | 'rating' | 'updatedAt';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ users, apps, allReviews, appUsageTotals, appRatingStats, pageViews, selectedPageIds, setSelectedPageIds }) => {
    const [reviewSearchTerm, setReviewSearchTerm] = useState('');
    const [selectedAppFilter, setSelectedAppFilter] = useState<string>('all');
    const [reviewSortConfig, setReviewSortConfig] = useState<{ key: ReviewSortKeys, direction: 'ascending' | 'descending' }>({ key: 'updatedAt', direction: 'descending' });
    
    // State for Page Views filter UI
    const [isPageFilterOpen, setIsPageFilterOpen] = useState(false);
    const pageFilterRef = useRef<HTMLDivElement>(null);
    const [pageFilterSearch, setPageFilterSearch] = useState('');


    const appMap = useMemo(() => new Map(apps.map(app => [app.id, app])), [apps]);

    const summaryStats = useMemo(() => {
        const totalRatings = allReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = allReviews.length > 0 ? (totalRatings / allReviews.length).toFixed(1) : '0.0';
        return {
            totalUsers: users.length,
            totalApps: apps.length,
            totalReviews: allReviews.length,
            averageRating,
        };
    }, [users, apps, allReviews]);

    const mostPopularApp = useMemo(() => {
        if (Object.keys(appUsageTotals).length === 0) return null;
        const mostPopularAppId = Object.entries(appUsageTotals).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        return appMap.get(mostPopularAppId) || null;
    }, [appUsageTotals, appMap]);

    const highestRatedApp = useMemo(() => {
        const ratedApps = Object.entries(appRatingStats);
        if (ratedApps.length === 0) return null;
        const topAppEntry = ratedApps.reduce((a, b) => a[1].averageRating > b[1].averageRating ? a : b);
        return appMap.get(topAppEntry[0]) || null;
    }, [appRatingStats, appMap]);

    const appUserCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        apps.forEach(app => counts[app.id] = 0);
        users.forEach(user => {
            if (user.apps) {
                Object.keys(user.apps).forEach(appId => {
                    if (counts[appId] !== undefined) counts[appId]++;
                });
            }
        });
        return Object.entries(counts).map(([appId, count]) => ({ app: appMap.get(appId), count })).filter(item => item.app).sort((a,b) => b.count - a.count);
    }, [users, apps, appMap]);

    const filteredAndSortedReviews = useMemo(() => {
        let reviewsToProcess = [...allReviews];

        if (selectedAppFilter !== 'all') {
            reviewsToProcess = reviewsToProcess.filter(r => r.appId === selectedAppFilter);
        }

        if (reviewSearchTerm) {
            const lowercasedTerm = reviewSearchTerm.toLowerCase();
            reviewsToProcess = reviewsToProcess.filter(review =>
                review.appName.toLowerCase().includes(lowercasedTerm) ||
                review.userName.toLowerCase().includes(lowercasedTerm) ||
                review.review.toLowerCase().includes(lowercasedTerm)
            );
        }

        reviewsToProcess.sort((a, b) => {
            const { key, direction } = reviewSortConfig;
            const dir = direction === 'ascending' ? 1 : -1;
            
            const aValue = a[key as keyof Review];
            const bValue = b[key as keyof Review];

            if (key === 'appName' || key === 'userName') {
                return (aValue as string || '').localeCompare(bValue as string || '') * dir;
            }
            
            if (key === 'updatedAt') {
                const aMillis = aValue instanceof Date ? aValue.getTime() : (aValue as firebase.firestore.Timestamp)?.toMillis() ?? 0;
                const bMillis = bValue instanceof Date ? bValue.getTime() : (bValue as firebase.firestore.Timestamp)?.toMillis() ?? 0;
                if (aMillis < bMillis) return -1 * dir;
                if (aMillis > bMillis) return 1 * dir;
                return 0;
            }

            // rating
            if ((aValue as number || 0) < (bValue as number || 0)) return -1 * dir;
            if ((aValue as number || 0) > (bValue as number || 0)) return 1 * dir;
            
            return 0;
        });
        return reviewsToProcess;
    }, [allReviews, reviewSearchTerm, reviewSortConfig, selectedAppFilter]);
    
    // Page Views Logic
    const allAvailablePages = useMemo(() => {
        if (!pageViews) return [];
        return [...pageViews].sort((a, b) => a.pageId.localeCompare(b.pageId));
    }, [pageViews]);
    
    const sortedPageViews = useMemo(() => {
        if (!pageViews || !selectedPageIds) return [];
        const filtered = allAvailablePages.filter(p => selectedPageIds.has(p.id));
        return filtered.sort((a, b) => b.count - a.count);
    }, [allAvailablePages, pageViews, selectedPageIds]);
    
    const handlePageSelectionChange = (pageId: string) => {
        setSelectedPageIds(prev => {
            if (!prev) return new Set([pageId]); // Should not happen if initialized correctly, but safe
            const newSet = new Set(prev);
            if (newSet.has(pageId)) newSet.delete(pageId); else newSet.add(pageId);
            return newSet;
        });
    };
    
    const handleSelectAllPages = () => setSelectedPageIds(new Set(allAvailablePages.map(p => p.id)));
    const handleDeselectAllPages = () => setSelectedPageIds(new Set());
    
    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pageFilterRef.current && !pageFilterRef.current.contains(event.target as Node)) {
                setIsPageFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const filteredPageOptions = useMemo(() => {
        if (!pageFilterSearch) return allAvailablePages;
        return allAvailablePages.filter(page => page.pageId.toLowerCase().includes(pageFilterSearch.toLowerCase()));
    }, [allAvailablePages, pageFilterSearch]);


    const handleSortClick = (key: ReviewSortKeys) => {
        setReviewSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending'
        }));
    };

    const SortIcon: React.FC<{ columnKey: ReviewSortKeys }> = ({ columnKey }) => {
        if (reviewSortConfig.key !== columnKey) return <div className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100"><ArrowDown size={14} /></div>;
        return reviewSortConfig.direction === 'ascending' ? <ArrowUp className="text-blue-600" size={14} /> : <ArrowDown className="text-blue-600" size={14} />;
    };
    
    const reviewSortOptions: { label: string, key: ReviewSortKeys }[] = [
        { label: 'Date', key: 'updatedAt' },
        { label: 'Rating', key: 'rating' },
        { label: 'App', key: 'appName' },
        { label: 'User', key: 'userName' },
    ];
    
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Portal Analytics</h2>
            
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <SummaryCard title="Total Users" value={summaryStats.totalUsers} icon={<Users size={24}/>} />
                <SummaryCard title="Total Apps" value={summaryStats.totalApps} icon={<AppWindow size={24}/>} />
                <SummaryCard title="Total Reviews" value={summaryStats.totalReviews} icon={<MessageSquare size={24}/>} />
                <SummaryCard title="Overall Rating" value={summaryStats.averageRating} icon={<Star size={24}/>} description={`from ${summaryStats.totalReviews} reviews`} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">User Distribution per App</h3>
                        {appUserCounts.length > 0 ? (
                            <div className="space-y-4">
                                {appUserCounts.map(({ app, count }) => (
                                    <div key={app.id} className="flex flex-col md:grid md:grid-cols-[200px,1fr,auto] md:items-center gap-2 md:gap-4">
                                        <div className="flex justify-between items-center md:block">
                                            <p className="font-medium text-gray-800 truncate" title={app.name}>{app.name}</p>
                                            <p className="font-semibold text-gray-600 text-sm md:hidden">{count} User{count !== 1 && 's'}</p>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 md:h-4">
                                            <div 
                                                className="bg-blue-600 h-2.5 md:h-4 rounded-full" 
                                                style={{ width: `${users.length > 0 ? (count / users.length) * 100 : 0}%` }}
                                                title={`${users.length > 0 ? ((count / users.length) * 100).toFixed(1) : 0}%`}
                                            ></div>
                                        </div>
                                        <p className="hidden md:block font-semibold text-gray-600 text-sm w-20 text-right">{count} User{count !== 1 && 's'}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-gray-500 italic">No app assignment data available.</p>}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><EyeIcon size={20} /> Page Views</h3>
                            <div className="relative" ref={pageFilterRef}>
                                <button onClick={() => setIsPageFilterOpen(prev => !prev)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors">
                                    <Filter size={16} />
                                    Filter Pages ({(selectedPageIds || new Set()).size} / {allAvailablePages.length})
                                    <ChevronDown size={16} className={`transition-transform ${isPageFilterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isPageFilterOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-10">
                                        <div className="p-2 border-b flex justify-between items-center">
                                            <button onClick={handleSelectAllPages} className="text-xs font-semibold text-blue-600 hover:underline">Select All</button>
                                            <button onClick={handleDeselectAllPages} className="text-xs font-semibold text-blue-600 hover:underline">Deselect All</button>
                                        </div>
                                        <div className="p-2 border-b">
                                            <input type="text" value={pageFilterSearch} onChange={e => setPageFilterSearch(e.target.value)} placeholder="Search pages..." className="w-full text-xs p-1 border rounded" />
                                        </div>
                                        <div className="p-2 max-h-60 overflow-y-auto space-y-1">
                                            {filteredPageOptions.map(page => (
                                                <label key={page.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={(selectedPageIds || new Set()).has(page.id)}
                                                        onChange={() => handlePageSelectionChange(page.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="font-mono text-xs text-gray-700 truncate" title={`/${page.pageId}`}>/{page.pageId}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Page Path</th>
                                        <th scope="col" className="px-6 py-3 text-right">Views</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPageViews.map(view => (
                                        <tr key={view.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-800">/{view.pageId}</td>
                                            <td className="px-6 py-4 text-right font-bold text-lg text-blue-600">{view.count.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {sortedPageViews.length === 0 && <p className="text-center p-4">No page views match the current filter.</p>}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Most Popular App</h3>
                        {mostPopularApp ? (
                            <div className="flex items-center gap-4">
                                <AppIcon icon={mostPopularApp.icon} name={mostPopularApp.name} className="h-16 w-16 rounded-lg flex-shrink-0" />
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{mostPopularApp.name}</p>
                                    <p className="text-gray-500 flex items-center gap-2 mt-1"><TrendingUp size={16} className="text-indigo-500"/> <span className="font-bold">{appUsageTotals[mostPopularApp.id] || 0}</span> total uses</p>
                                </div>
                            </div>
                        ) : <p className="text-gray-500 italic">No usage data available.</p>}
                    </div>
                     <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Highest Rated App</h3>
                        {highestRatedApp ? (
                            <div className="flex items-center gap-4">
                                 <AppIcon icon={highestRatedApp.icon} name={highestRatedApp.name} className="h-16 w-16 rounded-lg flex-shrink-0" />
                                 <div>
                                    <p className="text-xl font-bold text-gray-900">{highestRatedApp.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StarRating rating={appRatingStats[highestRatedApp.id]?.averageRating || 0} setRating={()=>{}} size={20} disabled/>
                                        <p className="text-gray-500"><span className="font-bold">{(appRatingStats[highestRatedApp.id]?.averageRating || 0).toFixed(1)}</span> from {appRatingStats[highestRatedApp.id]?.totalReviews || 0} reviews</p>
                                    </div>
                                </div>
                            </div>
                        ) : <p className="text-gray-500 italic">No review data available.</p>}
                    </div>
                </div>
            </section>
            
            <section className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="p-4 sm:p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-700">User Reviews</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <select
                            value={selectedAppFilter}
                            onChange={e => setSelectedAppFilter(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 transition"
                        >
                            <option value="all">Filter by App: All Apps</option>
                            {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" placeholder="Search reviews..." value={reviewSearchTerm} onChange={(e) => setReviewSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition" />
                        </div>
                    </div>
                </div>

                {/* --- Mobile Sorting Controls --- */}
                <div className="md:hidden px-4 pt-4 pb-2 border-b bg-gray-50">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <span className="text-sm font-medium text-gray-700 flex-shrink-0">Sort by:</span>
                        {reviewSortOptions.map(option => {
                            const isActive = reviewSortConfig.key === option.key;
                            return (
                                <button
                                    key={option.key}
                                    onClick={() => handleSortClick(option.key)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {option.label}
                                    {isActive && (
                                        reviewSortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                {filteredAndSortedReviews.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-8">No matching reviews found.</p>
                ) : (
                    <div>
                        {/* --- Mobile Card View --- */}
                        <div className="md:hidden p-4 space-y-4 bg-gray-50/50">
                            {filteredAndSortedReviews.map(review => (
                                <div key={`${review.userId}_${review.appId}`} className="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <AppIcon icon={appMap.get(review.appId)?.icon || ''} name={review.appName} className="h-10 w-10 rounded-md flex-shrink-0" />
                                            <div>
                                                <p className="font-bold text-gray-800">{review.appName}</p>
                                                <p className="text-sm text-gray-500 flex items-center gap-1.5"><User size={14}/> {review.userName}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatTimestamp(review.updatedAt)}</span>
                                    </div>
                                    <div className="border-t pt-3 space-y-2">
                                        <StarRating rating={review.rating} setRating={()=>{}} size={20} disabled />
                                        <p className="text-sm text-gray-600 italic">"{review.review || 'No comment provided'}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* --- Desktop Table View --- */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 sm:px-6"><button onClick={() => handleSortClick('appName')} className="group flex items-center gap-2 font-semibold">App <SortIcon columnKey="appName" /></button></th>
                                        <th scope="col" className="px-4 py-3 sm:px-6"><button onClick={() => handleSortClick('userName')} className="group flex items-center gap-2 font-semibold">User <SortIcon columnKey="userName" /></button></th>
                                        <th scope="col" className="px-4 py-3 sm:px-6"><button onClick={() => handleSortClick('rating')} className="group flex items-center gap-2 font-semibold">Rating <SortIcon columnKey="rating" /></button></th>
                                        <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">Comment</th>
                                        <th scope="col" className="px-4 py-3 sm:px-6"><button onClick={() => handleSortClick('updatedAt')} className="group flex items-center gap-2 font-semibold">Date <SortIcon columnKey="updatedAt" /></button></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedReviews.map(review => (
                                        <tr key={`${review.userId}_${review.appId}`} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 sm:px-6 font-medium text-gray-900">{review.appName}</td>
                                            <td className="px-4 py-4 sm:px-6">{review.userName}</td>
                                            <td className="px-4 py-4 sm:px-6"><StarRating rating={review.rating} setRating={()=>{}} size={16} disabled /></td>
                                            <td className="px-4 py-4 sm:px-6"><p className="max-w-sm truncate" title={review.review}>{review.review || <span className="italic text-gray-400">No comment</span>}</p></td>
                                            <td className="px-4 py-4 sm:px-6 whitespace-nowrap">{formatTimestamp(review.updatedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default AnalyticsDashboard;