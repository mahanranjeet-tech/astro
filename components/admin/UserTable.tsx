import React, { useMemo } from 'react';
import { User, Edit, Trash2, ArrowUp, ArrowDown, Users, Briefcase } from 'lucide-react';
import type { UserProfile, AppDefinition, UserAppSetting, AffiliateStatus, Consultant, AffiliateProfile } from '../../types.ts';
import { formatTimestamp, formatDate } from '../../utils/date.ts';

type UserSortKeys = 'name' | 'validity' | 'updatedAt';

const AppTag: React.FC<{ name: string; setting: UserAppSetting; used: number; }> = ({ name, setting, used }) => {
    const isLimitReached = setting.usageLimit > 0 && used >= setting.usageLimit;
    const isExpired = setting.expiryDate && new Date(setting.expiryDate) < new Date();

    const tagColor = isExpired || isLimitReached ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
    
    const usageText = setting.usageLimit === 0 ? 'Unlimited' : `${used} / ${setting.usageLimit}`;

    return (
        <div className={`p-2 rounded-md ${tagColor} text-xs leading-tight`}>
            <p className="font-bold">{name}</p>
            <p className="text-xs mt-0.5 font-mono">Usage: {usageText}</p>
            <p className="text-xs mt-0.5">Expires: {setting.expiryDate ? formatDate(setting.expiryDate) : 'Never'}</p>
        </div>
    );
};

// Moved from inside UserTable to prevent re-creation on every render.
const SortIcon: React.FC<{
    columnKey: UserSortKeys;
    sortConfig: { key: UserSortKeys; direction: 'ascending' | 'descending' };
}> = ({ columnKey, sortConfig }) => {
    if (sortConfig?.key !== columnKey) {
        return <div className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100"><ArrowDown size={14} /></div>;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUp className="text-blue-600" size={14} />;
    }
    return <ArrowDown className="text-blue-600" size={14} />;
};

// A specific type for the user object passed to the StatusBadge.
interface StatusBadgeUser {
    isAccountExpired: boolean;
    isExpiringToday: boolean;
    affiliateStatus?: AffiliateStatus;
    linkedConsultantId?: string;
    linkedConsultantName?: string;
}

// Moved from inside UserTable to prevent re-creation on every render.
const StatusBadge: React.FC<{ user: StatusBadgeUser }> = ({ user }) => {
    
    const getAffiliateBadge = (status?: AffiliateStatus) => {
        switch (status) {
            case 'active':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Affiliate</span>;
            case 'pending':
                return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Requesting</span>;
            default:
                return null;
        }
    };
    
    if (user.isAccountExpired) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                Expired
            </span>
        );
    }
    if (user.isExpiringToday) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                Expiring Today
            </span>
        );
    }
    return (
        <div className="flex flex-col items-start gap-1">
             <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Active
            </span>
            {getAffiliateBadge(user.affiliateStatus)}
            {user.linkedConsultantName && (
                 <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 items-center gap-1">
                    <Briefcase size={12}/> Manages: {user.linkedConsultantName}
                </span>
            )}
        </div>
       
    );
};


interface UserTableProps {
    users: UserProfile[];
    allUsers: UserProfile[]; // All users for name lookup
    allApps: AppDefinition[];
    usageCounts: Record<string, number>;
    onEdit: (user: UserProfile) => void;
    onDelete: (user: UserProfile) => void;
    onSortChange: (config: { key: UserSortKeys, direction: 'ascending' | 'descending' }) => void;
    sortConfig: { key: UserSortKeys, direction: 'ascending' | 'descending' };
    consultants: Consultant[];
    affiliateProfiles: AffiliateProfile[];
}

