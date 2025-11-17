import React, { useState, useEffect, useMemo } from 'react';
import type { UserProfile, NotificationType, ConsultationPurchase, Appointment, Consultant } from '../../types.ts';
import { db, FieldValue, functions } from '../../services/firebase.ts';
import firebase from "firebase/compat/app";
import { Calendar, CheckCircle, Loader, Clock, User, Mail, Shield, RefreshCw, Phone, LogIn } from 'lucide-react';
import Footer from './Footer.tsx';
import LoadingIndicator from '../shared/LoadingIndicator.tsx';

interface BookingPageProps {
    purchaseId: string;
    userProfile: UserProfile | 'loading' | null;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

const formatTime12hr = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
};

const formatGoogleCalendarDate = (date: Date): string => {
    if (!date) return '';
    // Converts to 'YYYYMMDDTHHMMSSZ' format
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
};

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1500;

// Helper function to reconstruct Firestore Timestamps which are serialized over HTTPS calls
const reconstructAppointmentTimestamps = (appt: any): Appointment | null => {
    if (!appt) return null;
    const newAppt = { ...appt };
    if (newAppt.appointmentStart && typeof newAppt.appointmentStart._seconds === 'number') {
        newAppt.appointmentStart = new firebase.firestore.Timestamp(newAppt.appointmentStart._seconds, newAppt.appointmentStart._nanoseconds);
    }
    if (newAppt.appointmentEnd && typeof newAppt.appointmentEnd._seconds === 'number') {
        newAppt.appointmentEnd = new firebase.firestore.Timestamp(newAppt.appointmentEnd._seconds, newAppt.appointmentEnd._nanoseconds);
    }
    return newAppt as Appointment;
}

