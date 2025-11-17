import React, { useState, useEffect, useCallback } from 'react';
import { db, FieldValue } from '../../services/firebase.ts';
import { Webhook, Settings, Save, Loader, Copy, Check, Trash2, Edit, X } from 'lucide-react';
import type { NotificationType } from '../../types.ts';

// New shape for webhook config
interface WebhookConfig {
    eventEndpoints?: { [key: string]: string };
}

const AVAILABLE_EVENTS = [
    {
        category: 'Sales',
        events: [
            { id: 'sale.success', name: 'Sale Success (Immediate)', description: 'Triggered for ANY successful payment. Good for general order confirmation.' },
            { id: 'sale.success.followup', name: 'Sale Success (Follow-up)', description: 'Sends the same data as "Immediate", but to a different URL. Use this for reminder/drip sequences in your CRM.' },
            { id: 'sale.app', name: 'App Purchase (Immediate)', description: 'Triggered specifically for an app or credit purchase.' },
            { id: 'sale.app.followup', name: 'App Purchase (Follow-up)', description: 'Use this for app-specific onboarding or follow-up sequences.' },
            { id: 'sale.package', name: 'Package Purchase (Immediate)', description: 'Triggered for a consultation package. Contains appointment details if booked during checkout.' },
            { id: 'sale.package.followup', name: 'Package Purchase (Follow-up)', description: 'Use this to set up appointment reminders in your CRM.' },
            { id: 'sale.webinar', name: 'Webinar Purchase (Immediate)', description: 'Triggered for a webinar ticket. Contains webinar details.' },
            { id: 'sale.webinar.followup', name: 'Webinar Purchase (Follow-up)', description: 'Use this to set up webinar reminders in your CRM.' },
        ]
    },
    {
        category: 'Leads',
        events: [
            { id: 'lead.captured', name: 'Lead Captured (Immediate)', description: 'Triggered when a user provides details but abandons checkout. Good for instant follow-up.' },
            { id: 'lead.captured.followup', name: 'Lead Captured (Follow-up)', description: 'Use this for long-term lead nurturing sequences in your CRM.' },
        ]
    }
];

interface WebhookManagerProps {
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
}

// Moved docRef outside the component to prevent re-creation on every render.
const docRef = db.collection('site_content').doc('webhook_config');

const WebhookManager: React.FC<WebhookManagerProps> = ({ showNotification }) => {
    const [config, setConfig] = useState<WebhookConfig>({ eventEndpoints: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data() as any;
                // Prioritize new format. Fallback to migration only if new format doesn't exist.
                if (data.eventEndpoints) {
                    setConfig({ eventEndpoints: data.eventEndpoints || {} });
                } else if (data.endpointUrl || data.subscribedEvents) {
                    const newEventEndpoints: { [key: string]: string } = {};
                    if(data.subscribedEvents && Array.isArray(data.subscribedEvents)) {
                        data.subscribedEvents.forEach((event: string) => {
                            newEventEndpoints[event] = data.endpointUrl || '';
                        });
                    }
                    setConfig({ eventEndpoints: newEventEndpoints });
                } else {
                    setConfig({ eventEndpoints: {} });
                }
            } else {
                setConfig({ eventEndpoints: {} });
            }
        } catch (error) {
            console.error("Error fetching webhook config:", error);
            showNotification('Failed to load webhook configuration.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleEndpointChange = (eventId: string, url: string) => {
        setConfig(prev => ({
            ...prev,
            eventEndpoints: {
                ...prev.eventEndpoints,
                [eventId]: url
            }
        }));
    };
    
    const handleSubscriptionChange = (eventId: string, isSubscribed: boolean) => {
        setConfig(prev => {
            const newEndpoints = { ...prev.eventEndpoints };
            if (isSubscribed) {
                // When subscribing, add the key with an empty string if it doesn't exist
                if (newEndpoints[eventId] === undefined) {
                    newEndpoints[eventId] = '';
                }
            } else {
                // When unsubscribing, remove the key by setting its URL to empty and let the save logic handle it.
                // We keep the key if a URL exists.
                if (newEndpoints[eventId]) {
                    // Do nothing, user must clear URL manually to fully "unsubscribe" an endpoint with a URL.
                } else {
                    delete newEndpoints[eventId];
                }
            }
            return { ...prev, eventEndpoints: newEndpoints };
        });
    };

    const handleSaveSubscriptions = async () => {
        setIsSaving(true);
        
        const finalEndpoints = { ...config.eventEndpoints };

        // Validate all URLs before saving and filter out empty ones
        for (const eventId in finalEndpoints) {
            const url = finalEndpoints[eventId];
            if (url && !url.startsWith('https://')) {
                showNotification(`URL for ${eventId} must be a secure HTTPS URL.`, 'error');
                setIsSaving(false);
                return;
            }
        }
        
        try {
            // Using .set() with FieldValue.delete() and { merge: true } ensures the document is migrated
            // to the new structure and old fields are permanently removed.
            await docRef.set({
                eventEndpoints: finalEndpoints,
                endpointUrl: FieldValue.delete(),
                subscribedEvents: FieldValue.delete(),
            }, { merge: true });

            showNotification('Webhook subscriptions updated successfully!', 'success');
        } catch (error: any) {
            console.error("Error saving webhook config:", error);
            showNotification(`Failed to save subscriptions: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center p-10"><Loader className="animate-spin text-blue-500" size={32} /></div>;
    }
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Webhook size={24}/> Webhooks</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Event Catalog</h3>
                        <p className="text-gray-500 mt-1">Select events and provide a destination URL for each notification.</p>
                    </div>
                    <button onClick={handleSaveSubscriptions} disabled={isSaving} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 disabled:bg-blue-300 w-full mt-3 sm:mt-0 sm:w-auto justify-center">
                        {isSaving ? <Loader className="animate-spin" size={16}/> : <Save size={16} />} 
                        {isSaving ? 'Saving...' : 'Save Subscriptions'}
                    </button>
                </div>
                 <div className="space-y-6">
                    {AVAILABLE_EVENTS.map(category => (
                        <div key={category.category}>
                            <h4 className="font-bold text-lg text-gray-800">{category.category}</h4>
                            <div className="mt-3 space-y-3">
                                {category.events.map(event => {
                                    const isSubscribed = config.eventEndpoints?.hasOwnProperty(event.id) ?? false;
                                    const endpointUrl = config.eventEndpoints?.[event.id] || '';
                                    return (
                                        <div key={event.id} className={`p-4 border rounded-lg transition-all ${isSubscribed ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    id={event.id}
                                                    checked={isSubscribed}
                                                    onChange={(e) => handleSubscriptionChange(event.id, e.target.checked)}
                                                    className="h-5 w-5 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor={event.id} className="flex-1 cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold font-mono text-sm text-gray-700">{event.name}</span>
                                                        {isSubscribed && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Subscribed</span>}
                                                    </div>
                                                    <p className="text-sm text-gray-500">{event.description}</p>
                                                </label>
                                            </div>
                                            {isSubscribed && (
                                                 <div className="mt-3 pl-8">
                                                    <label htmlFor={`url-${event.id}`} className="text-xs font-semibold text-gray-600">Webhook URL</label>
                                                    <input
                                                        id={`url-${event.id}`}
                                                        type="url"
                                                        value={endpointUrl}
                                                        onChange={(e) => handleEndpointChange(event.id, e.target.value)}
                                                        placeholder="https://your-crm.com/webhook/..."
                                                        className="w-full p-2 mt-1 border rounded-md font-mono text-sm"
                                                    />
                                                 </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WebhookManager;