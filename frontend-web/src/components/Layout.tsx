import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="flex min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
            <Sidebar />
            <main className="w-full max-w-[100vw] min-w-0 flex-1 overflow-x-hidden pb-24 md:ml-64 md:max-w-[calc(100vw-16rem)] md:pb-0">
                {children}
            </main>
        </div>
    );
};
