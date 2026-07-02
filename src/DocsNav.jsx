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
  { key: 'demo-rag', href: '/demo/rag', emoji: 'R', name: '/demo/rag', descKey: 'docsnav.demoRagDesc' },
  { key: 'demo-tokens', href: '/demo/tokens', emoji: 'T', name: '/demo/tokens', descKey: 'docsnav.demoTokensDesc' },
  { key: 'demo-logprobs', href: '/demo/logprobs', emoji: 'P', name: '/demo/logprobs', descKey: 'docsnav.demoLogprobsDesc' },
  { key: 'demo-mcp', href: '/demo/mcp', emoji: 'M', name: '/demo/mcp', descKey: 'docsnav.demoMcpDesc' },
  { key: 'demo-ventana-contexto', href: '/demo/ventana-contexto', emoji: 'V', name: '/demo/ventana-contexto', descKey: 'docsnav.demoVentanaDesc' },
  { key: 'demo-ruido', href: '/demo/ruido', emoji: 'N', name: '/demo/ruido', descKey: 'docsnav.demoRuidoDesc' },
  { key: 'demo-especificidad', href: '/demo/especificidad', emoji: 'X', name: '/demo/especificidad', descKey: 'docsnav.demoEspecDesc' },
  { key: 'demo-prompt-injection', href: '/demo/prompt-injection', emoji: 'I', name: '/demo/prompt-injection', descKey: 'docsnav.demoPiDesc' },
  { key: 'demo-razonamiento', href: '/demo/razonamiento', emoji: 'Z', name: '/demo/razonamiento', descKey: 'docsnav.demoRazonDesc' },
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
