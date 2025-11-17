

import React, { useState } from 'react';
import { X, CheckCircle, Copy } from 'lucide-react';

interface UserCreationSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    password: string;
}

const UserCreationSuccessModal: React.FC<UserCreationSuccessModalProps> = ({ isOpen, onClose, email, password }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const instructions = `Welcome! Your portal account has been created.

Step 1: Go to: https://powerfultools.in/login
Step 2: Enter your credentials:
   Email: ${email}
   Temp Password: ${password}
Step 3: The system will ask you to change your password for your own security.
Step 4: Login with your new password; you will be redirected to the Home Page.
Step 5: Watch the tutorials on the Home Page before using any app.

Enjoy!`;

    const handleCopy = () => {
        navigator.clipboard.writeText(instructions).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <h3 className="text-xl font-bold text-gray-900">User Created Successfully!</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                </div>
                <p className="text-gray-600 mb-4">Copy the instructions below and send them to the new user.</p>
                <div className="relative bg-gray-100 p-4 rounded-lg border border-gray-200">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{instructions}</pre>
                    <button 
                        onClick={handleCopy} 
                        className="absolute top-2 right-2 p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                        aria-label="Copy instructions"
                    >
                        {copied ? <CheckCircle size={18} className="text-green-600" /> : <Copy size={18} />}
                    </button>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Done</button>
                </div>
            </div>
        </div>
    );
};

export default UserCreationSuccessModal;