
import React, { useState } from 'react';
import { Mail, Key, LogIn, Eye, EyeOff, UserPlus } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (email: string, password: string) => Promise<void>;
    onForgotPassword: (email: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onForgotPassword }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onLogin(email, password);
        setIsSubmitting(false);
    };

    const handleForgotPassword = async () => {
        setIsResetting(true);
        await onForgotPassword(email);
        setIsResetting(false);
    };

    return (
        <div className="flex flex-grow items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-200">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Portal Login</h1>
                    <p className="mt-2 text-gray-600">Enter your credentials to access the portal.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required className="w-full pl-10 pr-3 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-500" placeholder="Email Address"/>
                    </div>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className="w-full pl-10 pr-10 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-500" placeholder="Password"/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff size={20}/> : <Eye size={20} />}
                        </button>
                    </div>

                    <div>
                        <button type="submit" disabled={isSubmitting || isResetting} className="w-full flex justify-center items-center py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:bg-blue-400">
                            {isSubmitting ? 'Signing in...' : <><LogIn className="mr-2" size={20}/> Sign In</>}
                        </button>
                        <div className="flex justify-around items-center text-center mt-4">
                             <a href="/pricing" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition inline-flex items-center gap-1">
                                <UserPlus size={14}/> Sign up
                             </a>
                             <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={!email || isSubmitting || isResetting}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {isResetting ? 'Sending link...' : 'Forgot password?'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
