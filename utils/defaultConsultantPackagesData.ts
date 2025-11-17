
import { v4 as uuidv4 } from 'uuid';

export const defaultPackagesData = [
    {
        name: "Foundational Vastu Check",
        description: "Ideal for addressing single, immediate concerns.",
        price: 1500000, // 15,000 INR in paise
        priceText: "",
        isPopular: false,
        order: 0,
        durationInMinutes: 60,
        ctaText: "Select Foundational",
        features: [
            { id: uuidv4(), text: "Floor Plan Analysis (1 zone focus)", type: "included" },
            { id: uuidv4(), text: "60-Min 1:1 Video Consultation", type: "included" },
            { id: uuidv4(), text: "3 Core, Non-Demolition Remedies", type: "included" },
            { id: uuidv4(), text: "Detailed Energy Map Report", type: "excluded" },
            { id: uuidv4(), text: "3 Months Post-Consultation Support", type: "excluded" },
        ],
    },
    {
        name: "Comprehensive Alignment",
        description: "The definitive solution for total home and life balance.",
        price: 4500000, // 45,000 INR in paise
        priceText: "",
        isPopular: true,
        order: 1,
        durationInMinutes: 90,
        ctaText: "Select Comprehensive",
        features: [
            { id: uuidv4(), text: "**Full Property Vastu Audit (All Zones)**", type: "premium" },
            { id: uuidv4(), text: "90-Min In-Depth 1:1 Session", type: "premium" },
            { id: uuidv4(), text: "Custom Non-Demolition Remedial Plan", type: "premium" },
            { id: uuidv4(), text: "Detailed Energy Map Report", type: "included" },
            { id: uuidv4(), text: "**3 Months Post-Consultation Support**", type: "included" },
        ],
    },
    {
        name: "Enterprise & Annual Vastu",
        description: "For business spaces or long-term, continuous support.",
        price: 0,
        priceText: "Contact for Price",
        isPopular: false,
        order: 2,
        durationInMinutes: 120,
        ctaText: "Inquire Now",
        features: [
            { id: uuidv4(), text: "Commercial/Industrial Vastu Audit", type: "included" },
            { id: uuidv4(), text: "Dedicated Project Consultation", type: "included" },
            { id: uuidv4(), text: "Advanced Branding & Directional Advice", type: "included" },
            { id: uuidv4(), text: "Detailed Energy Map Report", type: "premium" },
            { id: uuidv4(), text: "**12 Months Quarterly Review Support**", type: "premium" },
        ],
    }
];