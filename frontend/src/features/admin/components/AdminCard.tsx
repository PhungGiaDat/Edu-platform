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
  onClick,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5 md:p-6',
    lg: 'p-6 md:p-8',
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      className={`admin-card ${onClick ? 'admin-card--interactive' : ''} ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  foot?: React.ReactNode;
  /** reserved: kept for caller compatibility, not applied to styles yet */
  color?: 'blue' | 'green' | 'yellow' | 'pink';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  foot,
}) => (
  <AdminCard className="admin-stat-card">
    <div className="flex items-start justify-between gap-3">
      <p className="admin-stat-label" style={{ marginBottom: 0 }}>{title}</p>
      {icon && (
        <span className="admin-stat-icon" aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 10 }}>
          {icon}
        </span>
      )}
    </div>
    <p className="admin-stat-value" style={{ marginTop: 6 }}>{value}</p>
    {trend && (
      <p className="mt-1.5 mb-0 text-[11px] font-extrabold" style={{ color: trend.isPositive ? 'var(--admin-accent)' : 'var(--admin-danger)', fontFamily: "'Nunito', sans-serif" }}>
        <span aria-hidden="true">{trend.isPositive ? '▲' : '▼'}</span> {Math.abs(trend.value)}%
      </p>
    )}
    {foot && <div className="mt-2">{foot}</div>}
  </AdminCard>
);

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
  className = '',
}) => (
  <AdminCard className={className}>
    <div className="admin-section-header">
      <div>
        <h2 className="admin-section-title">{title}</h2>
        {subtitle && <p className="admin-section-copy">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
    {children}
  </AdminCard>
);

export default AdminCard;
