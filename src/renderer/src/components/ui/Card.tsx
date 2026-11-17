import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'glass' | 'glow' | 'interactive' | 'solid'
}

export default function Card({
  children,
  className,
  padding = 'md',
  variant = 'glass'
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200 relative',
        variant === 'glass' && 'glass-card',
        variant === 'glow' && 'glass-card-glow',
        variant === 'interactive' && 'glass-card hover:border-white/[0.16] cursor-pointer',
        variant === 'solid' && 'bg-surface-950/80 border border-white/[0.05]',
        // Padding
        padding === 'none' && 'p-0',
        padding === 'sm' && 'p-3.5',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4 gap-2', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-sm font-semibold text-white tracking-tight', className)}>
      {children}
    </h3>
  )
}

export function CardSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs text-surface-400 mt-0.5', className)}>
      {children}
    </p>
  )
}
