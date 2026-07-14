import React, { useCallback, useState } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
        if (typeof window === 'undefined') return true;

        try {
            const saved = window.localStorage.getItem('eduar:sidebar-preference');
            if (saved) {
                const preference = JSON.parse(saved) as { version?: number; expanded?: boolean };
                if (preference.version === 1 && typeof preference.expanded === 'boolean') {
                    return preference.expanded;
                }
            }
        } catch {
            // A corrupted preference should never stop the app rendering.
        }

        return window.matchMedia('(min-width: 1200px)').matches;
    });

    const setSidebarExpanded = useCallback((expanded: boolean) => {
        setIsSidebarExpanded(expanded);
        try {
            window.localStorage.setItem(
                'eduar:sidebar-preference',
                JSON.stringify({ version: 1, expanded }),
            );
        } catch {
            // Storage can be unavailable in private browsing; the in-memory state still works.
        }
    }, []);

    return (
        <div className="flex min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
            <Sidebar
                isDesktopExpanded={isSidebarExpanded}
                onDesktopExpandedChange={setSidebarExpanded}
            />
            <main
                className={`w-full max-w-[100vw] min-w-0 flex-1 overflow-x-hidden pb-28 transition-[margin,max-width] duration-300 md:ml-[88px] md:max-w-[calc(100vw-88px)] md:pb-0 ${
                    isSidebarExpanded
                        ? 'min-[1200px]:ml-[296px] min-[1200px]:max-w-[calc(100vw-296px)]'
                        : 'min-[1200px]:ml-[88px] min-[1200px]:max-w-[calc(100vw-88px)]'
                }`}
            >
                {children}
            </main>
        </div>
    );
};
