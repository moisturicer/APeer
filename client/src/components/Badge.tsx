import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'gray' | 'amber' | 'teal' | 'red';
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  const styles = {
    gray:  'bg-zinc-100 text-zinc-600',
    amber: 'bg-amber-50 text-amber-700',
    teal:  'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]',
    red:   'bg-red-50 text-red-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${styles[variant]}`}>
      {children}
    </span>
  );
}
