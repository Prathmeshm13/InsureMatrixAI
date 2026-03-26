import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string | number;
  deltaPositive?: boolean;
  icon?: ReactNode;
  subtext?: string;
}

export function MetricCard({ label, value, delta, deltaPositive, icon, subtext }: MetricCardProps) {
  return (
    <div className="card-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {(delta !== undefined || subtext) && (
        <div className="flex items-center gap-1 text-xs">
          {delta !== undefined && (
            <>
              {deltaPositive === true ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : deltaPositive === false ? (
                <TrendingDown className="w-3 h-3 text-red-400" />
              ) : (
                <Minus className="w-3 h-3 text-gray-500" />
              )}
              <span className={deltaPositive === true ? 'text-emerald-400' : deltaPositive === false ? 'text-red-400' : 'text-gray-500'}>
                {delta}
              </span>
            </>
          )}
          {subtext && <span className="text-gray-500">{subtext}</span>}
        </div>
      )}
    </div>
  );
}

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;

const riskConfig: Record<string, { color: string; dot: string }> = {
  LOW:      { color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', dot: 'bg-emerald-400' },
  MEDIUM:   { color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',   dot: 'bg-yellow-400' },
  HIGH:     { color: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',   dot: 'bg-orange-400' },
  CRITICAL: { color: 'bg-red-500/20 text-red-300 border border-red-500/30',            dot: 'bg-red-400' },
  UNKNOWN:  { color: 'bg-gray-700/50 text-gray-400 border border-gray-600/30',          dot: 'bg-gray-500' },
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const cfg = riskConfig[risk] || riskConfig.UNKNOWN;
  return (
    <span className={`badge ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
      {risk}
    </span>
  );
}

interface ScoreBarProps {
  score: number;
  label?: string;
  showValue?: boolean;
}

export function ScoreBar({ score, label, showValue = true }: ScoreBarProps) {
  const color =
    score >= 90 ? 'bg-emerald-500' :
    score >= 75 ? 'bg-yellow-500' :
    score >= 60 ? 'bg-orange-500' :
    'bg-red-500';

  return (
    <div className="space-y-1 w-full">
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-400">
          {label && <span>{label}</span>}
          {showValue && <span className="font-mono">{score.toFixed(1)}</span>}
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

interface SpinnerProps { size?: 'sm' | 'md' | 'lg' }
export function Spinner({ size = 'md' }: SpinnerProps) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <div className={`${s} border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin`} />
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <div className="p-4 bg-gray-800 rounded-2xl text-gray-500">{icon}</div>
      <div className="text-gray-300 font-medium">{title}</div>
      {description && <div className="text-sm text-gray-500 max-w-sm">{description}</div>}
    </div>
  );
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
    </div>
  );
}
