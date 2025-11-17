

import React, { useState, useMemo, useEffect } from 'react';
import { Briefcase, PlusCircle, Search, Edit, Trash2, BookOpen, IndianRupee, Calendar, Link as LinkIcon, Power, PowerOff, Loader } from 'lucide-react';
import { db, functions } from '../../services/firebase.ts';
import type { Consultant, ConsultantPackage, Appointment, MediaFile, VideoTestimonial, NotificationType, UserProfile } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';
import ConsultantModal from './ConsultantModal.tsx';
import DeleteConsultantConfirmationModal from './DeleteConsultantConfirmationModal.tsx';
import PackageManagerModal from './PackageManagerModal.tsx';
import ConsultantPageEditorModal from './ConsultantPageEditorModal.tsx';
import AppointmentViewerModal from './AppointmentViewerModal.tsx';

interface ConsultantDashboardProps {
    consultants: Consultant[];
    packages: ConsultantPackage[];
    appointments: Appointment[];
    mediaFiles: MediaFile[];
    videoTestimonials: VideoTestimonial[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    users: UserProfile[];
    onSaveConsultant: (consultantData: any) => Promise<void>;
    setEditingConsultant: (consultant: Consultant | null) => void;
}

const ConsultantDashboard: React.FC<ConsultantDashboardProps> = ({ consultants, packages, appointments, mediaFiles, videoTestimonials, showNotification, users, onSaveConsultant, setEditingConsultant: setEditingConsultantInParent }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
    const [consultantToDelete, setConsultantToDelete] = useState<Consultant | null>(null);
    
    // State for new modals
    const [managingPackagesFor, setManagingPackagesFor] = useState<Consultant | null>(null);
    const [managingPageFor, setManagingPageFor] = useState<Consultant | null>(null);
    const [viewingAppointmentsFor, setViewingAppointmentsFor] = useState<Consultant | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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

    const filteredConsultants = useMemo(() => {
        return consultants.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [consultants, searchTerm]);

    const handleOpenModal = (consultant: Consultant | null = null) => {
        setEditingConsultant(consultant);
        setEditingConsultantInParent(consultant);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (consultant: Consultant) => {
        setConsultantToDelete(consultant);
    };

    const handleConnectCalendar = async (consultantId: string) => {
        setActionLoading(consultantId);
        try {
            const googleAuthInit = functions.httpsCallable('googleAuthInit');
            const result = await googleAuthInit({ 
                consultantId,
                // The final redirect URL after Google auth completes
                finalRedirectUrl: window.location.href 
            });
            const authUrl = (result.data as { authUrl: string }).authUrl;
            window.location.href = authUrl; // Redirect user to Google for auth
        } catch (error: any) {
            showNotification(`Error starting calendar connection: ${error.message}`, 'error');
            setActionLoading(null);
        }
    };

    const handleDisconnectCalendar = async (consultantId: string) => {
        if (!window.confirm("Are you sure you want to disconnect this calendar? Future appointments will not be synced automatically.")) {
            return;
        }
        setActionLoading(consultantId);
        try {
            const googleAuthDisconnect = functions.httpsCallable('googleAuthDisconnect');
            await googleAuthDisconnect({ consultantId });
            showNotification('Google Calendar disconnected successfully.', 'success');
        } catch (error: any) {
            showNotification(`Error disconnecting calendar: ${error.message}`, 'error');
        } finally {
            setActionLoading(null);
        }
    };


    return (
        <>
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-5 w-5" /> Add New Consultant
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 font-semibold">Consultant</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">Google Calendar</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">Created On</th>
                                    <th scope="col" className="px-6 py-3 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredConsultants.length > 0 ? filteredConsultants.map(consultant => (
                                    <tr key={consultant.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            <img src={consultant.profilePictureUrl || `https://ui-avatars.com/api/?name=${consultant.name}&background=random`} alt={consultant.name} className="h-10 w-10 rounded-full object-cover" />
                                            <div>
                                                <span>{consultant.name}</span>
                                                <p className="text-xs text-gray-500 font-mono">/consultants/{consultant.slug}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {actionLoading === consultant.id ? (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Loader className="animate-spin" size={16} />
                                                    <span>Processing...</span>
                                                </div>
                                            ) : consultant.googleCalendarConnected ? (
                                                <div className="flex items-center gap-2">
                                                     <div className="flex-grow">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Connected</span>
                                                        <p className="text-xs text-gray-500 truncate mt-1" title={consultant.googleCalendarEmail}>{consultant.googleCalendarEmail}</p>
                                                    </div>
                                                    <button onClick={() => handleDisconnectCalendar(consultant.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="Disconnect Calendar"><PowerOff size={16} /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleConnectCalendar(consultant.id)} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                                                    <LinkIcon size={14} /> Connect
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{formatTimestamp(consultant.createdAt)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center items-center gap-1">
                                                <button onClick={() => setManagingPackagesFor(consultant)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-full" title="Manage Packages"><IndianRupee size={16} /></button>
                                                <button onClick={() => setManagingPageFor(consultant)} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-gray-100 rounded-full" title="Manage Page"><BookOpen size={16} /></button>
                                                <button onClick={() => setViewingAppointmentsFor(consultant)} className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-gray-100 rounded-full" title="View Appointments"><Calendar size={16} /></button>
                                                <button onClick={() => handleOpenModal(consultant)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="Edit Profile"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteClick(consultant)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Delete"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-500">
                                            <Briefcase size={32} className="mx-auto text-gray-300 mb-2" />
                                            No consultants found. Add one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
            {isModalOpen && (
                <ConsultantModal
                    consultant={editingConsultant}
                    onClose={() => { setIsModalOpen(false); setEditingConsultant(null); setEditingConsultantInParent(null); }}
                    showNotification={showNotification}
                    adminMediaFiles={mediaFiles}
                    consultantMediaFiles={[]}
                    onSave={onSaveConsultant}
                    users={users}
                    // FIX: Pass the 'consultants' prop as it is required by ConsultantModalProps.
                    consultants={consultants}
                />
            )}
            {consultantToDelete && (
                <DeleteConsultantConfirmationModal
                    consultant={consultantToDelete}
                    onClose={() => setConsultantToDelete(null)}
                    showNotification={showNotification}
                />
            )}
            {managingPackagesFor && (
                <PackageManagerModal
                    consultant={managingPackagesFor}
                    packages={packages.filter(p => p.consultantId === managingPackagesFor.id)}
                    onClose={() => setManagingPackagesFor(null)}
                    showNotification={showNotification}
                />
            )}
            {managingPageFor && (
                <ConsultantPageEditorModal
                    consultant={managingPageFor}
                    consultantPackages={packages.filter(s => s.consultantId === managingPageFor.id)}
                    adminMediaFiles={mediaFiles}
                    consultantMediaFiles={[]}
                    videoTestimonials={videoTestimonials}
                    onClose={() => setManagingPageFor(null)}
                    showNotification={showNotification}
                />
            )}
            {viewingAppointmentsFor && (
                <AppointmentViewerModal
                    consultant={viewingAppointmentsFor}
                    onClose={() => setViewingAppointmentsFor(null)}
                    showNotification={showNotification}
                />
            )}
        </>
    );
};

export default ConsultantDashboard;
