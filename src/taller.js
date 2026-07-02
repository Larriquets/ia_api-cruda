// Modos y labs de la puerta "Taller" (puerta 2): la lista completa de lo que
// hay detrás de la puerta técnica. La usan la landing (Entrada.jsx) y los
// dropdowns "Modos" y "Labs" del header (ModeSwitch.jsx) — un solo lugar
// para que no se desincronicen, espejo de preguntas.js para la puerta 1.
// El emoji vive acá (dato), no en la clave i18n, para que landing y dropdown
// muestren siempre el mismo.
export const MODOS = [
  { key: 'chat', emoji: '💬', href: '/chat', labelKey: 'modeswitch.chatLabel', subKey: 'modeswitch.chatDesc', titleKey: 'modeswitch.chatTitle' },
  { key: 'editor', emoji: '💻', href: '/editor', labelKey: 'modeswitch.editorLabel', subKey: 'modeswitch.editorDesc', titleKey: 'modeswitch.editorTitle' },
  { key: 'loop-agentico', emoji: '🤖', href: '/loop-agentico', labelKey: 'modeswitch.loopLabel', subKey: 'modeswitch.loopDesc', titleKey: 'modeswitch.loopTitle' },
  { key: 'agents-md', emoji: '📋', href: '/agents-md', labelKey: 'modeswitch.agentsLabel', subKey: 'modeswitch.agentsDesc', titleKey: 'modeswitch.agentsTitle' },
  { key: 'agents-md-skills', emoji: '📋', href: '/agents-md-skills', labelKey: 'modeswitch.skillsLabel', subKey: 'modeswitch.skillsDesc', titleKey: 'modeswitch.skillsTitle' },
]

// Demos animadas sin API: versiones guiadas de los modos/labs. Cuelgan de la
// puerta 2 (el que quiere ver el mecanismo antes de traer keys); la puerta 1
// va a los tutos (/tutos/*). El label es la ruta literal, como en DocsNav.
export const DEMOS = [
  { key: 'demo-chat', emoji: '💬', href: '/demo/chat', label: '/demo/chat', subKey: 'docsnav.demoChatDesc' },
  { key: 'demo-editor', emoji: '💻', href: '/demo/editor', label: '/demo/editor', subKey: 'docsnav.demoEditorDesc' },
  { key: 'demo-loop', emoji: '🤖', href: '/demo/loop', label: '/demo/loop', subKey: 'docsnav.demoLoopDesc' },
  { key: 'demo-rag', emoji: '📚', href: '/demo/rag', label: '/demo/rag', subKey: 'docsnav.demoRagDesc' },
  { key: 'demo-razonamiento', emoji: '🧠', href: '/demo/razonamiento', label: '/demo/razonamiento', subKey: 'docsnav.demoRazonDesc' },
  { key: 'demo-agents-md', emoji: '📋', href: '/demo/agents-md', label: '/demo/agents-md', subKey: 'docsnav.demoAgentsDesc' },
  { key: 'demo-agents-md-skills', emoji: '🧪', href: '/demo/agents-md-skills', label: '/demo/agents-md-skills', subKey: 'docsnav.demoSkillsDesc' },
]

export const LABS = [
  { key: 'razonamiento', emoji: '🧠', href: '/razonamiento', labelKey: 'modeswitch.razonLabel', subKey: 'modeswitch.razonDesc' },
  { key: 'tokens', emoji: '🔡', href: '/tokens', labelKey: 'modeswitch.tokensLabel', subKey: 'modeswitch.tokensDesc' },
  { key: 'logprobs', emoji: '🎲', href: '/logprobs', labelKey: 'modeswitch.logprobsLabel', subKey: 'modeswitch.logprobsDesc' },
  { key: 'mcp', emoji: '🔌', href: '/mcp', labelKey: 'modeswitch.mcpLabel', subKey: 'modeswitch.mcpDesc' },
  { key: 'ventana-contexto', emoji: '🪟', href: '/ventana-contexto', labelKey: 'modeswitch.ctxwinLabel', subKey: 'modeswitch.ctxwinDesc' },
  { key: 'rag', emoji: '📚', href: '/rag', labelKey: 'modeswitch.ragLabel', subKey: 'modeswitch.ragDesc' },
  { key: 'ruido', emoji: '🔊', href: '/ruido', labelKey: 'modeswitch.ruidoLabel', subKey: 'modeswitch.ruidoDesc' },
  { key: 'especificidad', emoji: '🎯', href: '/especificidad', labelKey: 'modeswitch.especLabel', subKey: 'modeswitch.especDesc' },
  { key: 'prompt-injection', emoji: '🛡', href: '/prompt-injection', labelKey: 'modeswitch.piLabel', subKey: 'modeswitch.piDesc' },
]
