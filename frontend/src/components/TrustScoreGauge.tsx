'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface TrustScoreGaugeProps {
  score: number;
  riskLevel?: string;
  size?: 'sm' | 'lg';
}

export default function TrustScoreGauge({ score, riskLevel, size = 'lg' }: TrustScoreGaugeProps) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div className={clsx('relative', size === 'lg' ? 'w-40 h-40' : 'w-24 h-24')}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r="45" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx('font-bold', size === 'lg' ? 'text-3xl' : 'text-lg')} style={{ color }}>
          {Math.round(score)}%
        </span>
        {riskLevel && (
          <span className={clsx('text-xs font-medium capitalize risk-' + riskLevel, 'px-2 py-0.5 rounded-full border mt-1')}>
            {riskLevel}
          </span>
        )}
      </div>
    </div>
  );
}
