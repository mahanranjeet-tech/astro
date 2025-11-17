
import React from 'react';
import type { AppDefinition } from '../../types.ts';
import { PlayCircle } from 'lucide-react';
import { getYoutubeVideoId } from '../../utils/url.ts';
import AppIcon from '../shared/AppIcon.tsx';

interface TrainingVideosSectionProps {
    apps: AppDefinition[];
    onWatchVideo: (url: string) => void;
}

const TrainingVideosSection: React.FC<TrainingVideosSectionProps> = ({ apps, onWatchVideo }) => {
    
    // Filter apps to only include those with valid training videos
    const appsWithVideos = apps.map(app => ({
        ...app,
        trainingVideos: (app.trainingVideos || []).filter(v => v.name && v.url && getYoutubeVideoId(v.url))
    })).filter(app => app.trainingVideos.length > 0);


    if (appsWithVideos.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
                <PlayCircle size={64} className="mb-4 text-blue-400" />
                <h3 className="text-2xl font-semibold">No Training Videos Available</h3>
                <p className="mt-2">No training videos have been added for your apps yet.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-y-auto">
            {/* Section Header */}
            <div className="mb-6 flex-shrink-0">
                <h3 className="text-2xl font-bold text-gray-800">Training & Walkthroughs</h3>
                <p className="mt-1 text-gray-500">Watch tutorials for your assigned applications.</p>
            </div>
            
            {/* App Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {appsWithVideos.map(app => (
                    <div key={app.id} className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
                        {/* Card Header */}
                        <div className="p-4 border-b flex items-center gap-3 bg-gray-50/50">
                            <AppIcon icon={app.icon} name={app.name} className="h-8 w-8 rounded-md flex-shrink-0" />
                            <h4 className="font-bold text-gray-800 text-lg">{app.name}</h4>
                        </div>
                        
                        {/* Video List */}
                        <div className="p-2 space-y-1 flex-grow">
                            {app.trainingVideos.map((video, index) => {
                                const videoId = getYoutubeVideoId(video.url);
                                if (!videoId) return null;
                                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                
                                return (
                                    <button 
                                        key={index}
                                        onClick={() => onWatchVideo(video.url)}
                                        className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 transition-colors group"
                                    >
                                        <div className="w-24 flex-shrink-0">
                                            <img 
                                                src={thumbnailUrl} 
                                                alt={video.name}
                                                className="w-full aspect-video rounded-md object-cover border"
                                            />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm font-semibold text-gray-700 leading-tight line-clamp-2">{video.name}</p>
                                        </div>
                                        <PlayCircle size={24} className="text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TrainingVideosSection;
