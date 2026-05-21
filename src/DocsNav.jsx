const LINKS = [
  { key: 'docs',          href: '/docs',          emoji: '📚', name: '/docs',          desc: 'qué hace cada modo de la app' },
  { key: 'como-funciona', href: '/como-funciona', emoji: '⚙️', name: '/como-funciona', desc: 'system / context / tools en el POST' },
  { key: 'modos-chat',    href: '/modos-chat',    emoji: '🎞️', name: '/modos-chat',    desc: 'crudo vs conversación vs persistente, animado' },
  { key: 'modos-editor',  href: '/modos-editor',  emoji: '🎬', name: '/modos-editor',  desc: 'sin contexto vs con contexto en el Editor, animado' },
  { key: 'como-edita',    href: '/como-edita',    emoji: '✂️', name: '/como-edita',    desc: 'cómo una IA "edita código" sin tocar tu archivo' },
  { key: 'contexto',      href: '/contexto',      emoji: '🧠', name: '/contexto',      desc: 'vista en vivo del array messages del chat' },
  { key: 'proveedores',   href: '/proveedores',   emoji: '⚖️', name: '/proveedores',   desc: 'OpenAI vs Anthropic — dónde vive el contexto' },
]

export default function DocsNav({ current }) {
  return (
    <nav className="docs-nav" aria-label="Páginas de documentación">
      <div className="docs-nav-title">Más docs:</div>
      {LINKS.filter((l) => l.key !== current).map((l) => (
        <a key={l.key} href={l.href} className="docs-nav-link">
          <span className="docs-nav-emoji">{l.emoji}</span>
          <span className="docs-nav-name">{l.name}</span>
          <span className="docs-nav-desc">{l.desc}</span>
        </a>
      ))}
    </nav>
  )
}
