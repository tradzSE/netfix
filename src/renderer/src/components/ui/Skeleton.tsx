import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rounded' | 'card'
  width?: string | number
  height?: string | number
}

export default function Skeleton({
  className,
  variant = 'rounded',
  width,
  height
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-800/80',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-3.5 rounded',
        variant === 'rounded' && 'rounded-lg',
        variant === 'card' && 'rounded-xl p-5',
        className
      )}
      style={{
        width: width,
        height: height
      }}
    >
      {/* Subtle Netflix-themed Shimmer Wave */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none" />
    </div>
  )
}

/**
 * Prebuilt Skeleton for Card panels
 */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('glass-card rounded-xl p-5 space-y-3 relative overflow-hidden', className)}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-1 border-b border-white/[0.02] last:border-0">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
    </div>
  )
}

/**
 * Prebuilt Skeleton for Table rows
 */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-white/[0.02]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <Skeleton className={cn('h-3', i === 0 ? 'w-24' : i === cols - 1 ? 'w-16 ml-auto' : 'w-32')} />
        </td>
      ))}
    </tr>
  )
}
