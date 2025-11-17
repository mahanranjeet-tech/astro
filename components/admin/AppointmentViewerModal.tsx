

import React, { useState, useEffect } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { X, Calendar, Clock, User, CheckCircle, Trash2, Loader } from 'lucide-react';
import type { Consultant, Appointment, NotificationType } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';
import DeleteAppointmentConfirmationModal from './DeleteAppointmentConfirmationModal.tsx';

interface AppointmentViewerModalProps {
    consultant: Consultant;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const AppointmentViewerModal: React.FC<AppointmentViewerModalProps> = ({ consultant, onClose, showNotification }) => {
    
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const appointmentsQuery = db.collection('appointments')
            .where('consultantId', '==', consultant.id);

        const unsubscribe = appointmentsQuery.onSnapshot(snapshot => {
            const fetchedAppointments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Appointment));
            
            // Sort client-side to avoid needing a composite index
            fetchedAppointments.sort((a, b) => {
                const timeA = a.appointmentStart?.toMillis() || 0;
                const timeB = b.appointmentStart?.toMillis() || 0;
                return timeB - timeA;
            });

            setAppointments(fetchedAppointments);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching appointments in modal:", error);
            showNotification("Failed to load appointment data.", "error");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [consultant.id, showNotification]);

    const formatTime = (timestamp: any) => {
        let dateObj: Date | null = null;
        if (!timestamp) return 'N/A';
    
        if (timestamp instanceof Date) {
            dateObj = timestamp;
        } else if (typeof timestamp.toDate === 'function') {
            dateObj = timestamp.toDate();
        }
        
        if (!dateObj) return 'N/A';
    
        return dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleMarkComplete = async (appointment: Appointment) => {
        if (!window.confirm("Are you sure you want to mark this appointment as complete?")) return;

        try {
            const batch = db.batch();
            const appointmentRef = db.collection('appointments').doc(appointment.id);
            const purchaseRef = db.collection('consultation_purchases').doc(appointment.purchaseId);
            
            batch.update(appointmentRef, { status: 'completed' });
            batch.update(purchaseRef, { status: 'completed' });
            
            await batch.commit();
            showNotification('Appointment marked as complete!', 'success');
        } catch (error: any) {
            console.error("Error marking appointment as complete:", error);
            showNotification(`Failed to update: ${error.message}`, 'error');
        }
    };
    
    const handleDelete = async () => {
        if (!appointmentToDelete) return;

        try {
            const batch = db.batch();
            const appointmentRef = db.collection('appointments').doc(appointmentToDelete.id);
            const purchaseRef = db.collection('consultation_purchases').doc(appointmentToDelete.purchaseId);
            
            batch.delete(appointmentRef);
            batch.update(purchaseRef, { status: 'cancelled' });
            
            await batch.commit();
            showNotification('Appointment deleted successfully!', 'success');
        } catch (error: any) {
            console.error("Error deleting appointment:", error);
            showNotification(`Failed to delete: ${error.message}`, 'error');
        } finally {
            setAppointmentToDelete(null);
        }
    };


    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <header className="p-6 border-b flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800">View Appointments</h3>
                            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                        </div>
                        <p className="text-gray-500 mt-1">For <span className="font-semibold">{consultant.name}</span></p>
                    </header>
                    <main className="flex-grow p-6 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader className="animate-spin text-blue-500" size={32} />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Client</th>
                                            <th scope="col" className="px-6 py-3">Date</th>
                                            <th scope="col" className="px-6 py-3">Time</th>
                                            <th scope="col" className="px-6 py-3">Status</th>
                                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments.length > 0 ? appointments.map(appt => (
                                            <tr key={appt.id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <User size={16} className="text-gray-400" />
                                                        <div>
                                                            <div>{appt.userName}</div>
                                                            <div className="text-xs text-gray-500">{appt.userEmail}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} className="text-gray-400" />
                                                        {formatTimestamp(appt.appointmentStart)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={16} className="text-gray-400" />
                                                        {formatTime(appt.appointmentStart)} - {formatTime(appt.appointmentEnd)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        appt.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {appt.status || 'scheduled'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                     <div className="flex justify-end items-center gap-1">
                                                        {appt.status !== 'completed' && (
                                                            <button onClick={() => handleMarkComplete(appt)} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Mark as Complete"><CheckCircle size={16} /></button>
                                                        )}
                                                        <button onClick={() => setAppointmentToDelete(appt)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Delete Appointment"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12 text-gray-500 italic">
                                                    No appointments scheduled for this consultant.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </main>
                     <footer className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-xl border-t">
                        <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Close</button>
                    </footer>
                </div>
            </div>
            {appointmentToDelete && (
                <DeleteAppointmentConfirmationModal
                    appointment={appointmentToDelete}
                    onClose={() => setAppointmentToDelete(null)}
                    onConfirm={handleDelete}
                />
            )}
        </>
    );
};

export default AppointmentViewerModal;
