import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-neutral-50 flex">
            <Sidebar />
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
                {children}
            </main>
        </div>
    );
};
