export default function Spinner({ size = 24, color = 'var(--primary)' }) {
  return (
    <div
      style={{
        width: size, height: size,
        border: `2px solid ${color}33`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('spinner-style')) {
  const style = document.createElement('style')
  style.id = 'spinner-style'
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}
