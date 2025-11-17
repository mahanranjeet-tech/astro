export const isUrl = (str: string): boolean => {
    if (!str) return false;
    // Check for http(s) protocols or data URIs
    return str.startsWith('http') || str.startsWith('data:');
};

/**
 * Extracts the YouTube video ID from various URL formats.
 * @param url The YouTube URL.
 * @returns The video ID or null if not found.
 */
export const getYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    let videoId = null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        }
        
        // Regex to match video ID in path for URLs like /embed/VIDEO_ID or /shorts/VIDEO_ID
        if (!videoId) {
            const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match && match[1]) {
                videoId = match[1];
            }
        }
    } catch (e) {
        console.error("Invalid video URL provided for parsing:", url);
        return null;
    }
    return videoId;
};