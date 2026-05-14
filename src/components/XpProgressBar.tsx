import clsx from 'clsx';

interface Props {
  xp: number;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function XpProgressBar({ xp, level, currentXp, nextLevelXp, progress, size = 'md', showDetails = true }: Props) {
  return (
    <div>
      {showDetails && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="grad-primary text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              Lv. {level}
            </div>
            <span className="text-sm font-semibold text-slate-700">{xp.toLocaleString()} XP</span>
          </div>
          <span className="text-xs text-slate-400">{currentXp} / {nextLevelXp} to next level</span>
        </div>
      )}
      <div className={clsx('xp-bar', size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2')}>
        <div
          className="xp-fill progress-animate"
          style={{ '--progress-width': `${progress}%` } as any}
        />
      </div>
      {!showDetails && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">Lv. {level}</span>
          <span className="text-xs text-slate-400">{progress}%</span>
        </div>
      )}
    </div>
  );
}
