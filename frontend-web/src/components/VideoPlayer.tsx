import React from 'react';

interface VideoPlayerProps {
    url: string;
    thumbnailUrl?: string;
    onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, thumbnailUrl, onEnded }) => {
    return (
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border-4 border-neutral-800">
            <video
                src={url}
                poster={thumbnailUrl}
                controls
                className="w-full h-full object-contain"
                onEnded={onEnded}
            />
        </div>
    );
};
