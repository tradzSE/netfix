import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]/50',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        // Netflix Primary Brand Red
        variant === 'primary' && 'bg-[#E50914] text-white hover:bg-[#b81d24] font-semibold shadow-lg shadow-[#E50914]/25 active:scale-[0.98]',
        variant === 'secondary' && 'bg-surface-800 text-surface-200 border border-white/[0.08] hover:bg-surface-700 hover:border-white/[0.15]',
        variant === 'ghost' && 'text-surface-400 hover:text-white hover:bg-white/[0.05]',
        variant === 'danger' && 'bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30 hover:bg-[#E50914]/25',
        size === 'xs' && 'px-2.5 py-1 text-[11px]',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-2.5 text-base',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
