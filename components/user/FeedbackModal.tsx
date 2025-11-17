

import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { db, FieldValue } from '../../services/firebase.ts';
import type { AppDefinition, UserProfile, Review } from '../../types.ts';
import AppIcon from '../shared/AppIcon.tsx';
import StarRating from '../shared/StarRating.tsx';

interface FeedbackModalProps {
    app: AppDefinition;
    user: UserProfile;
    existingReview?: Review | null;
    onSubmit: (app: AppDefinition, data: { rating: number, reviewText: string }) => void;
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ app, user, existingReview, onSubmit, onClose }) => {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [reviewText, setReviewText] = useState(existingReview?.review || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    useEffect(() => {
        // Pre-fill form if editing an existing review
        if (existingReview) {
            setRating(existingReview.rating);
            setReviewText(existingReview.review);
        }
    }, [existingReview]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0 || isSubmitting) {
            return;
        }
        setIsSubmitting(true);
        
        // Fire-and-forget the submission logic. The parent component will handle the async work.
        onSubmit(app, { rating, reviewText });

        // Immediately show success UI and schedule the modal to close.
        setShowSuccess(true);
        setTimeout(() => {
            onClose();
        }, 1500); // Wait for the success animation to be seen
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all relative">
                {showSuccess ? (
                     <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center h-96">
                        <CheckCircle className="text-green-500 h-20 w-20 mb-4 animate-pulse" />
                        <h3 className="text-2xl font-bold text-gray-800">Thank You!</h3>
                        <p className="text-gray-600 mt-2">Your feedback has been submitted.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="p-8 text-center">
                            <AppIcon icon={app.icon} name={app.name} className="h-16 w-16 rounded-xl mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-800">How was your experience with {app.name}?</h3>
                            <p className="text-gray-500 mt-2">Your feedback helps us improve.</p>
                            
                            <div className="my-8">
                                <StarRating rating={rating} setRating={setRating} disabled={isSubmitting} />
                            </div>
                            
                            <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="Tell us more... (optional)"
                                className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 transition resize-none h-28 bg-white text-gray-900 placeholder-gray-500"
                                disabled={isSubmitting}
                            />
                        </div>
                        <footer className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl border-t">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                Skip for Now
                            </button>
                            <button 
                                type="submit" 
                                className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center disabled:bg-blue-400"
                                disabled={rating === 0 || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader className="animate-spin mr-2" size={20} />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Feedback'
                                )}
                            </button>
                        </footer>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;