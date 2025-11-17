
import React, { useState, useEffect, useMemo } from 'react';
import type { Consultant, ConsultantPackage } from '../../types.ts';
import { functions } from '../../services/firebase.ts';
import { X, Calendar, Clock, Loader, CheckCircle } from 'lucide-react';

interface AppointmentBookingModalProps {
    consultant: Consultant;
    pkg: ConsultantPackage;
    onClose: () => void;
    onSlotSelect: (pkg: ConsultantPackage, date: string, time: string) => void;
}

const formatTime12hr = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
};

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};


const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({ consultant, pkg, onClose, onSlotSelect }) => {
    const [bookedSlots, setBookedSlots] = useState<{ date: string; time: string; }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');

    useEffect(() => {
        const fetchBookedSlots = async () => {
            setIsLoading(true);
            try {
                // Use the secure cloud function instead of a direct query
                const getSlotsFn = functions.httpsCallable('getConsultantBookedSlots');
                const result = await getSlotsFn({ consultantId: consultant.id });
                setBookedSlots(result.data as { date: string; time: string; }[]);
            } catch (error) {
                console.error("Failed to fetch booked slots:", error);
                // Optionally show a user-facing error
            } finally {
                setIsLoading(false);
            }
        };
        fetchBookedSlots();
    }, [consultant.id]);

    const timeSlotsForDay = useMemo(() => {
        if (!selectedDate || !consultant.availability || !pkg.durationInMinutes) return [];

        const dayOfWeek = new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay();
        const slotsForDay = consultant.availability[dayOfWeek] || [];
        const slotsForDaySet = new Set(slotsForDay);

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
        
        const slotIncrement = 30; // Assuming 30 minute increments
        const slotsNeeded = Math.ceil(pkg.durationInMinutes / slotIncrement);

        return slotsForDay.map(time => {
            const isBooked = bookedOnSelectedDay.has(time);
            const isPast = isToday && time < currentTimeStrInIST;

            let isUnavailableForDuration = false;
            if (!isBooked && !isPast && slotsNeeded > 1) {
                for (let i = 1; i < slotsNeeded; i++) {
                    const nextSlotTimeInMins = timeToMinutes(time) + (i * slotIncrement);
                    const nextSlotTime = minutesToTime(nextSlotTimeInMins);
                    // Check if the required next slot is missing from availability or is already booked
                    if (!slotsForDaySet.has(nextSlotTime) || bookedOnSelectedDay.has(nextSlotTime)) {
                        isUnavailableForDuration = true;
                        break;
                    }
                }
            }

            return { 
                time, 
                isBooked, 
                isPast,
                isUnavailableForDuration 
            };
        });
    }, [selectedDate, consultant.availability, bookedSlots, pkg.durationInMinutes]);


    const handleConfirm = () => {
        onSlotSelect(pkg, selectedDate, selectedTime);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">Book Appointment</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                    </div>
                    <p className="text-gray-500 mt-1">Select a slot for <span className="font-semibold">{pkg.name}</span> ({pkg.durationInMinutes} min)</p>
                </header>
                <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                     <div>
                        <h3 className="font-semibold text-lg text-slate-800 mb-2 flex items-center gap-2"><Calendar size={20} /> 1. Select a Date</h3>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800 mb-2 flex items-center gap-2"><Clock size={20} /> 2. Select a Time</h3>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-24"><Loader className="animate-spin text-blue-500" /></div>
                        ) : selectedDate ? (
                            timeSlotsForDay.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {timeSlotsForDay.map(({ time, isBooked, isPast, isUnavailableForDuration }) => (
                                        <button
                                            key={time}
                                            onClick={() => !isBooked && !isPast && !isUnavailableForDuration && setSelectedTime(time)}
                                            disabled={isBooked || isPast || isUnavailableForDuration}
                                            className={`p-3 rounded-lg border text-center font-semibold transition-colors ${
                                                isBooked
                                                    ? 'bg-red-100 text-red-500 border-red-200 cursor-not-allowed line-through'
                                                    : isPast
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : isUnavailableForDuration
                                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                            : selectedTime === time 
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white hover:border-blue-500'
                                            }`}
                                            title={isUnavailableForDuration ? `Not enough consecutive time for a ${pkg.durationInMinutes} min session` : ''}
                                        >
                                            {formatTime12hr(time)}
                                        </button>
                                    ))}
                                </div>
                            ) : <p className="text-slate-500 text-sm mt-4 p-4 bg-gray-50 rounded-lg">No available slots for this date. Please try another day.</p>
                        ) : (
                            <p className="text-slate-500 text-sm mt-4 p-4 bg-gray-50 rounded-lg">Please select a date to see available times.</p>
                        )}
                    </div>
                </main>
                 <footer className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Cancel</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedDate || !selectedTime}
                        className="w-full sm:w-auto flex items-center justify-center py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <CheckCircle className="mr-2" />
                        Confirm Slot & Proceed
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AppointmentBookingModal;
