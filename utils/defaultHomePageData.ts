import { v4 as uuidv4 } from 'uuid';
import type { HomePageDefinition } from '../types.ts';

export const defaultHomePageData: HomePageDefinition = {
    id: 'homepage',
    metaTitle: 'Powerful Tools - Vastu and Numerology Analysis Software',
    metaDescription: 'Harness the precision of technology to unlock and apply ancient wisdom in Vastu, Numerology, and beyond. Instant analysis, profound insights.',
    featuredImageUrl: '',
    sections: [
        {
            id: uuidv4(),
            type: 'hero',
            enabled: true,
            title: 'Powerful Tools for <span class="text-accent">Vedic Science Mastery</span>',
            subtitle: 'Harness the precision of technology to unlock and apply ancient wisdom in Vastu, Numerology, and beyond. Instant analysis, profound insights.',
            ctaText: 'Explore All Applications',
            ctaLink: '#applications',
        },
        {
            id: uuidv4(),
            type: 'expert',
            enabled: true,
            title: 'The Expert Behind <span class="text-accent">Powerful Tools</span>',
            imageUrl: 'https://placehold.co/300x300/FBBF24/1e1b4b?text=DR.+VAISHALI+GUPTA',
            name: 'Dr. Vaishali Gupta',
            role: 'Founder & Chief Vastu Scientist',
            qualifications: 'D.Sc., Ph.D. (Vedic Vastu Shastra)',
            subheading: 'Visionary & Thought Leader in Vedic Sciences',
            achievements: [
                { id: uuidv4(), text: '<strong class="font-semibold">Two Decades of Mastery:</strong> 20+ years of verifiable expertise in Vastu, encompassing over 10,000 successful projects worldwide.' },
                { id: uuidv4(), text: 'Holds the highest academic honors: a Ph.D. and the prestigious <strong class="font-semibold">Doctor of Science (D.Sc.)</strong> in Vedic Vastu Shastra.' },
                { id: uuidv4(), text: 'The D.Sc. designation confirms sustained contributions, establishing her as a pioneer in the field of authentic Vastu science.' },
            ]
        },
        {
            id: uuidv4(),
            type: 'app_showcase_title',
            enabled: true,
            title: 'Our Core <span class="text-accent">Digital Applications</span>'
        },
        {
            id: uuidv4(),
            type: 'app_item',
            enabled: true,
            appId: '', // Admin should select this
            customTitle: 'Vastu Assistant: Floor Plan Analyzer',
            customDescription: 'The revolutionary tool for **Vastu consultants, architects, and homeowners** to automatically and accurately analyze complex layouts. Instantly determine directional alignments, zonal impacts, and Mass Gravity Center.',
            customFeatures: [
                { id: uuidv4(), icon: 'crosshair', title: 'Mass Gravity Center:', description: 'Automated precision for complex floor plans.' },
                { id: uuidv4(), icon: 'compass', title: 'Shakti Chakra Mapping:', description: 'Effortlessly overlay the 16 Vastu Zones.' },
                { id: uuidv4(), icon: 'ruler', title: 'No AutoCAD Required:', description: 'Get professional, reliable results directly in your browser.' },
            ],
            customCtaText: 'Learn More about Vastu Assistant',
            customCtaLink: '#',
            imageOverrideUrls: ['svg'], // Special keyword for the Vastu SVG
            layout: 'image_left',
            imageCarouselSpeed: 1000,
        },
        {
            id: uuidv4(),
            type: 'app_item',
            enabled: true,
            appId: '', // Admin should select this
            customTitle: 'Personalized Numerology Profile',
            customDescription: 'Uncover the profound influence of your date, time, and place of birth on your destiny. Our Numerology Analysis tool generates a detailed, customized profile in mere seconds.',
            customFeatures: [
                { id: uuidv4(), icon: 'user-plus', title: 'Instant Calculation:', description: 'Profile generated from Name, DOB, Time, and Place of Birth.' },
                { id: uuidv4(), icon: 'infinity', title: 'Core Numbers:', description: 'Discover your Life Path, Destiny, and Soul Urge Numbers.' },
                { id: uuidv4(), icon: 'eye', title: 'Destiny Insights:', description: 'Clear, actionable insights into personality, career, and relationships.' },
            ],
            customCtaText: 'Get Your Numerology Report',
            customCtaLink: '#',
            imageOverrideUrls: ['https://placehold.co/400x300/FBBF24/1e1b4b?text=NUMEROLOGY+ANALYSIS+SCREEN'],
            layout: 'image_right',
            imageCarouselSpeed: 1000,
        },
        {
            id: uuidv4(),
            type: 'app_item',
            enabled: true,
            appId: '', // Admin should select this
            customTitle: 'Mobile Number Compatibility Check',
            customDescription: "Your mobile number's energy significantly impacts your financial and professional life. Use our specialized tool to check the **compatibility** of your number with your personal numerological profile and profession.",
            customFeatures: [
                { id: uuidv4(), icon: 'smartphone', title: 'Instant Compatibility:', description: "Analyze your mobile number's alignment with your name and DOB." },
                { id: uuidv4(), icon: 'briefcase', title: 'Career Focus:', description: 'See if your number supports your specific profession and goals.' },
                { id: uuidv4(), icon: 'percent-square', title: 'Detailed Report:', description: 'Receive a comprehensive numerological report in seconds.' },
            ],
            customCtaText: 'Analyze Your Mobile Number',
            customCtaLink: '#',
            imageOverrideUrls: ['https://placehold.co/400x300/1e1b4b/FBBF24?text=MOBILE+NUMEROLOGY+SCREEN'],
            layout: 'image_left',
            imageCarouselSpeed: 1000,
        },
        {
            id: uuidv4(),
            type: 'stats',
            enabled: true,
            title: 'Our Impact in Numbers',
            metrics: [
                { id: uuidv4(), value: '50K+', label: 'Happy Clients Served' },
                { id: uuidv4(), value: '100K+', label: 'Total Reports Generated' },
                { id: uuidv4(), value: '40K+', label: 'Vastu Assistant Reports' },
                { id: uuidv4(), value: '30K+', label: 'Numerology Profiles' },
            ]
        },
        {
            id: uuidv4(),
            type: 'upcoming_apps',
            enabled: true,
            title: 'Future <span class="text-accent">Innovations</span>',
            subtitle: 'We are continuously expanding our suite of tools to provide even deeper insights into Vedic Sciences.',
            apps: [
                { id: uuidv4(), icon: 'star', title: 'Advanced Astrology Charting', description: 'Detailed astrological readings combined with Vastu correlation.' },
                { id: uuidv4(), icon: 'hand-heart', title: 'Relationship Compatibility Matrix', description: "Analyzing partner's Vastu and Numerology for harmony prediction." },
                { id: uuidv4(), icon: 'gem', title: 'Gemstone Recommendation Tool', description: 'Personalized stone selection based on birth charts and Vastu needs.' },
            ]
        },
        {
            id: uuidv4(),
            type: 'video_testimonials',
            enabled: true,
            title: 'Client <span class="text-accent">Video Testimonials</span>',
            testimonialIds: [] // Admin needs to select these
        },
        {
            id: uuidv4(),
            type: 'text_reviews',
            enabled: true,
            title: 'What Our Clients Say',
            reviewIds: [] // Admin needs to select these
        },
        {
            id: uuidv4(),
            type: 'blog',
            enabled: true,
            title: 'Insights from Our <span class="text-accent">Expert Blog</span>',
            postIds: [] // Admin needs to select these
        }
    ]
};