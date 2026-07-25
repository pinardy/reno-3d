import type { ReactNode } from 'react'

export function Section({
  title,
  children,
  right,
}: {
  title: string
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="border-b border-edge px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  )
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-300">
      <span className="shrink-0 text-neutral-400">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  onEditStart,
  step = 0.1,
  min,
  max,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  onEditStart?: () => void // called once when editing begins (for an undo checkpoint)
  step?: number
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0}
        step={step}
        min={min}
        max={max}
        onFocus={onEditStart}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 rounded border border-edge bg-panel2 px-2 py-1 text-right text-xs text-neutral-100 outline-none focus:border-accent"
      />
      {suffix && <span className="text-[10px] text-neutral-500">{suffix}</span>}
    </div>
  )
}

export function Slider({
  value,
  onChange,
  onEditStart,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  value: number
  onChange: (v: number) => void
  onEditStart?: () => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onPointerDown={onEditStart}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-28"
    />
  )
}

export function ColorSwatch({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 w-8 cursor-pointer rounded border border-edge bg-transparent p-0"
    />
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-edge bg-panel2 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-accent"
    />
  )
}

export function ToolButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean
  onClick?: () => void
  title?: string
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex h-9 w-full items-center gap-2 rounded px-2 text-xs transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-panel2',
        active ? 'bg-accent/20 text-accent ring-1 ring-accent/40' : 'text-neutral-300',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  onClick,
  title,
  children,
  disabled,
  active,
}: {
  onClick?: () => void
  title?: string
  children: ReactNode
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex h-8 items-center justify-center gap-1.5 rounded px-2.5 text-xs transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-panel2',
        active ? 'bg-accent/20 text-accent' : 'text-neutral-300',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
