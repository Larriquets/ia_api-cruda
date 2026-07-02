// Preguntas humanas de la puerta "Entender" (puerta 1): cada una mapea a
// una demo sin API (o al tokenizer, que corre 100% local). Nombradas por la
// pregunta que trae la gente real, no por la tecnología que la responde.
// Las usan la landing (Entrada.jsx) y el dropdown "Entender" del header
// (ModeSwitch.jsx) — un solo lugar para que no se desincronicen.
export const PREGUNTAS = [
  { emoji: '✉️', href: '/demo/chat', labelKey: 'entrada.qMemoriaLabel', subKey: 'entrada.qMemoriaSub' },
  { emoji: '🧩', href: '/tokens', labelKey: 'entrada.qTokensLabel', subKey: 'entrada.qTokensSub' },
  { emoji: '📚', href: '/demo/rag', labelKey: 'entrada.qRagLabel', subKey: 'entrada.qRagSub' },
  { emoji: '🧠', href: '/demo/razonamiento', labelKey: 'entrada.qPiensaLabel', subKey: 'entrada.qPiensaSub' },
  { emoji: '🤖', href: '/demo/loop', labelKey: 'entrada.qHaceLabel', subKey: 'entrada.qHaceSub' },
  { emoji: '📋', href: '/demo/agents-md', labelKey: 'entrada.qReglasLabel', subKey: 'entrada.qReglasSub' },
]
