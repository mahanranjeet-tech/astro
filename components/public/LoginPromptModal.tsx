import React from 'react';
import { LogIn, X, IndianRupee } from 'lucide-react';

interface LoginPromptModalProps {
    onClose: () => void;
}

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md text-center">
                <h3 className="text-xl font-bold text-gray-900">Please Login or Purchase</h3>
                <p className="mt-2 text-gray-600">You need to be logged in to use this application. Existing users can log in, while new users can sign up and purchase credits.</p>
                <div className="mt-6 flex flex-col gap-3">
                    <a href="/login" className="w-full flex justify-center items-center py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">
                        <LogIn className="mr-2" size={20}/> Login for Existing Users
                    </a>
                     <a href="/pricing" className="w-full flex justify-center items-center py-3 px-4 text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition">
                        <IndianRupee className="mr-2" size={20}/> See Pricing & Sign Up
                    </a>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-md bg-gray-200 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginPromptModal;