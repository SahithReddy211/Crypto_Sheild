import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <div className="card p-5 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
        {Icon && (
          <div 
            className="w-8 h-8 rounded-lg text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border"
            style={{ 
              backgroundColor: 'var(--bg-input)', 
              borderColor: 'var(--border-subtle)' 
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {value}
        </div>
        {trend && (
          <span className="badge badge-success text-xs font-semibold">
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs leading-normal" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
