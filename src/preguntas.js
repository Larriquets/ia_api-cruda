// Preguntas humanas de la puerta "Entender" (puerta 1): cada una mapea a
// su tuto (/tutos/*, página guiada con mini-demo sin API). Nombradas por la
// pregunta que trae la gente real, no por la tecnología que la responde.
// Las usan la landing (Entrada.jsx), el dropdown "Entender" del header
// (ModeSwitch.jsx) y la nav de los tutos (Tutos.jsx) — un solo lugar para
// que no se desincronicen. Las demos animadas /demo/* cuelgan de la puerta 2.
export const PREGUNTAS = [
  { emoji: '✉️', href: '/tutos/memoria', labelKey: 'entrada.qMemoriaLabel', subKey: 'entrada.qMemoriaSub' },
  { emoji: '🧩', href: '/tutos/tokens', labelKey: 'entrada.qTokensLabel', subKey: 'entrada.qTokensSub' },
  { emoji: '🔮', href: '/tutos/inventa', labelKey: 'entrada.qInventaLabel', subKey: 'entrada.qInventaSub' },
  { emoji: '📚', href: '/tutos/fuentes', labelKey: 'entrada.qRagLabel', subKey: 'entrada.qRagSub' },
  { emoji: '🧠', href: '/tutos/piensa', labelKey: 'entrada.qPiensaLabel', subKey: 'entrada.qPiensaSub' },
  { emoji: '🤖', href: '/tutos/agentes', labelKey: 'entrada.qHaceLabel', subKey: 'entrada.qHaceSub' },
  { emoji: '📋', href: '/tutos/reglas', labelKey: 'entrada.qReglasLabel', subKey: 'entrada.qReglasSub' },
]
