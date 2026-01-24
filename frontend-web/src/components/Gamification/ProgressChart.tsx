// src/components/Gamification/ProgressChart.tsx
// Simple bar chart using CSS for weekly progress visualization
// Parent-friendly design with clear data representation

import React from 'react';

export interface ChartDataPoint {
    label: string;      // Day name (Mon, Tue, etc.)
    value: number;      // Primary value (e.g., XP or words)
    secondary?: number; // Secondary value (e.g., time in mins)
}

interface ProgressChartProps {
    data: ChartDataPoint[];
    title?: string;
    primaryLabel?: string;    // Label for primary bars (default: "Words")
    secondaryLabel?: string;  // Label for secondary bars (default: "Time (mins)")
    showSecondary?: boolean;
    maxValue?: number;        // For normalization, auto-calculated if not provided
    colorScheme?: 'purple' | 'blue' | 'green' | 'orange';
}

const COLOR_SCHEMES = {
    purple: {
        primary: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
        secondary: 'linear-gradient(180deg, #c4b5fd 0%, #a78bfa 100%)',
        text: '#7c3aed',
        bg: '#f5f3ff'
    },
    blue: {
        primary: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
        secondary: 'linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%)',
        text: '#2563eb',
        bg: '#eff6ff'
    },
    green: {
        primary: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
        secondary: 'linear-gradient(180deg, #86efac 0%, #4ade80 100%)',
        text: '#16a34a',
        bg: '#f0fdf4'
    },
    orange: {
        primary: 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)',
        secondary: 'linear-gradient(180deg, #fed7aa 0%, #fdba74 100%)',
        text: '#ea580c',
        bg: '#fff7ed'
    }
};

export const ProgressChart: React.FC<ProgressChartProps> = ({
    data,
    title = 'Weekly Progress',
    primaryLabel = 'Words',
    secondaryLabel = 'Time (mins)',
    showSecondary = false,
    maxValue,
    colorScheme = 'purple'
}) => {
    const colors = COLOR_SCHEMES[colorScheme];
    
    // Calculate max value for normalization
    const calculatedMax = maxValue || Math.max(
        ...data.map(d => Math.max(d.value, d.secondary || 0)),
        1 // Prevent division by zero
    );
    
    // Calculate bar height as percentage
    const getBarHeight = (value: number): number => {
        return Math.min((value / calculatedMax) * 100, 100);
    };
    
    // Get today's day name
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    return (
        <div
            className="rounded-2xl p-4 shadow-lg"
            style={{
                background: 'rgba(255,255,255,0.95)',
                border: `3px solid ${colors.text}`
            }}
        >
            {/* Title */}
            <h3 
                className="font-bold text-lg mb-4 flex items-center gap-2"
                style={{ color: colors.text }}
            >
                <span>📊</span>
                {title}
            </h3>
            
            {/* Legend */}
            <div className="flex gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1">
                    <div 
                        className="w-3 h-3 rounded"
                        style={{ background: colors.primary }}
                    />
                    <span className="text-gray-600">{primaryLabel}</span>
                </div>
                {showSecondary && (
                    <div className="flex items-center gap-1">
                        <div 
                            className="w-3 h-3 rounded"
                            style={{ background: colors.secondary }}
                        />
                        <span className="text-gray-600">{secondaryLabel}</span>
                    </div>
                )}
            </div>
            
            {/* Chart */}
            <div className="flex items-end justify-between gap-2 h-32">
                {data.map((point, index) => {
                    const isToday = point.label === today;
                    const barHeight = getBarHeight(point.value);
                    const secondaryHeight = showSecondary && point.secondary 
                        ? getBarHeight(point.secondary) 
                        : 0;
                    
                    return (
                        <div 
                            key={index}
                            className="flex flex-col items-center flex-1"
                        >
                            {/* Bars container */}
                            <div className="flex gap-0.5 items-end h-24 w-full justify-center">
                                {/* Primary bar */}
                                <div
                                    className="rounded-t transition-all duration-500 relative group"
                                    style={{
                                        width: showSecondary ? '45%' : '70%',
                                        height: `${barHeight}%`,
                                        minHeight: point.value > 0 ? '8px' : '2px',
                                        background: point.value > 0 ? colors.primary : '#e5e7eb'
                                    }}
                                >
                                    {/* Tooltip */}
                                    {point.value > 0 && (
                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                            {point.value} {primaryLabel.toLowerCase()}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Secondary bar */}
                                {showSecondary && (
                                    <div
                                        className="rounded-t transition-all duration-500 relative group"
                                        style={{
                                            width: '45%',
                                            height: `${secondaryHeight}%`,
                                            minHeight: (point.secondary || 0) > 0 ? '8px' : '2px',
                                            background: (point.secondary || 0) > 0 ? colors.secondary : '#e5e7eb'
                                        }}
                                    >
                                        {/* Tooltip */}
                                        {(point.secondary || 0) > 0 && (
                                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                {point.secondary} {secondaryLabel.toLowerCase()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Day label */}
                            <div
                                className={`text-xs mt-2 font-bold ${isToday ? 'text-white px-2 py-0.5 rounded' : 'text-gray-500'}`}
                                style={isToday ? { background: colors.primary } : {}}
                            >
                                {point.label}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Summary line */}
            <div 
                className="mt-4 pt-3 border-t text-center text-sm"
                style={{ borderColor: colors.bg }}
            >
                <span className="text-gray-600">Total this week: </span>
                <span className="font-bold" style={{ color: colors.text }}>
                    {data.reduce((sum, d) => sum + d.value, 0)} {primaryLabel.toLowerCase()}
                </span>
                {showSecondary && (
                    <>
                        <span className="text-gray-400 mx-2">|</span>
                        <span className="font-bold" style={{ color: colors.text }}>
                            {data.reduce((sum, d) => sum + (d.secondary || 0), 0)} {secondaryLabel.toLowerCase()}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProgressChart;
