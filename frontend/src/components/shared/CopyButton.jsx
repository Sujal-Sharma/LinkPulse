import { useState } from 'react'
import { motion } from 'framer-motion'

export default function CopyButton({ text, children }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={handleCopy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
        background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.1)',
        border: copied ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(124,58,237,0.3)',
        color: copied ? 'var(--success)' : 'var(--primary)',
        fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
      }}
    >
      {copied ? '✓ Copied' : (children || 'Copy')}
    </motion.button>
  )
}
