
import React from 'react';
import { LogIn } from 'lucide-react';
import Footer from './Footer.tsx';

interface PublicPageLayoutProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({ title, icon, children }) => (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
        <header className="bg-white border-b border-slate-200 z-10 sticky top-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                 <a href="/" className="flex items-center gap-3">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0">
                       <path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"></path>
                       <path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"></path>
                       <path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"></path>
                       <path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"></path>
                   </svg>
                   <div>
                        <h1 className="text-xl font-bold text-gray-800">Powerful Tools</h1>
                        <p className="text-sm text-gray-500">By Acharya Preeti Sharma</p>
                   </div>
                </a>
                <div className="flex items-center gap-4">
                    <a href="/login" className="flex items-center text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
                        <LogIn size={16} className="mr-1" />
                        Login
                    </a>
                </div>
            </div>
        </header>
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="bg-white p-6 sm:p-8 md:p-12 rounded-2xl shadow-xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-200 pb-6 mb-8">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full flex-shrink-0">
                        {icon}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                </div>
                {children}
            </div>
        </main>
        <Footer />
    </div>
);

export default PublicPageLayout;