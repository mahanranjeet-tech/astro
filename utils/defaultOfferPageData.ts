import { v4 as uuidv4 } from 'uuid';
import type { OfferPageDefinition } from '../types.ts';

export const defaultOfferPageData: OfferPageDefinition = {
    id: '',
    metaTitle: 'Exclusive Vastu Webinar Offers',
    metaDescription: 'The Future of Vastu Consultancy is Here. Exclusive Offers for Our Webinar Attendees.',
    sections: [
        {
            id: uuidv4(),
            type: 'intro',
            order: 0,
            enabled: true,
            introContent: {
                mainHeadline: 'Ab Har Ghar Hoga Vastu Auspicious',
                subHeadline: 'The Future of Vastu Consultancy is Here. Exclusive Offers for Our Webinar Attendees.',
                scrollButtonText: 'Scroll Down to Unlock Your Exclusive Deals!',
            }
        },
        {
            id: uuidv4(),
            type: 'challenge',
            order: 1,
            enabled: true,
            challengeContent: {
                title: 'The Current Challenge vs. The Vastu Assistant Solution',
                description: 'Manual calculations, slow reports, and limited reach are holding back your true income potential. We solve this by giving you the ultimate tool.',
                callouts: [
                    { id: uuidv4(), icon: '⏱️', title: 'TIME', description: 'Generate Reports in <span class="text-red-600 font-extrabold">Minutes</span>, not days.' },
                    { id: uuidv4(), icon: '💰', title: 'INCOME', description: 'Unlock Multiple <span class="text-green-600 font-extrabold">Revenue Streams</span>.' },
                    { id: uuidv4(), icon: '⭐', title: 'AUTHORITY', description: 'Deliver <span class="text-[#004AAD] font-extrabold">Professional Grade</span> Reports.' }
                ]
            }
        },
        {
            id: uuidv4(),
            type: 'offer_card',
            order: 2,
            enabled: true,
            offerContent: {
                id: 'basic',
                title: 'Offer #1: Vastu Assistant Basic',
                description: 'The perfect entry point to experience Vastu Assistant. Get 5 credits to perform basic Vastu analysis for your own house or one client.',
                creditsText: '5 Credits',
                price: 9900,
                priceSubtitle: 'One-Time Fee',
                features: [
                    { id: uuidv4(), text: '<span class="font-bold">5 Credits-</span> for Vastu Assistant' },
                    { id: uuidv4(), text: '<span class="font-bold">Basic Vastu Scan & Analysis</span> (Ideal for personal use).' },
                    { id: uuidv4(), text: 'Instant, Simple Recommendations & Reports.' }
                ],
                buttonText: 'Get Basic Access',
                mainAppTierId: 'basic-5-credits-99', // Example ID, admin should map this
            }
        },
        {
            id: uuidv4(),
            type: 'offer_card',
            order: 3,
            enabled: true,
            offerContent: {
                id: 'pro',
                title: 'Offer #2: Vastu Assistant Business Pro',
                description: 'Designed for professionals managing a high volume of clients. Massive credit bundle paired with premium business tools.',
                price: 1359900,
                originalPrice: 1999900,
                priceSubtitle: 'Save ₹6,400 Instantly!',
                features: [
                    { id: uuidv4(), text: '<span class="font-bold">Vastu Assistant - 2000 Credits</span>' },
                    { id: uuidv4(), text: '<span class="font-bold">25% Affiliate Commission for Lifetime</span>', valueText: 'Normal Rate: 10-15%' },
                    { id: uuidv4(), text: '<span class="font-bold">Canva Pro Subscription for Lifetime</span>', valueText: 'Worth ₹4,000 / Year' },
                    { id: uuidv4(), text: '<span class="font-bold">Access to VIP Groups</span> - FaceBook & WhatsApp.' }
                ],
                addons: [
                    { id: uuidv4(), key: 'course', title: 'Mobile Numerology Course', originalPrice: 110000, offerPrice: 49900 },
                    { id: uuidv4(), key: 'app', title: 'Mobile Numerology App Unlimited Credits', originalPrice: 599900, offerPrice: 259900 }
                ],
                buttonText: 'Go Pro Now',
                mainAppTierId: 'pro-2000-credits-13599', // Example ID
                addonAppTierIds: {
                    course: 'addon-num-course-499', // Example ID
                    app: 'addon-num-app-2599' // Example ID
                }
            }
        },
        {
            id: uuidv4(),
            type: 'offer_card',
            order: 4,
            enabled: true,
            offerContent: {
                id: 'unlimited',
                title: 'Offer #3: Vastu Assistant Unlimited',
                description: 'For Vastu consultants who want a Lifetime Assistant who can do the hard and precise work for them and generate professional-grade reports.',
                price: 2100000,
                originalPrice: 3100000,
                priceSubtitle: 'Save ₹10,000 Instantly!',
                isBestValue: true,
                features: [
                    { id: uuidv4(), text: '<span class="font-bold">Vastu Assistant: - Unlimited Credits</span>' },
                    { id: uuidv4(), text: '<span class="font-bold">Personalized Consultant Page</span>', valueText: 'Worth ₹12,000 / Year' },
                    { id: uuidv4(), text: '<span class="font-bold">Numerology Analysis Software: - 100 Credits</span>', valueText: 'Reports Value: ₹1,10,000' },
                    { id: uuidv4(), text: '<span class="font-bold">35% Lifetime Best Affiliate Commission</span>', valueText: 'Normal Rate: 10-15%' },
                    { id: uuidv4(), text: '<span class="font-bold">Canva Pro Subscription for Lifetime</span>', valueText: 'Worth ₹4,000 / Year' },
                    { id: uuidv4(), text: '<span class="font-bold">Access to VIP Groups</span> - FaceBook & WhatsApp.' }
                ],
                addons: [
                    { id: uuidv4(), key: 'course', title: 'Mobile Numerology Course', originalPrice: 110000, offerPrice: 49900 },
                    { id: uuidv4(), key: 'app', title: 'Mobile Numerology App Unlimited Credits', originalPrice: 599900, offerPrice: 120000 }
                ],
                buttonText: 'Claim Unlimited Offer',
                mainAppTierId: 'unlimited-lifetime-21000', // Example ID
                addonAppTierIds: {
                    course: 'addon-num-course-499-ultd', // Example ID
                    app: 'addon-num-app-1200' // Example ID
                }
            }
        },
        {
            id: uuidv4(),
            type: 'final_cta',
            order: 5,
            enabled: true,
            finalCtaContent: {
                urgencyHeadline: 'ACT FAST: OFFER ENDS WHEN THE WEBINAR ENDS!',
                urgencySubheadline: 'If you wait, you will miss out on the <span class="text-red-700 underline"> Lifetime Best Affiliate Commission</span> and the <span class="text-red-700 underline"> ₹1,10,000 Numerology Credit Bonus</span>!',
                ctaTitle: 'Choose Your Fast Track to Vastu Automation:',
                options: [
                    {
                        id: uuidv4(),
                        type: 'instant',
                        isPrimary: true,
                        title: 'Instant Credential Generation',
                        steps: [
                            { id: uuidv4(), text: 'Go to the site: <a href="https://powerfultools.in/pricing" class="font-mono font-semibold text-[#0062E3] break-all">https://powerfultools.in/pricing</a>' },
                            { id: uuidv4(), text: 'Add <span class="font-bold">Vastu Assistant Unlimited Credits</span> to your cart.' },
                            { id: uuidv4(), text: 'Add the code <span class="font-mono font-semibold text-red-600">WEBINAR</span> and enter your details.' },
                            { id: uuidv4(), text: 'Make the payment — <span class="font-extrabold text-green-700">Credentials generated INSTANTLY!</span>' }
                        ],
                        buttonText: 'GO TO SITE NOW',
                    },
                    {
                        id: uuidv4(),
                        type: 'qr',
                        isPrimary: false,
                        title: 'Easy QR Code Scan',
                        qrText: 'Scan this code with your phone camera.',
                        note: 'Credentials generated via QR code may take <span class="font-extrabold">up to 24 hours</span> to be processed and emailed.',
                    }
                ],
                footerText: 'Thank you for attending the Vastu webinar!',
                footerContact: 'Contact: support@powerfultools.in | Website: powerfultools.in'
            }
        }
    ]
};
