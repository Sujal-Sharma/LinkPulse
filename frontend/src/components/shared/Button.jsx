import { clsx } from 'clsx'
import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20',
  secondary: 'bg-card border border-border text-text hover:border-primary/50',
  danger: 'bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20',
  ghost: 'text-muted hover:text-text hover:bg-card',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 rounded-lg',
  lg: 'px-6 py-3 rounded-xl text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      style={{
        background: variant === 'primary' ? 'var(--primary)' : undefined,
        border: variant === 'secondary' ? '1px solid var(--border)' : undefined,
      }}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  )
}
