




import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FieldValue } from '../../services/firebase.ts';
import { X, Save, Loader, Clock, Plus, Trash2, Copy, ChevronsRight, User, Award, Megaphone, Percent } from 'lucide-react';
import type { Consultant, NotificationType, MediaFile, UserProfile, Achievement } from '../../types.ts';
import { v4 as uuidv4 } from 'uuid';

interface ConsultantModalProps {
    consultant: Consultant | null;
    onClose: () => void;
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    adminMediaFiles?: MediaFile[];
    consultantMediaFiles?: MediaFile[];
    onSave: (consultantData: any) => Promise<void>;
    users: UserProfile[];
    isUserManaged?: boolean;
    consultants: Consultant[];
}

const slugify = (text: string): string => {
    return text.toString().toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface GeneratorSettings {
    startTime: string;
    endTime: string;
    duration: string; // string for input
    breaks: { id: string, start: string; end: string }[];
}

const ConsultantModal: React.FC<ConsultantModalProps> = ({ consultant, onClose, showNotification, adminMediaFiles, consultantMediaFiles, onSave, users, isUserManaged = false, consultants }) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [bio, setBio] = useState('');
    const [experience, setExperience] = useState('');
    const [qualifications, setQualifications] = useState('');
    const [tagline1, setTagline1] = useState('');
    const [tagline2, setTagline2] = useState('');
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [linkedUserId, setLinkedUserId] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [commissionRate, setCommissionRate] = useState<string>('');

    // SEO Fields
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [featuredImageUrl, setFeaturedImageUrl] = useState('');
    
    const [availability, setAvailability] = useState<{ [key: string]: string[] }>({});
    // FIX: Replaced `Array(7).fill().map()` with `Array.from({ length: 7 })` to prevent a potential runtime error
    // in stricter environments where `fill()` might be called without its required argument.
    const [generatorSettings, setGeneratorSettings] = useState<GeneratorSettings[]>(
        Array.from({ length: 7 }, () => ({
            startTime: '10:00',
            endTime: '18:00',
            duration: '30',
            breaks: [{ id: uuidv4(), start: '13:00', end: '14:00' }]
        }))
    );
    const [openGenerator, setOpenGenerator] = useState<number | null>(null);
    const [copySourceDay, setCopySourceDay] = useState<number>(1);

    const prevConsultantIdRef = useRef<string | null | undefined>();

    useEffect(() => {
        // This effect syncs the form state only when the consultant prop changes.
        // It prevents state loss on re-renders caused by internal actions (e.g., generating slots).
        const prevId = prevConsultantIdRef.current;
        const currentId = consultant?.id;

        if (prevId !== currentId) {
            if (consultant) {
                // Editing an existing consultant: Populate the form.
                setName(consultant.name);
                setSlug(consultant.slug);
                setProfilePictureUrl(consultant.profilePictureUrl || '');
                setBio(consultant.bio || '');
                setExperience(consultant.experience || '');
                setQualifications(consultant.qualifications || '');
                setTagline1(consultant.tagline1 || '');
                setTagline2(consultant.tagline2 || '');
                setAchievements(consultant.achievements || []);
                setAvailability(consultant.availability || {});
                setLinkedUserId(consultant.linkedUserId || '');
                setMetaTitle(consultant.metaTitle || '');
                setMetaDescription(consultant.metaDescription || '');
                setFeaturedImageUrl(consultant.featuredImageUrl || '');
                setCommissionRate(consultant.commissionRate != null ? String(consultant.commissionRate) : '');
                
                const linkedUser = users.find(u => u.id === consultant.linkedUserId);
                if (linkedUser) {
                    setUserSearch(`${linkedUser.name} (${linkedUser.email})`);
                } else {
                    setUserSearch('');
                }

            } else {
                // Switched to creating a new consultant: Reset the entire form.
                setName('');
                setSlug('');
                setProfilePictureUrl('');
                setBio('');
                setExperience('');
                setQualifications('');
                setTagline1('');
                setTagline2('');
                setAchievements([]);
                setAvailability({});
                setLinkedUserId('');
                setUserSearch('');
                setMetaTitle('');
                setMetaDescription('');
                setFeaturedImageUrl('');
                setCommissionRate('');
            }
        }
        
        // Update the ref to the current consultant's ID for the next render.
        prevConsultantIdRef.current = consultant?.id;

    }, [consultant, users]);


    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (!consultant) { // Only auto-slug on creation
            setSlug(slugify(newName));
        }
    };
    
    const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserSearch(e.target.value);
        setLinkedUserId('');
        setIsUserDropdownOpen(true);
    };

    const handleUserSelect = (selectedUser: UserProfile) => {
        setLinkedUserId(selectedUser.id);
        setUserSearch(`${selectedUser.name} (${selectedUser.email})`);
        setIsUserDropdownOpen(false);
    };
    
    const filteredUsersForDropdown = useMemo(() => {
        if (!userSearch || linkedUserId) {
            return [];
        }
        const lowercasedTerm = userSearch.toLowerCase();
        // Users already linked to *other* consultants should not be available.
        const linkedUserIdsOfOtherConsultants = consultants.filter(c => c.id !== consultant?.id).map(c => c.linkedUserId).filter(Boolean);
        return users.filter(user =>
            !linkedUserIdsOfOtherConsultants.includes(user.id) && (
                user.name.toLowerCase().includes(lowercasedTerm) ||
                (user.email && user.email.toLowerCase().includes(lowercasedTerm)) ||
                (user.phone && user.phone.includes(userSearch))
            )
        ).slice(0, 100);
    }, [userSearch, users, linkedUserId, consultants, consultant]);

    const handleGeneratorChange = (dayIndex: number, field: keyof Omit<GeneratorSettings, 'breaks'>, value: string) => {
        setGeneratorSettings(prev => {
            const newSettings = [...prev];
            newSettings[dayIndex] = { ...newSettings[dayIndex], [field]: value };
            return newSettings;
        });
    };

    const handleBreakChange = (dayIndex: number, breakId: string, field: 'start' | 'end', value: string) => {
        setGeneratorSettings(prev => {
            const newSettings = [...prev];
            const daySettings = { ...newSettings[dayIndex] };
            daySettings.breaks = daySettings.breaks.map(b => b.id === breakId ? { ...b, [field]: value } : b);
            newSettings[dayIndex] = daySettings;
            return newSettings;
        });
    };

    const addBreak = (dayIndex: number) => {
        setGeneratorSettings(prev => {
            const newSettings = [...prev];
            newSettings[dayIndex].breaks.push({ id: uuidv4(), start: '', end: '' });
            return newSettings;
        });
    };

    const removeBreak = (dayIndex: number, breakId: string) => {
        setGeneratorSettings(prev => {
            const newSettings = [...prev];
            newSettings[dayIndex].breaks = newSettings[dayIndex].breaks.filter(b => b.id !== breakId);
            return newSettings;
        });
    };

    const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const handleGenerateSlots = (dayIndex: number) => {
        const settings = generatorSettings[dayIndex];
        const duration = parseInt(settings.duration, 10);
        if (!settings.startTime || !settings.endTime || !duration || duration <= 0) {
            showNotification('Please fill in start time, end time, and a valid duration.', 'error');
            return;
        }

        const startMins = timeToMinutes(settings.startTime);
        const endMins = timeToMinutes(settings.endTime);
        const breakPeriods = settings.breaks
            .filter(b => b.start && b.end)
            .map(b => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) }));

        const newSlots: string[] = [];
        for (let t = startMins; t < endMins; t += duration) {
            const slotEnd = t + duration;
            const isInBreak = breakPeriods.some(b => t < b.end && slotEnd > b.start);
            if (!isInBreak) {
                newSlots.push(minutesToTime(t));
            }
        }
        
        setAvailability(prev => ({ ...prev, [dayIndex]: newSlots }));
        showNotification(`Generated ${newSlots.length} slots for ${daysOfWeek[dayIndex]}.`, 'success');
    };
    
    const handleCopySlots = (targetDayIndex: number) => {
        const sourceSlots = availability[copySourceDay] || [];
        setAvailability(prev => ({ ...prev, [targetDayIndex]: [...sourceSlots] }));
        showNotification(`Copied slots from ${daysOfWeek[copySourceDay]} to ${daysOfWeek[targetDayIndex]}`, 'success');
    };


    const addSlot = (dayIndex: number) => {
        const timeInput = document.getElementById(`time-input-${dayIndex}`) as HTMLInputElement;
        if (timeInput && timeInput.value) {
            const newSlot = timeInput.value; // "HH:mm" format
            setAvailability(prev => {
                const daySlots = prev[dayIndex] || [];
                const updatedDaySlots = [...new Set([...daySlots, newSlot])].sort();
                return { ...prev, [dayIndex]: updatedDaySlots };
            });
            timeInput.value = '';
        }
    };

    const removeSlot = (dayIndex: number, slotToRemove: string) => {
        setAvailability(prev => ({
            ...prev,
            [dayIndex]: (prev[dayIndex] || []).filter(slot => slot !== slotToRemove)
        }));
    };
    
    const formatTime12hr = (time24: string) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHours = h % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
    };
    
    const handleAchievementChange = (id: string, text: string) => {
        setAchievements(prev => prev.map(ach => ach.id === id ? { ...ach, text } : ach));
    };

    const addAchievement = () => {
        setAchievements(prev => [...prev, { id: uuidv4(), text: '' }]);
    };

    const removeAchievement = (id: string) => {
        setAchievements(prev => prev.filter(ach => ach.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !slug) {
            showNotification("Name and URL Slug are required.", "error");
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave: any = {
                id: consultant?.id,
                name,
                slug: slugify(slug),
                profilePictureUrl,
                bio,
                experience,
                qualifications,
                tagline1,
                tagline2,
                achievements: achievements.filter(a => a.text.trim()),
                availability,
                linkedUserId: linkedUserId || null, // Ensure null is passed if empty
                metaTitle,
                metaDescription,
                featuredImageUrl,
                updatedAt: FieldValue.serverTimestamp(),
            };
            if (commissionRate.trim() === '') {
                dataToSave.commissionRate = FieldValue.delete();
            } else {
                const rate = parseFloat(commissionRate);
                if (isNaN(rate) || rate < 0 || rate > 100) {
                    showNotification('Commission rate must be a valid number between 0 and 100.', 'error');
                    setIsSaving(false);
                    return;
                }
                dataToSave.commissionRate = rate;
            }
            await onSave(dataToSave);
            onClose();
        } catch (error) {
            // Error notification is handled by the parent
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-6 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-gray-800">{consultant ? 'Edit Consultant' : 'Add New Consultant'}</h3>
                        <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 grid md:grid-cols-2 gap-6 overflow-y-auto">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-4">
                        <input type="text" value={name} onChange={handleNameChange} placeholder="Full Name" required className="w-full p-3 border rounded-lg" />
                        <input type="text" value={slug} onChange={e => setSlug(e.target.value)} placeholder="URL Slug" required className="w-full p-2 border rounded-lg bg-gray-100 font-mono text-sm" />
                        
                        {!isUserManaged && (
                            <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                                <h4 className="font-semibold text-gray-700 text-sm">Admin Controls</h4>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-2"><User size={14}/> Linked User Account</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={handleUserSearchChange}
                                            onFocus={() => setIsUserDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setIsUserDropdownOpen(false), 200)}
                                            placeholder="Search by name, email, or phone to link..."
                                            className="w-full p-2 border rounded-lg bg-white"
                                        />
                                        {isUserDropdownOpen && filteredUsersForDropdown.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredUsersForDropdown.map(user => (
                                                    <div
                                                        key={user.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                        onMouseDown={() => handleUserSelect(user)}
                                                    >
                                                        <p className="font-semibold">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.email} - {user.phone || 'No phone'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Linking a user allows them to manage this consultant profile from their dashboard.</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-2"><Percent size={14}/> Platform Commission Rate</label>
                                    <input
                                        type="number"
                                        value={commissionRate}
                                        onChange={e => setCommissionRate(e.target.value)}
                                        placeholder="Default (e.g., 3%)"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="w-full p-2 border rounded-md"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave blank to use the global default rate. This is the percentage the platform charges on sales from this consultant's page.</p>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Profile Picture</label>
                             <select value={profilePictureUrl} onChange={(e) => setProfilePictureUrl(e.target.value)} className="w-full p-2 border rounded-lg bg-white appearance-none">
                                <option value="">-- Select an Image --</option>
                                {consultantMediaFiles && consultantMediaFiles.length > 0 && (
                                    <optgroup label={isUserManaged ? "My Uploads" : "Consultant's Uploads"}>
                                        {consultantMediaFiles.map(file => <option key={file.id} value={file.url}>{file.name}</option>)}
                                    </optgroup>
                                )}
                                {adminMediaFiles && adminMediaFiles.length > 0 && (
                                    <optgroup label="Admin Library">
                                        {adminMediaFiles.map(file => <option key={file.id} value={file.url}>{file.name}</option>)}
                                    </optgroup>
                                )}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Upload images in the Media Library first.</p>
                            {profilePictureUrl && <img src={profilePictureUrl} alt="Preview" className="mt-2 h-24 w-24 rounded-full object-cover border-2 border-gray-200" />}
                        </div>
                        
                        <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-700 text-sm">Header/Card Details</h4>
                            <p className="text-xs text-gray-500 -mt-2">Used in the hero section and other profile cards.</p>
                            <input type="text" value={experience} onChange={e => setExperience(e.target.value)} placeholder="Experience (e.g., 20+ Years)" className="w-full p-2 border rounded-md" />
                            <input type="text" value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="Qualifications (e.g., PhD in Vastu)" className="w-full p-2 border rounded-md" />
                            <input type="text" value={tagline1} onChange={e => setTagline1(e.target.value)} placeholder="Tagline 1 (e.g., World's Most Qualified)" className="w-full p-2 border rounded-md" />
                            <input type="text" value={tagline2} onChange={e => setTagline2(e.target.value)} placeholder="Tagline 2 (e.g., Doctor of Science)" className="w-full p-2 border rounded-md" />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Biography / About Section</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a detailed bio... (HTML is supported)" className="w-full p-3 border rounded-lg h-32 resize-y font-mono text-sm" />
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Key Achievements</label>
                            <div className="p-3 bg-gray-50 border rounded-lg space-y-2">
                                {achievements.map(ach => (
                                    <div key={ach.id} className="flex items-center gap-2">
                                        <Award size={16} className="text-amber-500 flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={ach.text}
                                            onChange={e => handleAchievementChange(ach.id, e.target.value)}
                                            placeholder="e.g., Two Decades of Mastery..."
                                            className="flex-grow p-2 border rounded-md text-sm"
                                        />
                                        <button type="button" onClick={() => removeAchievement(ach.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addAchievement} className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                                    <Plus size={14} /> Add Achievement
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 border rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2"><Megaphone size={16}/> SEO / Sharing Settings</h4>
                            <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Meta Title for Sharing" className="w-full p-2 border rounded-md" />
                            <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Meta Description (for sharing preview)" className="w-full p-2 border rounded-md h-20" />
                             <select value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} className="w-full p-2 border rounded-lg bg-white appearance-none">
                                <option value="">-- Select a Featured Image --</option>
                                {consultantMediaFiles && consultantMediaFiles.length > 0 && (
                                    <optgroup label={isUserManaged ? "My Uploads" : "Consultant's Uploads"}>
                                        {consultantMediaFiles.map(file => <option key={file.id} value={file.url}>{file.name}</option>)}
                                    </optgroup>
                                )}
                                {adminMediaFiles && adminMediaFiles.length > 0 && (
                                    <optgroup label="Admin Library">
                                        {adminMediaFiles.map(file => <option key={file.id} value={file.url}>{file.name}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>


                    </div>
                    {/* Right Column: Availability */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Weekly Availability</label>
                        <div className="p-3 bg-gray-50 border rounded-lg space-y-4 max-h-[60vh] overflow-y-auto">
                            {daysOfWeek.map((day, dayIndex) => (
                                <div key={day} className="border-b pb-4 last:border-b-0">
                                    <div className="flex justify-between items-center">
                                        <h5 className="font-semibold text-gray-800">{day}</h5>
                                        <button type="button" onClick={() => setOpenGenerator(openGenerator === dayIndex ? null : dayIndex)} className="text-xs font-semibold text-blue-600 hover:underline">Generator</button>
                                    </div>
                                    
                                    {openGenerator === dayIndex && (
                                        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 space-y-3 mt-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="time" value={generatorSettings[dayIndex].startTime} onChange={e => handleGeneratorChange(dayIndex, 'startTime', e.target.value)} className="p-1 border rounded text-xs"/>
                                                <input type="time" value={generatorSettings[dayIndex].endTime} onChange={e => handleGeneratorChange(dayIndex, 'endTime', e.target.value)} className="p-1 border rounded text-xs"/>
                                            </div>
                                            <input type="number" placeholder="Duration (mins)" value={generatorSettings[dayIndex].duration} onChange={e => handleGeneratorChange(dayIndex, 'duration', e.target.value)} className="w-full p-1 border rounded text-xs"/>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium">Breaks:</p>
                                                {generatorSettings[dayIndex].breaks.map(b => (
                                                    <div key={b.id} className="flex items-center gap-1">
                                                        <input type="time" value={b.start} onChange={e => handleBreakChange(dayIndex, b.id, 'start', e.target.value)} className="p-1 border rounded text-xs w-full"/>
                                                        <span>-</span>
                                                        <input type="time" value={b.end} onChange={e => handleBreakChange(dayIndex, b.id, 'end', e.target.value)} className="p-1 border rounded text-xs w-full"/>
                                                        <button type="button" onClick={() => removeBreak(dayIndex, b.id)} className="p-1 text-red-500"><Trash2 size={12}/></button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addBreak(dayIndex)} className="text-xs text-green-600 font-semibold">+ Add Break</button>
                                            </div>
                                            <button type="button" onClick={() => handleGenerateSlots(dayIndex)} className="w-full py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600">Generate & Overwrite Slots</button>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(availability[dayIndex] || []).map((slot, slotIndex) => (
                                            <div key={slot} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                                                {formatTime12hr(slot)}
                                                <button type="button" onClick={() => removeSlot(dayIndex, slot)} className="text-blue-500 hover:text-blue-800"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input type="time" id={`time-input-${dayIndex}`} className="p-1 border rounded-md text-sm" />
                                        <button type="button" onClick={() => addSlot(dayIndex)} className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-md hover:bg-green-600">Add</button>
                                        <div className="flex items-center gap-1 ml-auto">
                                            <span className="text-xs text-gray-500">Copy from:</span>
                                            <select value={copySourceDay} onChange={e => setCopySourceDay(Number(e.target.value))} className="text-xs border rounded p-1">
                                                {daysOfWeek.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                            </select>
                                            <button type="button" onClick={() => handleCopySlots(dayIndex)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Copy"><Copy size={14}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
                <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? <Loader className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                        {isSaving ? 'Saving...' : 'Save Consultant'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default ConsultantModal;
