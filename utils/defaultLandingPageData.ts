import { v4 as uuidv4 } from 'uuid';
import type { LandingPageDefinition } from '../types.ts';

// This object represents the default structure and content for a new landing page,
// based on the Vastu Transformation Webinar HTML provided by the user.
export const defaultPageData: Omit<LandingPageDefinition, 'id' | 'appId' | 'appName' | 'slug' | 'createdAt' | 'updatedAt'> = {
    name: 'Vastu Webinar Landing Page',
    backgroundImageUrlOverride: '',
    // FIX: Add missing properties to match type and usage in editor
    whatsappGroupLink: '',
    facebookGroupLink: '',
    sections: [
        {
            id: uuidv4(),
            type: 'hero',
            order: 0,
            heroContent: {
                id: uuidv4(),
                topBannerText: '2-HR Vastu Transformation Webinar',
                mainHeadline: 'Master the <span class="text-accent">Ancient Science of Vedic Vastu</span> to Unlock Abundance, Health, and Prosperity',
                subHeadline: 'Discover proprietary, no-demolition Vastu techniques to immediately harmonize your space and invite transformative positive energy.',
                coachProfilePictureUrl: 'https://placehold.co/320x320/FBBF24/1e1b4b?text=DR.+VAISHALI+GUPTA',
                coachName: 'Dr. Vaishali Gupta',
                coachExperience: '20+ Years of Experience',
                coachQualifications: 'D.Sc., Ph.D. (Vedic Vastu Shastra)\nWorld\'s Most Qualified Vastu Coach',
                priceText: 'Actual Price: <s class="text-red-500">₹999</s> | You Pay: <span class="font-bold text-green-600">FREE</span>',
                webinarDescription: '-Zone-Activity Guide Chart for all\n-Free Credits to Attentive Viewers',
                webinarDescriptionTitle: 'Freebies for Webinar Attendees',
                registrationCtaTitle: 'Secure Your Spot!',
                registrationCtaSubtext: 'Hurry Up - Limited Seats Left!',
            },
        },
        {
            id: uuidv4(),
            type: 'featured_in',
            order: 1,
            featuredInLogos: [
                { id: uuidv4(), imageUrl: 'https://placehold.co/100x30/1e1b4b/ffffff?text=INDIA+TV', altText: 'India TV' },
                { id: uuidv4(), imageUrl: 'https://placehold.co/100x30/1e1b4b/ffffff?text=MH+ONE', altText: 'MH One' },
                { id: uuidv4(), imageUrl: 'https://placehold.co/100x30/1e1b4b/ffffff?text=NDTV', altText: 'NDTV' },
                { id: uuidv4(), imageUrl: 'https://placehold.co/100x30/1e1b4b/ffffff?text=ZEE+NEWS', altText: 'Zee News' },
            ],
        },
        {
            id: uuidv4(),
            type: 'benefits',
            order: 2,
            benefitsTitle: 'Why Attend This Webinar',
            benefitsItems: [
                { id: uuidv4(), icon: 'wallet', title: 'Achieve Financial Equilibrium', description: 'Determine if subtle energy blocks in your living space are undermining your professional efforts and discover corrective solutions for lasting financial flow.' },
                { id: uuidv4(), icon: 'apple', title: 'Cultivate Holistic Well-being', description: 'Understand the profound energetic connection between your home and your vitality, enabling you to shift from draining environments to restorative ones.' },
                { id: uuidv4(), icon: 'briefcase', title: 'Accelerate Professional Trajectory', description: 'Harness the directional forces within your space to support ambition, recognition, and continuous career and business advancement.' },
                { id: uuidv4(), icon: 'house', title: 'Establish Domestic Harmony', description: 'Learn to create a balanced energetic environment that naturally fosters understanding, strengthens bonds, and resolves interpersonal conflict effortlessly.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'vastu_assistant_hero',
            order: 3,
            vastuAssistantHeroContent: {
                id: uuidv4(),
                title: 'Analyze Any Floor Plan with <br> <span class="assistant-hero-title-text text-6xl">Vastu Assistant</span>',
                description: 'The revolutionary tool to automatically and accurately analyze complex layouts, directly from your browser—no AutoCAD required.',
                ctaText: 'Discover the Software',
            },
        },
        {
            id: uuidv4(),
            type: 'vastu_assistant_features',
            order: 4,
            vastuAssistantFeaturesContent: {
                id: uuidv4(),
                keyBenefitsTitle: 'Key Benefits of the <span class="text-accent">Vastu Assistant</span> Software',
                keyBenefits: [
                    { id: uuidv4(), icon: 'file-text', title: 'No AutoCAD Required', description: 'Our app is 100% AutoCAD-tested, providing accurate results without complex, specialized software installation.' },
                    { id: uuidv4(), icon: 'clock', title: 'Instant Analysis', description: 'Eliminate waiting time. Generate comprehensive Vastu analysis and reports in minutes, not days, for immediate client review.' },
                    { id: uuidv4(), icon: 'indian-rupee', title: 'Cost Efficiency', description: 'Avoid the significant expense of professional drafting fees, making high-quality Vastu analysis affordable and accessible.' },
                    { id: uuidv4(), icon: 'zap', title: 'Accurate & Efficient', description: 'Analyze any layout, regardless of complexity, with guaranteed precision for reliable Vastu correction recommendations.' },
                ],
                modulesTitle: 'Powerful Software Modules',
                modules: [
                    { id: uuidv4(), icon: 'crosshair', title: 'Mass Gravity Center', description: 'Accurately determine the true mass gravity center (Brahmasthan) of any complex floor plan with automated precision.' },
                    { id: uuidv4(), icon: 'compass', title: 'Shakti Chakra Mapping', description: 'Effortlessly overlay the 16 Vastu Zones and the Shakti Chakra onto your layout for precise directional analysis and fault identification.' },
                    { id: uuidv4(), icon: 'ruler', title: 'Fundamental Vastu Audit', description: 'Perform foundational Vastu analysis, identifying primary elemental imbalances, extensions, and cuts using easy-to-use digital tools.' },
                    { id: uuidv4(), icon: 'map-pin', title: 'Zone Analysis & Impact', description: 'Clearly visualize the Vastu zones and understand their specific influence on wealth, relationships, and health within your space.' },
                    { id: uuidv4(), icon: 'users', title: 'Devtas Marking', description: 'Identify and mark the specific locations of the presiding deities (Devtas) on your layout for targeted spiritual and energetic alignment.' },
                    { id: uuidv4(), icon: 'graduation-cap', title: 'Advanced Devtas Module', description: 'For expert practitioners, this module provides granular, precise Devtas placements to execute high-level Vastu consultations.' },
                ],
                ctaText: 'Register Now & Learn How to Use the Tool',
            },
        },
        {
            id: uuidv4(),
            type: 'text_block',
            order: 5,
            textBlockContent: {
                id: uuidv4(),
                title: 'The Energy of Your Home Is Directly Connected to Your Life',
                content: 'The **energetic resonance of your dwelling** is fundamentally linked to every aspect of your life—including your health, financial stability, and relationships.\n\nThis webinar illuminates how to diagnose subtle **energetic imbalances (Vastu Dosh)** and apply precise, **non-invasive remedies**.\n\nMove beyond the need for structural renovation and initiate powerful shifts that align your environment with your highest potential for peace and prosperity.',
                ctaButtonText: 'Register Now for FREE',
            },
        },
        {
            id: uuidv4(),
            type: 'problems',
            order: 6,
            problemsTitle: 'If You Are Facing Any Of These Problems, Your House Probably Has <span class="text-accent">Vastu Dosh</span>',
            problemsItems: [
                { id: uuidv4(), icon: 'trending-down', title: 'Financial Instability & Debt Cycle', points: ['Chronic debt and unpredictable income streams.', 'Stagnation or lack of anticipated growth in business or career.', 'Savings depletion despite diligent efforts toward financial stability.'] },
                { id: uuidv4(), icon: 'activity', title: 'Health Issues & Low Vitality', points: ['Persistent low energy or feelings of constant fatigue.', 'Recurring health problems resistant to conventional treatment.', 'Disturbed or non-restorative sleep patterns among residents.'] },
                { id: uuidv4(), icon: 'gavel', title: 'Strained Interpersonal Conflicts', points: ['Unresolved spousal disputes or strain in family relationships.', 'Unexpected delays or continuous obstacles in marriage or alliances.', 'Frequent emotional detachment or lack of harmonious bonding.'] },
                { id: uuidv4(), icon: 'skull', title: 'Professional Blocks & Anxiety', points: ['Consistent obstacles to professional or academic advancement.', 'A pervasive sense of anxiety, heaviness, or emotional turmoil.', 'Recurrent unexpected mishaps or appliance/structure malfunctions.'] },
            ],
        },
        {
            id: uuidv4(),
            type: 'delineation',
            order: 7,
            delineationContent: {
                id: uuidv4(),
                type: 'delineation',
                mainHeadline: 'The Delineation: Authentic Vedic Vastu vs. <span class="text-accent">Unreliable Hybrid Systems</span>',
                subHeadline: 'We will demonstrate why mixing core Vastu principles with non-Vedic concepts creates an ineffective and often conflicting energetic system.',
                points: [
                    { id: uuidv4(), title: 'Authentic Vedic Foundation', description: 'Vastu is based on **śāstric wisdom** passed down through 18 Maharishis, aligning a space with precise cosmic forces.' },
                    { id: uuidv4(), title: 'Mitigating Hybrid Confusion', description: 'Avoid diluted, incompatible \'Hybrid Vastu\' practices that often introduce energetic conflicts and prevent genuine, lasting results.' },
                    { id: uuidv4(), title: 'Holistic, Systemic Solutions', description: 'Focus on a comprehensive, systemic approach to energy correction, prioritizing foundational alignment over random, superficial directional fixes.' },
                ]
            },
        },
        {
            id: uuidv4(),
            type: 'what_you_learn',
            order: 8,
            whatYouLearnTitle: 'What You Will <span class="text-accent">Learn</span>',
            whatYouLearnItems: [
                { id: uuidv4(), icon: 'pin', description: 'A deep dive into the **Fundamental Principles of Vedic Vastu** and its deterministic influence on personal destiny and life cycles.' },
                { id: uuidv4(), icon: 'infinity', description: 'The systematic correlation between the energy zones of your residence and key life areas: wealth generation, physical health, and harmonious relationships.' },
                { id: uuidv4(), icon: 'square-x', description: 'Methodologies for **Pinpointing Undetected Vastu Doshas** (Energetic Fault Lines) currently contributing to stagnation and stress.' },
                { id: uuidv4(), icon: 'bag-dollar', description: 'Practical implementation strategies to render your residential or commercial space Vastu-compliant, thereby maximizing prosperity and tranquility.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'audience',
            order: 9,
            audienceTitle: 'Who Must Attend This Webinar: Professional Audience Segments',
            audienceItems: [
                { id: uuidv4(), description: '<strong>Energetic Correction Seekers:</strong> Individuals seeking to resolve persistent financial instability, health challenges, or domestic stress through precise energetic correction.' },
                { id: uuidv4(), description: '<strong>Property Investors & Home Buyers:</strong> Prospective homeowners or tenants requiring due diligence and application of Vastu compliance before property acquisition.' },
                { id: uuidv4(), description: '<strong>Business Leaders & Entrepreneurs:</strong> Those aiming to enhance commercial opportunities by optimizing the energetic flow of their office, storefront, or industrial space.' },
                { id: uuidv4(), description: '<strong>Design Professionals:</strong> Architects, Interior Designers, and Real Estate Builders looking to integrate high-level Vedic Vastu principles into modern project execution.' },
                { id: uuidv4(), description: '<strong>Aspiring Vastu Consultants:</strong> Individuals seeking a path to professional expertise and financial independence by developing authentic Vastu consultation skills.' },
                { id: uuidv4(), description: '<strong>Occult Practitioners & Healers:</strong> Existing Astrologers, Numerologists, or Energy Healers who wish to significantly expand their service portfolio with authentic Vastu solutions.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'about_coach',
            order: 10,
            aboutCoachTitle: 'Why Train with <span class="text-accent">Your Coach</span>',
            aboutCoachAchievements: [
                { id: uuidv4(), text: '<strong class="font-semibold">Two Decades of Mastery:</strong> 20+ years of verifiable expertise in Vastu, encompassing over 10,000 successful projects worldwide.' },
                { id: uuidv4(), text: 'Holds the highest academic honors: a Ph.D. and the prestigious <strong class="font-semibold">Doctor of Science (D.Sc.)</strong> in Vedic Vastu Shastra.' },
                { id: uuidv4(), text: 'The D.Sc. designation confirms recognition for exceptional, sustained contributions, establishing her as a pioneer in the field of authentic Vastu science.' },
                { id: uuidv4(), text: 'A recipient of the Brilliant Speaker’s Award, recognized for profound conceptual understanding and exceptional clarity in communication.' },
                { id: uuidv4(), text: 'A dedicated leader who seamlessly blends academic rigor with practical, heart-centered care for impactful life transformations.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'faq',
            order: 11,
            faqTitle: 'Frequently Asked Questions',
            faqItems: [
                { id: uuidv4(), question: 'I don’t know where to start my Vastu journey.', answer: 'This 2-hour webinar is the perfect entry point. You will acquire the fundamental, important concepts of Vedic Vastu delivered in an easy and simple manner, establishing a strong and reliable foundation.' },
                { id: uuidv4(), question: 'I reside in a rented property. Is this content still relevant?', answer: 'Absolutely. The principles taught are effective for rented apartments, villas, offices, and commercial projects. They focus on precise energetic and placement shifts, eliminating the need for massive structural renovations.' },
                { id: uuidv4(), question: 'Is there a financial investment required to attend?', answer: 'No, the webinar is entirely <strong class="text-accent">FREE of cost</strong>. We are committed to making this transformative knowledge accessible to all who seek personal and professional enhancement.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'social_connect',
            order: 12,
            socialConnectContent: {
                id: uuidv4(),
                title: 'Join Our Community',
                whatsappGroupLink: '',
                facebookGroupLink: ''
            }
        }
    ]
};