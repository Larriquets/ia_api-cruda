const LINKS = [
  { key: 'docs', href: '/docs', emoji: 'D', name: '/docs', desc: 'que hace cada modo de la app' },
  { key: 'como-funciona', href: '/como-funciona', emoji: 'C', name: '/como-funciona', desc: 'system / context / tools en el POST' },
  { key: 'contexto', href: '/contexto', emoji: 'M', name: '/contexto', desc: 'vista en vivo del array messages del chat' },
  { key: 'proveedores', href: '/proveedores', emoji: 'P', name: '/proveedores', desc: 'OpenAI vs Anthropic: donde vive el contexto' },
]

const DEMO_LINKS = [
  { key: 'demo-chat', href: '/demo/chat', emoji: 'C', name: '/demo/chat', desc: 'demo automatica del Chat: crudo vs conversacion vs persistente' },
  { key: 'demo-editor', href: '/demo/editor', emoji: 'E', name: '/demo/editor', desc: 'demo automatica del Editor: sin contexto vs con contexto' },
  { key: 'demo-loop', href: '/demo/loop', emoji: 'L', name: '/demo/loop', desc: 'demo automatica del Loop: edicion agentica con tools' },
  { key: 'demo-agents-md', href: '/demo/agents-md', emoji: 'A', name: '/demo/agents-md', desc: 'demo automatica de AGENTS.md: mismas tools, distinto system' },
]

export default function DocsNav({ current }) {
  const isDemo = current?.startsWith('demo-')
  const links = isDemo ? DEMO_LINKS : LINKS
  const title = isDemo ? 'Mas demos' : 'Mas docs:'
  const ariaLabel = isDemo ? 'Paginas de demos' : 'Paginas de documentacion'

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
