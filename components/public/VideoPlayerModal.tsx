
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getYoutubeVideoId } from '../../utils/url.ts';

const VideoPlayerModal = ({ videoUrl, onClose }: { videoUrl: string, onClose: () => void }) => {
    const [isVisible, setIsVisible] = useState(false);
    const videoId = getYoutubeVideoId(videoUrl);

    useEffect(() => {
        setIsVisible(true);
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);
    
    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade-out transition
    };

    if (!videoId) {
        // This case should ideally not be hit if the URL is validated before calling this component
        console.error("Could not render video player: Invalid YouTube URL provided.");
        return null;
    }
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

    return (
        <div 
            className={`fixed inset-0 bg-black z-[100] flex justify-center items-center p-4 transition-all duration-300 ease-in-out ${isVisible ? 'bg-opacity-70' : 'bg-opacity-0'}`}
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className={`relative w-full max-w-4xl bg-black rounded-lg shadow-2xl overflow-hidden transition-transform duration-300 ease-in-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                style={{ aspectRatio: '16 / 9' }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the video
            >
                <button 
                    onClick={handleClose} 
                    className="absolute -top-2 -right-2 z-20 p-1.5 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Close video player"
                >
                    <X size={24} />
                </button>
                <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={embedUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

export default VideoPlayerModal;
