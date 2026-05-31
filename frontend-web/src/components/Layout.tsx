import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="flex min-h-screen w-full min-w-0" style={{ backgroundColor: 'var(--color-bg)' }}>
            <Sidebar />
            <main className="w-full min-w-0 flex-1 pb-20 md:ml-64 md:pb-0">
                {children}
            </main>
        </div>
    );
};
