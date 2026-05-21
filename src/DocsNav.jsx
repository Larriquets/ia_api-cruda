const LINKS = [
  { key: 'docs',          href: '/docs',          emoji: '📚', name: '/docs',          desc: 'qué hace cada modo de la app' },
  { key: 'como-funciona', href: '/como-funciona', emoji: '⚙️', name: '/como-funciona', desc: 'system / context / tools en el POST' },
  { key: 'contexto',      href: '/contexto',      emoji: '🧠', name: '/contexto',      desc: 'vista en vivo del array messages del chat' },
  { key: 'proveedores',   href: '/proveedores',   emoji: '⚖️', name: '/proveedores',   desc: 'OpenAI vs Anthropic — dónde vive el contexto' },
]

const DEMO_LINKS = [
  { key: 'demo-chat',   href: '/demo/chat',   emoji: '🎞️', name: '/demo/chat',   desc: 'demo automática del Chat: crudo vs conversación vs persistente' },
  { key: 'demo-editor', href: '/demo/editor', emoji: '🎬', name: '/demo/editor', desc: 'demo automática del Editor: sin contexto vs con contexto' },
  { key: 'demo-loop',   href: '/demo/loop',   emoji: '✂️', name: '/demo/loop',   desc: 'demo automática del Loop: edición agéntica con tools' },
]

export default function DocsNav({ current }) {
  const isDemo = current?.startsWith('demo-')
  const links = isDemo ? DEMO_LINKS : LINKS
  const title = isDemo ? 'Mas demos' : 'Más docs:'
  const ariaLabel = isDemo ? 'Páginas de demos' : 'Páginas de documentación'

  return (
    <nav className="docs-nav" aria-label={ariaLabel}>
      <div className="docs-nav-title">{title}</div>
      {links.filter((l) => l.key !== current).map((l) => (
        <a key={l.key} href={l.href} className="docs-nav-link">
          <span className="docs-nav-emoji">{l.emoji}</span>
          <span className="docs-nav-name">{l.name}</span>
          <span className="docs-nav-desc">{l.desc}</span>
        </a>
      ))}
    </nav>
  )
}
