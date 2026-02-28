import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface-card border border-surface-border rounded-xl p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
