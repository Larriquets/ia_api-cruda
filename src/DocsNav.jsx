import { useT } from './i18n/useT.js'

const LINKS = [
  { key: 'docs', href: '/docs', emoji: 'D', name: '/docs', descKey: 'docsnav.docsDesc' },
  { key: 'recorrido', href: '/recorrido', emoji: 'R', name: '/recorrido', descKey: 'docsnav.recorridoDesc' },
  { key: 'como-funciona', href: '/como-funciona', emoji: 'C', name: '/como-funciona', descKey: 'docsnav.comoFuncDesc' },
  { key: 'contexto', href: '/contexto', emoji: 'M', name: '/contexto', descKey: 'docsnav.contextoDesc' },
  { key: 'proveedores', href: '/proveedores', emoji: 'P', name: '/proveedores', descKey: 'docsnav.provDesc' },
]

const DEMO_LINKS = [
  { key: 'demo-chat', href: '/demo/chat', emoji: 'C', name: '/demo/chat', descKey: 'docsnav.demoChatDesc' },
  { key: 'demo-editor', href: '/demo/editor', emoji: 'E', name: '/demo/editor', descKey: 'docsnav.demoEditorDesc' },
  { key: 'demo-loop', href: '/demo/loop', emoji: 'L', name: '/demo/loop', descKey: 'docsnav.demoLoopDesc' },
  { key: 'demo-agents-md', href: '/demo/agents-md', emoji: 'A', name: '/demo/agents-md', descKey: 'docsnav.demoAgentsDesc' },
  { key: 'demo-agents-md-skills', href: '/demo/agents-md-skills', emoji: 'S', name: '/demo/agents-md-skills', descKey: 'docsnav.demoSkillsDesc' },
]

export default function DocsNav({ current }) {
  const { t } = useT()
  const isDemo = current?.startsWith('demo-')
  const links = isDemo ? DEMO_LINKS : LINKS
  const title = isDemo ? t('docsnav.moreDemos') : t('docsnav.moreDocs')
  const ariaLabel = isDemo ? t('docsnav.ariaDemos') : t('docsnav.ariaDocs')

  return (
    <nav className="docs-nav" aria-label={ariaLabel}>
      <div className="docs-nav-title">{title}</div>
      {links.filter((l) => l.key !== current).map((l) => (
        <a key={l.key} href={l.href} className="docs-nav-link">
          <span className="docs-nav-emoji">{l.emoji}</span>
          <span className="docs-nav-name">{l.name}</span>
          <span className="docs-nav-desc">{t(l.descKey)}</span>
        </a>
      ))}
    </nav>
  )
}
