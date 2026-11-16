import { AlertTriangle, ShieldAlert, X } from 'lucide-react'
import Button from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description: string
  warningText?: string
  isElevated?: boolean
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  warningText,
  isElevated,
  confirmLabel = 'Confirm & Run',
  confirmVariant = 'primary',
  loading,
  onConfirm,
  onCancel,
  children
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-surface-900 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              {isElevated ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              {isElevated && (
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Requires Administrator Elevation (UAC)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-surface-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-surface-300 leading-relaxed">
          {description}
        </p>

        {/* Warning text */}
        {warningText && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{warningText}</span>
          </div>
        )}

        {/* Custom fields (e.g. adapter or dns dropdown) */}
        {children && <div className="pt-1">{children}</div>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.04]">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
