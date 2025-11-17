import type { ConsultantPageDefinition } from '../types.ts';
import { v4 as uuidv4 } from 'uuid';

export const defaultPageData: ConsultantPageDefinition = {
    id: '', // Will be set to consultantId
    consultantId: '',
    brandName: 'VastuHub Consulting',
    footerDisclaimer: 'Disclaimer: Results may vary. Vastu is an ancient science and should be used as a supplementary tool for life improvement.',
    updatedAt: new Date(),
    // FIX: Add missing properties
    whatsappGroupLink: '',
    facebookGroupLink: '',
    sections: [
        {
            id: uuidv4(),
            type: 'hero',
            order: 0,
            heroContent: {
                id: uuidv4(),
                type: 'hero',
                topBannerText: 'Personalized Vedic Vastu Consulting',
                mainHeadline: 'Achieve <span class="text-accent">Total Life Alignment</span> through Expert, Scientific Vastu Correction',
                subHeadline: 'Receive customized, non-demolition solutions tailored to your specific life challenges, delivered by the World\'s Most Qualified Vastu Coach.',
                processSteps: [
                    { id: uuidv4(), title: '1. Data Submission & Audit', description: 'You provide your floor plan and personal details for an initial energetic diagnosis.' },
                    { id: uuidv4(), title: '2. Personalized Consultation', description: 'A dedicated 1:1 session to discuss your specific challenges and review the Vastu findings.' },
                    { id: uuidv4(), title: '3. Remedial Action Plan', description: 'You receive a detailed, non-demolition action plan with customized solutions for immediate application.' },
                ],
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
            type: 'packages',
            order: 2,
            packagesTitle: 'Select Your <span class="text-accent">Vastu Transformation Package</span>',
            packagesSubTitle: 'Choose the level of support that best aligns with your needs, whether you are seeking a foundational check or a comprehensive, year-long energetic alignment.',
        },
        {
            id: uuidv4(),
            type: 'benefits',
            order: 3,
            benefitsTitle: 'What You Gain From A <span class="text-accent">Consultation</span>',
            benefitsItems: [
                { id: uuidv4(), icon: 'wallet', title: 'Achieve Financial Equilibrium', description: 'Determine if subtle energy blocks in your living space are undermining your professional efforts and discover corrective solutions for lasting financial flow.' },
                { id: uuidv4(), icon: 'apple', title: 'Cultivate Holistic Well-being', description: 'Understand the profound energetic connection between your home and your vitality, enabling you to shift from draining environments to restorative ones.' },
                { id: uuidv4(), icon: 'briefcase', title: 'Accelerate Professional Trajectory', description: 'Harness the directional forces within your space to support ambition, recognition, and continuous career and business advancement.' },
                { id: uuidv4(), icon: 'house', title: 'Establish Domestic Harmony', description: 'Learn to create a balanced energetic environment that naturally fosters understanding, strengthens bonds, and resolves interpersonal conflict effortlessly.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'problems',
            order: 4,
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
            order: 5,
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
            type: 'deliverables',
            order: 6,
            deliverablesTitle: 'What The Consultation <span class="text-accent">Delivers</span>',
            deliverablesItems: [
                { id: uuidv4(), icon: 'pin', description: 'A **Customized Vastu Blueprint** derived from a deep analysis of your property\'s energy map and your life objectives.' },
                { id: uuidv4(), icon: 'infinity', description: 'Clear identification of the energy zones impacting your finances, health, and relationships, providing a root-cause diagnosis.' },
                { id: uuidv4(), icon: 'square-x', description: 'Detailed, non-invasive **Remedial Action Strategies**—no major construction required—for immediate stress and stagnation relief.' },
                { id: uuidv4(), icon: 'bag-dollar', description: 'A path to **Maximizing Prosperity and Tranquility** by harmonizing your space to align with universal principles of abundance.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'audience',
            order: 7,
            audienceTitle: 'Who Should Invest in This Consultancy: Professional Audience Segments',
            audienceItems: [
                { id: uuidv4(), description: '<strong>Energetic Correction Seekers:</strong> Individuals seeking to resolve persistent financial instability, health challenges, or domestic stress through precise energetic correction.' },
                { id: uuidv4(), description: '<strong>Property Investors & Home Buyers:</strong> Prospective homeowners or tenants requiring due diligence and application of Vastu compliance before property acquisition.' },
                { id: uuidv4(), description: '<strong>Business Leaders & Entrepreneurs:</strong> Those aiming to enhance commercial opportunities by optimizing the energetic flow of their office, storefront, or industrial space.' },
                { id: uuidv4(), description: '<strong>Design Professionals:</strong> Architects, Interior Designers, and Real Estate Builders looking to integrate high-level Vedic Vastu principles into modern project execution.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'about_coach',
            order: 8,
            aboutCoachTitle: 'Why Train with <span class="text-accent">Your Coach</span>',
        },
        {
            id: uuidv4(),
            type: 'faq',
            order: 9,
            faqTitle: 'Frequently Asked Questions',
            faqItems: [
                { id: uuidv4(), question: 'What materials do I need to prepare before the consultation?', answer: 'We require a detailed, scaled floor plan (digital preferred) of the property to be analyzed, along with the precise address and birth details of the primary occupants for a personalized energetic reading.' },
                { id: uuidv4(), question: 'I reside in a rented property. Are the remedies permanent?', answer: 'Our solutions focus on precise energetic and placement shifts, eliminating the need for structural renovations. These non-demolition remedies are effective and applicable to rented homes, offices, and commercial spaces.' },
                { id: uuidv4(), question: 'How quickly can I expect to see results?', answer: 'While the depth of transformation varies by individual and commitment to the remedial plan, many clients report a distinct shift in emotional clarity and financial flow within **7 to 21 days** of implementation.' },
            ],
        },
        {
            id: uuidv4(),
            type: 'social_connect',
            order: 10,
            socialConnectContent: {
                id: uuidv4(),
                title: 'Join Our Community',
                whatsappGroupLink: '',
                facebookGroupLink: ''
            }
        }
    ]
};