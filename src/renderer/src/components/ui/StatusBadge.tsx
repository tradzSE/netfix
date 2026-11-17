import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  pulse?: boolean
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pass:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  ok:      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  Up:      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  fail:    { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400' },
  error:   { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400' },
  warn:    { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  warning: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  running: { bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  pending: { bg: 'bg-surface-700/50', text: 'text-surface-400', dot: 'bg-surface-500' },
}

const LABELS: Record<string, string> = {
  pass: 'Pass', ok: 'OK', fail: 'Fail', error: 'Error',
  warn: 'Warning', warning: 'Warning', running: 'Running',
  pending: 'Pending', Up: 'Connected', 'Not Present': 'Not Present',
  Disconnected: 'Disconnected', Disabled: 'Disabled',
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES['pending']
  const label = LABELS[status] ?? status

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded font-medium',
      styles.bg, styles.text,
      size === 'sm' && 'px-2 py-0.5 text-xs',
      size === 'md' && 'px-2.5 py-1 text-xs'
    )}>
      <span className={cn(
        'rounded-full',
        styles.dot,
        size === 'sm' && 'h-1.5 w-1.5',
        size === 'md' && 'h-2 w-2'
      )} />
      {label}
    </span>
  )
}