const BookingPage: React.FC<BookingPageProps> = ({ purchaseId, userProfile, showNotification }) => {
    const [purchase, setPurchase] = useState<ConsultationPurchase | null>(null);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [consultant, setConsultant] = useState<Consultant | null>(null);
    const [bookedSlots, setBookedSlots] = useState<{ date: string; time: string; }[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Guest verification state
    const [isVerified, setIsVerified] = useState(false);
    const [verificationDetails, setVerificationDetails] = useState({ email: '', phone: '' });
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedCredentials, setVerifiedCredentials] = useState<{ email: string; phone: string } | null>(null);
    
    // Rescheduling state
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        const loadBookingData = async () => {
            if (isCancelled) return;
            setLoading(true);
            setError(null);

            if (userProfile === 'loading') return;

            // --- GUEST FLOW with POLLING ---
            if (!userProfile) {
                const isPostPurchase = sessionStorage.getItem(`pending_booking_${purchaseId}`) === 'true';
                const credsRaw = sessionStorage.getItem(`creds_${purchaseId}`);
                
                const attemptVerification = async (creds: { email: string, phone: string }, retriesLeft: number): Promise<void> => {
                    if (isCancelled) return;
                    setIsVerifying(true);
                    try {
                        const verifyFn = functions.httpsCallable('verifyGuestBookingIdentity');
                        const result = await verifyFn({ purchaseId, ...creds });
                        const data = result.data as any;

                        if (data.success) {
                            if (isCancelled) return;
                            
                            setPurchase(data.purchase);
                            setAppointment(reconstructAppointmentTimestamps(data.appointment));
                            setConsultant(data.consultant);
                            
                            const getSlotsFn = functions.httpsCallable('getConsultantBookedSlots');
                            const slotsResult = await getSlotsFn({ consultantId: data.consultant.id });
                            if (!isCancelled) setBookedSlots(slotsResult.data as any);

                            setVerifiedCredentials(creds);
                            setIsVerified(true);
                            setIsVerifying(false);
                            setLoading(false);
                            sessionStorage.removeItem(`pending_booking_${purchaseId}`);
                            sessionStorage.setItem(`creds_${purchaseId}`, JSON.stringify(creds));
                            return;
                        } else {
                            throw new Error("Verification failed.");
                        }
                    } catch (e: any) {
                        if (e.code === 'not-found' && retriesLeft > 0) {
                            setTimeout(() => attemptVerification(creds, retriesLeft - 1), RETRY_DELAY_MS);
                        } else {
                            if (isCancelled) return;
                            setError(e.message || 'Booking not found or details are incorrect.');
                            setIsVerifying(false);
                            setLoading(false);
                            sessionStorage.removeItem(`pending_booking_${purchaseId}`);
                        }
                    }
                };
                
                if (isPostPurchase && credsRaw) {
                    const creds = JSON.parse(credsRaw);
                    setVerificationDetails(creds);
                    await attemptVerification(creds, MAX_RETRIES);
                } else {
                    if (isCancelled) return;
                    setIsVerified(false);
                    setLoading(false);
                }
                return;
            }

            // --- LOGGED-IN USER FLOW with POLLING ---
            const isPostPurchase = sessionStorage.getItem(`pending_booking_${purchaseId}`) === 'true';
            
            const attemptFetch = async (retriesLeft: number) => {
                if (isCancelled) return;
                try {
                    const purchaseDocRef = db.collection('consultation_purchases').doc(purchaseId);
                    const purchaseSnap = await purchaseDocRef.get();
                    
                    if (!purchaseSnap.exists) {
                        if (isPostPurchase && retriesLeft > 0) {
                            setTimeout(() => attemptFetch(retriesLeft - 1), RETRY_DELAY_MS);
                            return;
                        } else {
                            throw new Error("Booking not found.");
                        }
                    }
                    
                    const purchaseData = { ...purchaseSnap.data(), id: purchaseSnap.id } as ConsultationPurchase;
                    if (purchaseData.userId !== userProfile.id) {
                        throw new Error("You do not have permission to view this booking.");
                    }
                    
                    if (isCancelled) return;
                    setPurchase(purchaseData);
                    setIsVerified(true);
                    sessionStorage.removeItem(`pending_booking_${purchaseId}`);

                    if (purchaseData.appointmentId) {
                        db.collection('appointments').doc(purchaseData.appointmentId).onSnapshot(snap => {
                            if (!isCancelled) setAppointment(snap.exists ? { ...snap.data(), id: snap.id } as Appointment : null);
                        });
                    } else {
                        if (!isCancelled) setAppointment(null);
                    }
                    
                    const consultantDoc = await db.collection('consultants').doc(purchaseData.consultantId).get();
                    if (!isCancelled) setConsultant(consultantDoc.data() as Consultant);

                    const getSlotsFn = functions.httpsCallable('getConsultantBookedSlots');
                    const result = await getSlotsFn({ consultantId: purchaseData.consultantId });
                    if (!isCancelled) setBookedSlots(result.data as { date: string; time: string; }[]);
                    
                    setLoading(false);

                } catch (e: any) {
                    if (isCancelled) return;
                    setError(e.message);
                    setLoading(false);
                    sessionStorage.removeItem(`pending_booking_${purchaseId}`);
                }
            };

            await attemptFetch(isPostPurchase ? MAX_RETRIES : 0);
        };

        loadBookingData();

        return () => {
            isCancelled = true;
        };
    }, [purchaseId, userProfile, showNotification]);

    
    const handleVerificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVerificationDetails(prev => ({ ...prev, [name]: value }));
    };
    
    const handleVerification = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsVerifying(true);
        try {
            const verifyFn = functions.httpsCallable('verifyGuestBookingIdentity');
            const result = await verifyFn({
                purchaseId: purchaseId,
                email: verificationDetails.email,
                phone: verificationDetails.phone,
            });
            const data = result.data as any;
             if (data.success) {
                setPurchase(data.purchase);
                setAppointment(reconstructAppointmentTimestamps(data.appointment));
                setConsultant(data.consultant);
                
                const getSlotsFn = functions.httpsCallable('getConsultantBookedSlots');
                const slotsResult = await getSlotsFn({ consultantId: data.consultant.id });
                setBookedSlots(slotsResult.data as any);

                setVerifiedCredentials(verificationDetails);
                setIsVerified(true);
                sessionStorage.setItem(`creds_${purchaseId}`, JSON.stringify(verificationDetails));
                showNotification("Verification successful!", 'success');
            } else {
                throw new Error("Verification failed.");
            }
        } catch (error: any) {
            showNotification(error.message || "Verification failed. Please check your details and try again.", 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReschedule = async () => {
        if (!selectedDate || !selectedTime || !appointment) {
            showNotification('Please select a new date and time.', 'error');
            return;
        }
        setIsBooking(true);
        try {
            const rescheduleFn = functions.httpsCallable('rescheduleAppointment');
            const payload: any = { purchaseId, newDate: selectedDate, newTime: selectedTime };
            
            if (userProfile && userProfile !== 'loading') {
                // Logged-in user: backend uses auth context, no verification payload needed.
            } else if (verifiedCredentials) {
                // Guest user: must provide verification details.
                payload.verification = verifiedCredentials;
            } else {
                // This should not happen if the UI flow is correct.
                throw new Error("Cannot reschedule. User is not logged in and booking details are missing.");
            }

            const result = await rescheduleFn(payload);
            const data = result.data as any;

            if (data.success && data.updatedAppointment) {
                const returnedAppointment = reconstructAppointmentTimestamps(data.updatedAppointment);
                setAppointment(returnedAppointment);
            }
            
            showNotification('Appointment rescheduled successfully!', 'success');
            
            const getSlotsFn = functions.httpsCallable('getConsultantBookedSlots');
            const slotsResult = await getSlotsFn({ consultantId: appointment.consultantId });
            setBookedSlots(slotsResult.data as { date: string; time: string; }[]);
            
            setIsRescheduling(false);
            setSelectedDate('');
            setSelectedTime('');
        } catch (error: any) {
            console.error("Error rescheduling:", error);
            showNotification(`Rescheduling failed: ${error.message}`, 'error');
        } finally {
            setIsBooking(false);
        }
    };
    
    const timeSlotsForDay = useMemo(() => {
        if (!selectedDate || !consultant?.availability || !purchase?.durationInMinutes) return [];
    
        const dayOfWeek = new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay();
        const slotsForDay = consultant.availability[dayOfWeek] || [];
    
        const bookedOnSelectedDay = new Set(
            bookedSlots
                .filter(slot => slot.date === selectedDate)
                .map(slot => slot.time)
        );
        
        const now = new Date();
        const todayStrInIST = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const isToday = selectedDate === todayStrInIST;
    
        const currentTimeStrInIST = now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata',
            hour12: false,
        });
        
        return slotsForDay.map(time => ({
            time,
            isBooked: bookedOnSelectedDay.has(time),
            isPast: isToday && time < currentTimeStrInIST,
        }));
    }, [selectedDate, consultant, bookedSlots, purchase]);

    
    const calendarUrl = useMemo(() => {
        if (!appointment || !purchase) return '#';

        const eventTitle = `Consultation: ${purchase.packageName} with ${purchase.consultantName}`;
        const startTime = formatGoogleCalendarDate(appointment.appointmentStart.toDate());
        const endTime = formatGoogleCalendarDate(appointment.appointmentEnd.toDate());
        const details = `Your confirmed appointment for ${purchase.packageName} with ${purchase.consultantName}.`;
        
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}&sf=true&output=xml`;
    }, [appointment, purchase]);


    if (loading) return <LoadingIndicator text="Finding your booking..." />;
    if (error) return <div className="min-h-dvh flex flex-col"><main className="flex-grow flex items-center justify-center"><div className="text-center text-red-500 p-4">{error}</div></main><Footer /></div>;
    
    if (!isVerified) {
        return (
            <div className="min-h-dvh flex flex-col bg-slate-50">
                 <main className="flex-grow flex items-center justify-center container mx-auto px-4 py-8">
                     <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border">
                        <form onSubmit={handleVerification}>
                            <div className="text-center">
                                <Shield size={32} className="mx-auto text-blue-500 mb-3" />
                                <h1 className="text-2xl font-bold text-slate-800">Verify Your Booking</h1>
                                <p className="text-slate-500 mt-2">To view or reschedule, please enter the email and phone number you used to book.</p>
                            </div>
                            <div className="mt-6 space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="email" name="email" value={verificationDetails.email} onChange={handleVerificationChange} placeholder="Your Email Address" required className="w-full pl-10 pr-3 py-2 border rounded-lg"/>
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input type="tel" name="phone" value={verificationDetails.phone} onChange={handleVerificationChange} placeholder="Your Mobile Number" required className="w-full pl-10 pr-3 py-2 border rounded-lg"/>
                                </div>
                                <button type="submit" disabled={isVerifying} className="w-full flex items-center justify-center py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:bg-blue-400">
                                    {isVerifying ? <Loader className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                    {isVerifying ? 'Verifying...' : 'Verify & View Booking'}
                                </button>
                                 <p className="text-center text-xs text-gray-500">Already have an account? <a href="/login" className="font-semibold text-blue-600 hover:underline">Login here</a></p>
                            </div>
                        </form>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }
    
    if (!purchase) {
         return <div className="min-h-dvh flex flex-col"><main className="flex-grow flex items-center justify-center"><div className="text-center text-red-500 p-4">Booking not found.</div></main><Footer /></div>;
    }
    
    return (
        <div className="min-h-dvh flex flex-col bg-slate-50">
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="bg-white p-6 sm:p-8 md:p-12 rounded-2xl shadow-xl border border-slate-200/80">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b pb-6 mb-8">
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-full"><Calendar size={28} /></div>
                        <div><h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Your Appointment</h1><p className="text-slate-500 mt-1">For {purchase.packageName}</p></div>
                    </div>

                    {appointment && !isRescheduling && (
                        <div>
                            <div className="text-center bg-green-50/80 p-6 sm:p-10 rounded-2xl border-2 border-dashed border-green-200">
                                <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                                <h2 className="text-3xl font-bold text-slate-800">Appointment Confirmed!</h2>
                                <p className="text-slate-600 mt-4 text-lg">Hello, <span className="font-bold">{purchase.userName}</span>.</p>
                                <div className="mt-4 text-slate-700">
                                    <p>Your <span className="font-semibold">{purchase.packageName}</span> with</p>
                                    <p className="text-2xl font-extrabold text-slate-900 mt-1">{purchase.consultantName}</p>
                                    <p className="mt-2">is scheduled for:</p>
                                </div>
                                <p className="text-2xl font-bold text-blue-600 mt-4">{new Date(appointment.appointmentStart.toDate()).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                <p className="text-xl font-semibold text-slate-700 mt-1">at {new Date(appointment.appointmentStart.toDate()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                <div className="mt-6">
                                    <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors shadow">
                                        <Calendar size={16} className="mr-2"/> Add to Google Calendar
                                    </a>
                                </div>
                            </div>
                             <div className="mt-8 text-center">
                                {(appointment.rescheduleCount || 0) < 1 ? (
                                    <div>
                                        <button onClick={() => setIsRescheduling(true)} className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors shadow">
                                            <RefreshCw size={16} className="mr-2"/> Need to Reschedule?
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2">(Rescheduling is allowed only once per booking)</p>
                                    </div>
                                ) : (
                                    <p className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
                                        This appointment has already been rescheduled and cannot be changed further.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {(!appointment || isRescheduling) && (
                         <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold text-lg text-slate-800 mb-2">1. Select a Date</h3>
                                <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }} min={new Date().toISOString().split('T')[0]} className="w-full p-3 border rounded-lg" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-slate-800 mb-2">2. Select a Time</h3>
                                {selectedDate ? (
                                    timeSlotsForDay.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {timeSlotsForDay.map(({ time, isBooked, isPast }) => <button key={time} onClick={() => !isBooked && !isPast && setSelectedTime(time)} disabled={isBooked || isPast} className={`p-3 rounded-lg border text-center font-semibold transition-colors ${ isBooked ? 'bg-red-100 text-red-500 cursor-not-allowed line-through' : isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selectedTime === time ? 'bg-blue-600 text-white' : 'bg-white hover:border-blue-500'}`}>{formatTime12hr(time)}</button>)}
                                        </div>
                                    ) : <p className="text-slate-500 text-sm mt-4">No available slots for this date.</p>
                                ) : <p className="text-slate-500 text-sm mt-4">Please select a date to see available times.</p>}
                            </div>
                             <div className="md:col-span-2 text-center pt-8 border-t">
                                <button onClick={handleReschedule} disabled={!selectedDate || !selectedTime || isBooking} className="w-full max-w-xs inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 shadow-lg">
                                    {isBooking ? <Loader className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                    {isBooking ? 'Confirming...' : 'Confirm New Slot'}
                                </button>
                                {isRescheduling && <button onClick={() => setIsRescheduling(false)} className="mt-3 text-sm text-gray-600 hover:underline">Cancel Reschedule</button>}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default BookingPage;
