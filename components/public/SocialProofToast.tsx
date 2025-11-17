
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';

const names = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Aditya", "Diya", "Kabir", "Ishita"];
const cities = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur"];

// Fisher-Yates (aka Knuth) shuffle function
const shuffle = <T,>(array: T[]): T[] => {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array];
    
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    
    return newArray;
};


const SocialProofToast: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [messageIndex, setMessageIndex] = useState(0);

    // Generate and shuffle the list of all possible messages once.
    const messages = useMemo(() => {
        const combinations = names.flatMap(name =>
            cities.map(city => `${name} from ${city} just made a purchase!`)
        );
        return shuffle(combinations);
    }, []);

    useEffect(() => {
        if (messages.length === 0) return;

        // Function to show the current toast
        const showToast = () => {
            setMessage(messages[messageIndex]);
            setIsVisible(true);
            
            // Set a timer to hide the toast
            const hideTimer = setTimeout(() => {
                setIsVisible(false);
            }, 5000); // visible for 5 seconds

            // Schedule the *next* toast to appear after a longer, random interval
            const nextToastTimer = setTimeout(() => {
                // We just update the index, which will re-trigger this effect
                setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
            }, 12000 + Math.random() * 8000); // 12-20 seconds until the next one appears

            // Cleanup function to clear timers if the component unmounts
            return () => {
                clearTimeout(hideTimer);
                clearTimeout(nextToastTimer);
            };
        };
        
        // Initial delay before showing the very first toast
        const initialDelay = setTimeout(showToast, 4000);
        
        return () => clearTimeout(initialDelay);

    }, [messageIndex, messages]);


    return (
        <div 
            className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ease-in-out
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
        >
            <div className="bg-white rounded-lg shadow-2xl border flex items-center gap-3 p-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                    <ShoppingCart size={20} />
                </div>
                <p className="text-sm font-semibold text-gray-700">{message}</p>
            </div>
        </div>
    );
};

export default SocialProofToast;
