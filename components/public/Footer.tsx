

import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase.ts';
import { Facebook, Instagram, Youtube, Twitter as XIcon, Linkedin } from 'lucide-react';

interface SocialLink {
    url?: string;
    iconUrl?: string;
}

interface SocialLinks {
    facebook?: SocialLink;
    instagram?: SocialLink;
    youtube?: SocialLink;
    x?: SocialLink;
    linkedin?: SocialLink;
}

const Footer: React.FC = () => {
    const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

    useEffect(() => {
        const fetchLinks = async () => {
            try {
                const docRef = db.collection('site_content').doc('social_links');
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    setSocialLinks(docSnap.data() as SocialLinks);
                }
            } catch (error) {
                console.error("Could not fetch social links:", error);
            }
        };
        fetchLinks();
    }, []);

    const hasSocialLinks = Object.values(socialLinks).some(link => !!link?.url);

    return (
        <footer className="w-full bg-gray-800 text-gray-300 py-4 mt-auto flex-shrink-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Centered page links */}
                <div className="flex flex-wrap justify-center items-center text-sm gap-x-6 gap-y-2">
                    <a href="/about" className="hover:text-white transition-colors">About Us</a>
                    <a href="/blog" className="hover:text-white transition-colors">Blog</a>
                    <a href="/contact" className="hover:text-white transition-colors">Contact Us</a>
                    <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
                    <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                    <a href="/terms" className="hover:text-white transition-colors">Terms & Conditions</a>
                    <a href="/refund" className="hover:text-white transition-colors">Cancellation/Refund</a>
                </div>
                
                {/* Bottom line with copyright and social icons */}
                <div className="border-t border-gray-700 mt-4 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="hidden sm:flex sm:flex-1"></div> {/* Spacer for left side */}
                    <p className="flex-shrink-0 text-center text-xs text-gray-500 order-2 sm:order-1">
                        © {new Date().getFullYear()} Powerful Tools by Acharya Preeti Sharma. All rights reserved.
                    </p>
                    <div className="flex sm:flex-1 justify-center sm:justify-end order-1 sm:order-2">
                         {hasSocialLinks && (
                            <div className="flex items-center gap-4">
                                {socialLinks.facebook?.url && <a href={socialLinks.facebook.url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-blue-500 hover:text-white transition-colors"><Facebook size={16} /></a>}
                                {socialLinks.instagram?.url && <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-pink-500 hover:text-white transition-colors"><Instagram size={16} /></a>}
                                {socialLinks.youtube?.url && <a href={socialLinks.youtube.url} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-red-500 hover:text-white transition-colors"><Youtube size={16} /></a>}
                                {socialLinks.x?.url && <a href={socialLinks.x.url} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-gray-300 hover:text-white transition-colors"><XIcon size={16} /></a>}
                                {socialLinks.linkedin?.url && <a href={socialLinks.linkedin.url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-blue-400 hover:text-white transition-colors"><Linkedin size={16} /></a>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;