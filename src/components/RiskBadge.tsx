import clsx from 'clsx';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

const config = {
  low: { class: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: <CheckCircle size={12} />, label: 'Low Risk' },
  medium: { class: 'bg-amber-50 text-amber-700 border border-amber-100', icon: <Info size={12} />, label: 'Medium Risk' },
  high: { class: 'bg-orange-50 text-orange-700 border border-orange-100', icon: <AlertTriangle size={12} />, label: 'High Risk' },
  critical: { class: 'bg-red-50 text-red-700 border border-red-100', icon: <AlertCircle size={12} />, label: 'Critical Risk' },
};

export default function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' | 'critical' }) {
  const { class: cls, icon, label } = config[level] ?? config.low;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', cls)}>
      {icon}
      {label}
    </span>
  );
}