const UserTable: React.FC<UserTableProps> = ({ users, allUsers, allApps, usageCounts, onEdit, onDelete, onSortChange, sortConfig, consultants, affiliateProfiles }) => {
    
    const usersWithDetails = useMemo(() => {
        const appMap = new Map(allApps.map(app => [app.id, app]));
        const consultantMap = new Map(consultants.map(c => [c.id, c.name]));
        const affiliateMapByRefId = new Map(affiliateProfiles.map(p => [p.refId, p]));
        const userMapById = new Map(allUsers.map(u => [u.id, u]));
        const today = new Date().toISOString().split('T')[0];

        return users.map(user => {
            const userApps = user.apps || {};
            const assignedAppsWithDetails = Object.entries(userApps)
                .map(([appId, setting]) => {
                    const appDetails = appMap.get(appId);
                    const used = usageCounts[`${user.id}_${appId}`] ?? 0;
                    return appDetails ? { ...appDetails, setting, used } : null;
                })
                .filter(Boolean) as (AppDefinition & { setting: UserAppSetting, used: number })[];

            const userValidity = user.validity || '1970-01-01';
            const isAccountExpired = userValidity < today;
            const isExpiringToday = !isAccountExpired && userValidity === today;
            const lastModifiedTimestamp = user.updatedAt || user.createdAt;
            
            let referrerName: string | undefined = undefined;
            if (user.referredBy) {
                const affiliate = affiliateMapByRefId.get(user.referredBy.toLowerCase());
                if (affiliate) {
                    const referrerUser = userMapById.get(affiliate.userId);
                    if (referrerUser) {
                        referrerName = referrerUser.name;
                    }
                }
            }

            return {
                ...user,
                validity: userValidity, // Overwrite with fallback for safety
                assignedAppsWithDetails,
                isAccountExpired,
                isExpiringToday,
                lastModifiedTimestamp,
                linkedConsultantName: user.linkedConsultantId ? consultantMap.get(user.linkedConsultantId) : undefined,
                referrerName,
            };
        });
    }, [users, allUsers, allApps, usageCounts, consultants, affiliateProfiles]);
    
    const handleSortRequest = (key: UserSortKeys) => {
        const isCurrentKey = sortConfig.key === key;
        const direction = isCurrentKey && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
        onSortChange({ key, direction });
    };

    const userSortOptions: { label: string; key: UserSortKeys }[] = [
        { label: 'Last Modified', key: 'updatedAt' },
        { label: 'Name', key: 'name' },
        { label: 'Validity', key: 'validity' },
    ];


    if (users.length === 0) {
        return <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center text-gray-500">No matching users found.</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* --- Mobile Sorting Controls --- */}
            <div className="md:hidden px-4 pt-4 pb-2 border-b bg-gray-50">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <span className="text-sm font-medium text-gray-700 flex-shrink-0">Sort by:</span>
                    {userSortOptions.map(option => {
                        const isActive = sortConfig.key === option.key;
                        return (
                             <button
                                key={option.key}
                                onClick={() => handleSortRequest(option.key)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {option.label}
                                {isActive && (
                                    sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* --- Mobile View: Card Layout --- */}
            <div className="md:hidden bg-gray-50/50">
                <div className="p-4 space-y-4">
                    {usersWithDetails.map(user => (
                        <div key={user.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200 space-y-4">
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <User className="text-blue-500" size={20}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 truncate flex items-center gap-2">
                                            {user.name}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                        {user.phone && <p className="text-sm text-gray-500 truncate">{user.phone}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center flex-shrink-0">
                                    <button onClick={() => onEdit(user)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" aria-label={`Edit ${user.name}`}><Edit size={18} /></button>
                                    <button onClick={() => onDelete(user)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" aria-label={`Delete ${user.name}`}><Trash2 size={18} /></button>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="border-t pt-4 space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600">Account Validity</span>
                                    <div className="text-right">
                                        <StatusBadge user={user} />
                                        <div className="text-gray-500 text-sm mt-1">{formatDate(user.validity)}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-600">Last Modified</span>
                                    <span className="text-gray-500 text-sm">{formatTimestamp(user.lastModifiedTimestamp)}</span>
                                </div>
                                {user.referredBy && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-600">Referred By</span>
                                        <span className="text-gray-500 text-sm text-right">
                                            {user.referrerName ? (
                                                <>
                                                    {user.referrerName}
                                                    <span className="font-mono text-xs block text-gray-400">({user.referredBy})</span>
                                                </>
                                            ) : (
                                                <span className="font-mono text-xs">{user.referredBy}</span>
                                            )}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-semibold text-gray-600 mb-2">Assigned Apps</h4>
                                    {user.assignedAppsWithDetails.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {user.assignedAppsWithDetails.map(app => (
                                                <AppTag key={app.id} name={app.name} setting={app.setting} used={app.used} />
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">No apps assigned</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- Desktop View: Table Layout --- */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">
                                <button onClick={() => handleSortRequest('name')} className="group flex items-center gap-2">
                                    User
                                    <SortIcon columnKey="name" sortConfig={sortConfig} />
                                </button>
                            </th>
                            <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">
                                <button onClick={() => handleSortRequest('validity')} className="group flex items-center gap-2">
                                    Account Validity
                                    <SortIcon columnKey="validity" sortConfig={sortConfig} />
                                </button>
                            </th>
                            <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">
                                <button onClick={() => handleSortRequest('updatedAt')} className="group flex items-center gap-2">
                                    Last Modified
                                    <SortIcon columnKey="updatedAt" sortConfig={sortConfig} />
                                </button>
                            </th>
                            <th scope="col" className="px-4 py-3 sm:px-6 font-semibold">Assigned Apps & Limits</th>
                            <th scope="col" className="px-4 py-3 sm:px-6 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usersWithDetails.map(user => (
                            <tr key={user.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4 sm:px-6 font-medium text-gray-900 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4 flex-shrink-0"><User className="text-blue-500" size={20}/></div>
                                        <div>
                                            <div className="font-bold flex items-center gap-2">
                                                {user.name}
                                            </div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                            {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                                            {user.referredBy && (
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Referred by: <span className="font-semibold text-gray-500">{user.referrerName || user.referredBy}</span>
                                                    {user.referrerName && <span className="font-mono text-gray-400"> ({user.referredBy})</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    <div className="flex flex-col items-start">
                                        <StatusBadge user={user} />
                                        <div className="text-gray-500 text-sm mt-1">{formatDate(user.validity)}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    <span className="text-gray-600">{formatTimestamp(user.lastModifiedTimestamp)}</span>
                                </td>
                                <td className="px-4 py-4 sm:px-6">
                                    {user.assignedAppsWithDetails.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 max-w-md">
                                            {user.assignedAppsWithDetails.map(app => (
                                                <AppTag key={app.id} name={app.name} setting={app.setting} used={app.used} />
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">No apps assigned</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 sm:px-6 text-right">
                                    <div className="flex justify-end items-center gap-1">
                                        <button onClick={() => onEdit(user)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors" aria-label="Edit user"><Edit size={18} /></button>
                                        <button onClick={() => onDelete(user)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors" aria-label="Delete user"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserTable;