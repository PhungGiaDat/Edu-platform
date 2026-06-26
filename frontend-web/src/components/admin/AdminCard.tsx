// frontend-web/src/components/admin/AdminCard.tsx
/**
 * Admin Card - Claymorphic card component for dashboard
 */
import React from 'react';

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const AdminCard: React.FC<AdminCardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  onClick 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5 md:p-6',
    lg: 'p-6 md:p-8',
  };

  return (
    <div 
      className={`
        bg-white rounded-3xl
        shadow-[0_4px_0_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]
        hover:shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]
        hover:-translate-y-0.5
        active:shadow-[0_2px_0_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04),inset_0_2px_4px_rgba(0,0,0,0.06)]
        active:translate-y-0.5
        transition-all duration-200
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Stat Card for dashboard
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'pink';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-[#6EB9FF]/10 text-[#6EB9FF]',
    green: 'bg-[#B4E197]/10 text-[#7DC760]',
    yellow: 'bg-[#FFD93D]/10 text-[#E5B800]',
    pink: 'bg-[#FF9F9F]/10 text-[#D97070]',
  };

  return (
    <AdminCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </AdminCard>
  );
};

// Section Card with header
interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = ''
}) => {
  return (
    <AdminCard className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </AdminCard>
  );
};

export default AdminCard;
