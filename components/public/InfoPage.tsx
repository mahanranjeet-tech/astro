
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase.ts';
import PublicPageLayout from './PublicPageLayout.tsx';
import InitialLoadingScreen from '../shared/InitialLoadingScreen.tsx';
import { Mail, Phone, MapPin, Info, Shield, FileText, RefreshCcw, Truck } from 'lucide-react';

interface InfoPageProps {
    pageKey: 'about' | 'contact' | 'privacy' | 'terms' | 'refund' | 'shipping';
    title: string;
}

const pageIcons = {
    about: <Info size={28} />,
    contact: <Phone size={28} />,
    privacy: <Shield size={28} />,
    terms: <FileText size={28} />,
    refund: <RefreshCcw size={28} />,
    shipping: <Truck size={28} />,
};

const InfoPage: React.FC<InfoPageProps> = ({ pageKey, title }) => {
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                const docRef = db.collection('site_content').doc('live');
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    const allContent = docSnap.data();
                    if (allContent && allContent[pageKey]) {
                        setContent(allContent[pageKey]);
                    } else {
                         setContent({ content: 'Content for this page has not been configured yet.' });
                    }
                } else {
                    setContent({ content: 'Content for this page has not been configured yet.' });
                }
            } catch (error: any) {
                if (error.code === 'unavailable') {
                    console.warn("Could not fetch page content while offline:", error.message);
                    setContent({ content: 'This content is not available offline. Please connect to the internet to view it.' });
                } else {
                    console.error("Error fetching page content:", error);
                    setContent({ content: 'Could not load content due to an error.' });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [pageKey]);

    if (loading) {
        return <InitialLoadingScreen />;
    }

    const renderContent = () => {
        if (!content) {
            return <p>Content not available.</p>;
        }

        if (pageKey === 'contact') {
            const hasAnyContactInfo = content.email || content.phone || content.address;
            return (
                 <div className="space-y-8">
                    <p className="text-lg text-slate-600">Have questions? We'd love to hear from you. Reach out to us through any of the methods below.</p>
                     {hasAnyContactInfo ? (
                        <div className="space-y-6 pt-8 border-t border-slate-200">
                             <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
                                {content.email && (
                                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-white transition-all duration-300">
                                        <div className="flex items-center gap-4 mb-3">
                                            <Mail className="h-8 w-8 text-blue-500 flex-shrink-0"/>
                                            <h3 className="text-xl font-semibold text-slate-800">Email Us</h3>
                                        </div>
                                        <a href={`mailto:${content.email}`} className="text-blue-600 hover:underline break-all text-lg">{content.email}</a>
                                    </div>
                                )}
                                {content.phone && (
                                     <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-white transition-all duration-300">
                                        <div className="flex items-center gap-4 mb-3">
                                            <Phone className="h-8 w-8 text-blue-500 flex-shrink-0"/>
                                            <h3 className="text-xl font-semibold text-slate-800">Call Us</h3>
                                        </div>
                                        <a href={`tel:${content.phone}`} className="text-slate-700 hover:text-blue-600 text-lg">{content.phone}</a>
                                    </div>
                                )}
                            </div>
                            {content.address && (
                                 <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-white transition-all duration-300">
                                     <div className="flex items-center gap-4 mb-3">
                                         <MapPin className="h-8 w-8 text-blue-500 flex-shrink-0"/>
                                         <h3 className="text-xl font-semibold text-slate-800">Visit Us</h3>
                                     </div>
                                     <p className="text-slate-700 whitespace-pre-line text-lg">{content.address}</p>
                                 </div>
                            )}
                        </div>
                     ) : (
                        <p className="text-center text-slate-500 pt-8 border-t border-slate-200">Contact information has not been configured yet.</p>
                     )}
                </div>
            );
        }

        return (
            <div 
                className="prose prose-lg max-w-none text-slate-700 prose-headings:text-slate-900 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-strong:text-slate-800"
                style={{ whiteSpace: 'pre-wrap' }}
            >
                {content.content}
            </div>
        );
    };

    return (
        <PublicPageLayout title={title} icon={pageIcons[pageKey]}>
            {renderContent()}
        </PublicPageLayout>
    );
};

export default InfoPage;
