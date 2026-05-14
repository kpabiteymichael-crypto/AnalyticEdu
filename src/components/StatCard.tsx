import { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg: string;
  trend?: { value: string; positive: boolean };
}

export default function StatCard({ title, value, subtitle, icon, iconBg, trend }: Props) {
  return (
    <div className="card-hover">
      <div className="flex items-start gap-4">
        <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={clsx('flex items-center gap-1 mt-2 text-xs font-semibold', trend.positive ? 'text-emerald-600' : 'text-red-500')}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
