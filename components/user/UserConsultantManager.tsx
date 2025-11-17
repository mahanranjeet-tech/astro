

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, functions, FieldValue } from '../../services/firebase.ts';
import type { 
    UserProfile, NotificationType, Consultant, ConsultantPackage, Appointment, 
    MediaFile, VideoTestimonial 
} from '../../types.ts';
import { Briefcase, IndianRupee, Calendar, Image as ImageIcon, Settings, BookOpen, Copy, Check, Link as LinkIcon, Power, PowerOff, Loader } from 'lucide-react';

import ConsultantModal from '../admin/ConsultantModal.tsx';
import PackageManagerModal from '../admin/PackageManagerModal.tsx';
import AppointmentViewerModal from '../admin/AppointmentViewerModal.tsx';
import ConsultantMediaManager from './ConsultantMediaManager.tsx';
import ConsultantPageEditorModal from '../admin/ConsultantPageEditorModal.tsx';

interface UserConsultantManagerProps {
    user: UserProfile;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const UserConsultantManager: React.FC<UserConsultantManagerProps> = ({ user, showNotification }) => {
    // Data State
    const [consultant, setConsultant] = useState<Consultant | null>(null);
    const [packages, setPackages] = useState<ConsultantPackage[]>([]);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [videoTestimonials, setVideoTestimonials] = useState<VideoTestimonial[]>([]);
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isPackageManagerOpen, setIsPackageManagerOpen] = useState(false);
    const [isAppointmentViewerOpen, setIsAppointmentViewerOpen] = useState(false);
    const [isMediaManagerOpen, setIsMediaManagerOpen] = useState(false);
    const [isPageEditorOpen, setIsPageEditorOpen] = useState(false);
    const [isCalendarActionLoading, setIsCalendarActionLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const consultantId = user.linkedConsultantId;

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const gcalError = urlParams.get('gcal_error');
        if (gcalError) {
            showNotification(`Google Calendar error: ${gcalError}`, 'error', 8000);
            // Clean up the URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [showNotification]);

    useEffect(() => {
        if (!consultantId) {
            setIsLoading(false);
            return;
        }

        const unsubscribers: (() => void)[] = [];
        setIsLoading(true);

        const fetchAllData = () => {
            const unsubConsultant = db.collection('consultants').doc(consultantId).onSnapshot(doc => {
                if (doc.exists) setConsultant({ ...doc.data(), id: doc.id } as Consultant);
            });
            unsubscribers.push(unsubConsultant);

            const unsubPackages = db.collection('consultants').doc(consultantId).collection('consultant_packages').orderBy('order').onSnapshot(snap => {
                setPackages(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ConsultantPackage)));
            });
            unsubscribers.push(unsubPackages);
            
            const unsubMedia = db.collection('consultants').doc(consultantId).collection('media_files').orderBy('createdAt', 'desc').onSnapshot(snap => {
                 setMediaFiles(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MediaFile)));
            });
            unsubscribers.push(unsubMedia);

            const unsubTestimonials = db.collection('site_content').doc('live').onSnapshot(doc => {
                if (doc.exists) setVideoTestimonials(doc.data()?.videoTestimonials || []);
            });
            unsubscribers.push(unsubTestimonials);
            
            setIsLoading(false);
        };
        
        fetchAllData();

