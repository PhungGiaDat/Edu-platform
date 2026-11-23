import React from 'react';

export interface ProgressIconProps {
    className?: string;
    decorative?: boolean;
}

function accessibilityProps(decorative: boolean, label: string) {
    return decorative
        ? { 'aria-hidden': true as const }
        : { 'aria-label': label, role: 'img' as const };
}

/** A bright XP medallion that stays legible at navigation and stat-card sizes. */
export const XpBoltIcon: React.FC<ProgressIconProps> = ({
    className = 'h-8 w-8',
    decorative = true,
}) => (
    <svg
        {...accessibilityProps(decorative, 'Experience points')}
        className={className}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="24" cy="24" r="20" fill="#FFF0A8" />
        <circle cx="24" cy="24" r="17" fill="#FFD45A" stroke="#F5A524" strokeWidth="2" />
        <path
            d="M26.5 9.5 15.8 26.2h7.1L21.5 38.5l10.8-17h-7.2l1.4-12Z"
            fill="#FF7043"
            stroke="#D94C2B"
            strokeLinejoin="round"
            strokeWidth="1.5"
        />
        <path d="m31.8 11.8 2.4-2.4M35.5 17h3.4M14.4 14.5 12 12.1" stroke="#FFF" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
);

/** An open lesson book with a large success check for completed lessons. */
export const CompletedBookIcon: React.FC<ProgressIconProps> = ({
    className = 'h-8 w-8',
    decorative = true,
}) => (
    <svg
        {...accessibilityProps(decorative, 'Completed lessons')}
        className={className}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M5.5 12.5c6.8-2.2 12.8-.9 18.5 3.9v24C18.3 35.7 12.3 34.5 5.5 36.7V12.5Z" fill="#67CFF4" stroke="#278FB8" strokeLinejoin="round" strokeWidth="2" />
        <path d="M42.5 12.5c-6.8-2.2-12.8-.9-18.5 3.9v24c5.7-4.7 11.7-5.9 18.5-3.7V12.5Z" fill="#9EE6F7" stroke="#278FB8" strokeLinejoin="round" strokeWidth="2" />
        <path d="M24 16.5v23" stroke="#278FB8" strokeLinecap="round" strokeWidth="2" />
        <circle cx="34.5" cy="15" r="10" fill="#58CC82" stroke="#27965A" strokeWidth="2" />
        <path d="m29.5 15 3.3 3.3 6.7-7" stroke="#FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <path d="M9.5 20.5c3.5-.7 6.7-.1 9.7 1.8M9.5 26c3.5-.7 6.7-.1 9.7 1.8" stroke="#FFF" strokeLinecap="round" strokeWidth="2" />
    </svg>
);

/** A collectible sticker motif shared by progress cards and navigation. */
export const StickerStarIcon: React.FC<ProgressIconProps> = ({
    className = 'h-8 w-8',
    decorative = true,
}) => (
    <svg
        {...accessibilityProps(decorative, 'Stickers')}
        className={className}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M24 5.5 29.5 17l12.6 1.8-9.2 8.8 2.2 12.5L24 34.2l-11.1 5.9 2.2-12.5-9.2-8.8L18.5 17 24 5.5Z"
            fill="#FFCF4A"
            stroke="#E69A22"
            strokeLinejoin="round"
            strokeWidth="2"
        />
        <path d="m29.4 17 5.7 23.1L24 34.2l-11.1 5.9 2.2-12.5L5.9 18.8 18.5 17 24 5.5l5.4 11.5Z" fill="#FFF" opacity=".22" />
        <path d="m35.1 40.1-6.3-3.3 6.6-4.5-.3 7.8Z" fill="#FFF3C4" stroke="#E69A22" strokeLinejoin="round" strokeWidth="1.4" />
        <path d="m39 7 1.2 2.8L43 11l-2.8 1.2L39 15l-1.2-2.8L35 11l2.8-1.2L39 7ZM8.5 7.5l.8 1.8 1.7.7-1.7.8-.8 1.7-.7-1.7L6 10l1.8-.7.7-1.8Z" fill="#78D7F5" />
    </svg>
);