        return () => unsubscribers.forEach(unsub => unsub());
    }, [consultantId]);

    const handleSaveProfile = async (consultantData: any) => {
        try {
            const { id, ...data } = consultantData;
            delete data.linkedUserId;
            delete data.commissionRate;
            await db.collection('consultants').doc(id).update(data);
            showNotification('Profile updated successfully!', 'success');
        } catch (error: any) {
            showNotification(`Failed to update profile: ${error.message}`, 'error');
            throw error;
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center items-center h-full"><Loader className="animate-spin text-blue-500" size={32} /></div>;
    }
    if (!consultant) {
        return <div className="p-8 text-center text-gray-500">Could not load your consultant profile. Please contact support.</div>;
    }

    const publicPageUrl = `${window.location.origin}/consultants/${consultant.slug}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicPageUrl);
        setCopied(true);
        showNotification('Public page link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConnectCalendar = async () => {
        setIsCalendarActionLoading(true);
        try {
            const googleAuthInit = functions.httpsCallable('googleAuthInit');
            const result = await googleAuthInit({ 
                consultantId: consultant.id,
                finalRedirectUrl: window.location.href 
            });
            const authUrl = (result.data as { authUrl: string }).authUrl;
            if (authUrl) {
                window.location.href = authUrl;
            } else {
                throw new Error("Could not get authorization URL.");
            }
        } catch (error: any) {
            showNotification(`Error starting calendar connection: ${error.message}`, 'error');
            setIsCalendarActionLoading(false);
        }
    };

    const handleDisconnectCalendar = async () => {
        if (!window.confirm("Are you sure you want to disconnect your Google Calendar? Future appointments will not be synced automatically.")) {
            return;
        }
        setIsCalendarActionLoading(true);
        try {
            const googleAuthDisconnect = functions.httpsCallable('googleAuthDisconnect');
            await googleAuthDisconnect({ consultantId: consultant.id });
            showNotification('Google Calendar disconnected successfully. The page will reload.', 'success');
        } catch (error: any) {
            showNotification(`Error disconnecting calendar: ${error.message}`, 'error');
            setIsCalendarActionLoading(false);
        }
    };

    const actionCards = [
        { title: 'Edit Profile & Availability', description: 'Update bio, picture, and time slots.', icon: <Settings/>, onClick: () => setIsProfileModalOpen(true) },
        { title: 'Manage Packages', description: 'Create and edit service packages.', icon: <IndianRupee/>, onClick: () => setIsPackageManagerOpen(true) },
        { title: 'Edit Public Page', description: 'Customize the public-facing consultant page.', icon: <BookOpen/>, onClick: () => setIsPageEditorOpen(true) },
        { title: 'View Appointments', description: 'See upcoming and past appointments.', icon: <Calendar/>, onClick: () => setIsAppointmentViewerOpen(true) },
        { title: 'Manage My Media', description: `Upload and manage your personal images for your profile and gallery (Limit: 6 files).`, icon: <ImageIcon/>, onClick: () => setIsMediaManagerOpen(true) },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full">
            <h4 className="text-xl font-bold text-gray-800">Managing profile for <span className="text-purple-600">{consultant.name}</span></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {actionCards.map(card => (
                    <button key={card.title} onClick={card.onClick} className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg hover:border-purple-300 transition-all text-left flex items-start gap-4">
                        <div className="bg-purple-100 text-purple-600 p-3 rounded-full">{card.icon}</div>
                        <div>
                            <h5 className="font-bold text-lg text-gray-800">{card.title}</h5>
                            <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <h4 className="font-semibold text-gray-700 mb-2">Your Public Page Link</h4>
                    <div className="flex items-center gap-2">
                        <input type="text" readOnly value={publicPageUrl} className="w-full p-2 border rounded-md bg-gray-100 font-mono text-sm" />
                        <button onClick={handleCopyLink} className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors" title="Copy Link">
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <h4 className="font-semibold text-gray-700 mb-2">Google Calendar Sync</h4>
                    <div className="flex items-center justify-between">
                        {consultant.googleCalendarConnected ? (
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Connected</span>
                                <span className="text-sm text-gray-600 truncate">{consultant.googleCalendarEmail}</span>
                            </div>
                        ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Not Connected</span>
                        )}
                        
                        {isCalendarActionLoading ? (
                            <Loader className="animate-spin text-gray-500" size={20} />
                        ) : consultant.googleCalendarConnected ? (
                            <button onClick={handleDisconnectCalendar} className="text-sm font-semibold text-red-600 hover:underline flex items-center gap-1">
                                <PowerOff size={14} /> Disconnect
                            </button>
                        ) : (
                            <button onClick={handleConnectCalendar} className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                                <LinkIcon size={14} /> Connect
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isProfileModalOpen && <ConsultantModal consultant={consultant} onClose={() => setIsProfileModalOpen(false)} showNotification={showNotification} onSave={handleSaveProfile} users={[]} isUserManaged={true} consultantMediaFiles={mediaFiles} consultants={[]} />}
            {isPackageManagerOpen && <PackageManagerModal consultant={consultant} packages={packages} onClose={() => setIsPackageManagerOpen(false)} showNotification={showNotification} />}
            {isAppointmentViewerOpen && <AppointmentViewerModal consultant={consultant} onClose={() => setIsAppointmentViewerOpen(false)} showNotification={showNotification} />}
            {isMediaManagerOpen && <ConsultantMediaManager consultantId={consultantId!} onClose={() => setIsMediaManagerOpen(false)} showNotification={showNotification} />}
            {isPageEditorOpen && <ConsultantPageEditorModal consultant={consultant} consultantPackages={packages} adminMediaFiles={[]} consultantMediaFiles={mediaFiles} videoTestimonials={videoTestimonials} onClose={() => setIsPageEditorOpen(false)} showNotification={showNotification} isUserManaged={true} />}
        </div>
    );
};

export default UserConsultantManager;
