// Tests determinísticos asociados a cada skill.
// Acá viven las funciones que efectivamente CORREN sobre el código y devuelven
// violaciones — son la parte "verificable" del skill, en contraste con el `body`
// (markdown) que la IA lee como prompt.
//
// Cada testFn recibe el código completo y devuelve un array de violaciones:
//   [{ rule: 'no-hardcoded-strings', message: '...' }, ...]
// Vacío = PASS.
//
// El registry está indexado por id de skill — el mismo id que aparece en la UI
// y en el AGENTS.md. Si un skill no tiene entry en este registry, su test es
// "no implementado" y la tool devuelve un error explicativo.

export const SKILL_TESTS = {
  'arch-check': archCheckTest,
}

export function hasSkillTest(id) {
  return Object.prototype.hasOwnProperty.call(SKILL_TESTS, id)
}

export function runSkillTest(id, code) {
  const fn = SKILL_TESTS[id]
  if (!fn) return null
  return fn(code)
}

// ─────────────────────────────────────────────────────────────────────
// arch-check — sin strings hardcoded, métodos cortos, sin refs fantasma
// ─────────────────────────────────────────────────────────────────────
function archCheckTest(code, { maxMethodLines = 15 } = {}) {
  const violations = []
  const stripped = stripJavaCommentsAndStrings(code)

  // Regla 1 — strings literales con más de 1 char fuera de constantes static final.
  const stringLiteralRe = /"((?:\\.|[^"\\])*)"/g
  const lines = code.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*\/\//.test(line)) continue
    const isConstantDecl = /\bstatic\s+final\s+\w+(\s*<[^>]+>)?\s+\w+\s*=/.test(line)
    if (isConstantDecl) continue
    let m
    stringLiteralRe.lastIndex = 0
    while ((m = stringLiteralRe.exec(line)) !== null) {
      const value = m[1]
      if (value.length <= 1) continue
      violations.push({
        rule: 'no-hardcoded-strings',
        message: `línea ${i + 1}: string literal "${value.length > 30 ? value.slice(0, 30) + '…' : value}" debe vivir en una constante \`static final\`.`,
      })
    }
  }

  // Regla 2 — métodos no más de maxMethodLines líneas.
  const methodSigRe = /(?:public|protected|private|static|final|abstract|synchronized|\s)+[\w<>,\[\]\s]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g
  let m
  while ((m = methodSigRe.exec(stripped)) !== null) {
    const methodName = m[1]
    if (['if', 'while', 'for', 'switch', 'catch'].includes(methodName)) continue
    const startIdx = m.index + m[0].length - 1
    const endIdx = findMatchingBrace(stripped, startIdx)
    if (endIdx === -1) continue
    const lineStart = stripped.slice(0, m.index).split('\n').length
    const lineEnd = stripped.slice(0, endIdx).split('\n').length
    const lineCount = lineEnd - lineStart + 1
    if (lineCount > maxMethodLines) {
      violations.push({
        rule: 'method-too-long',
        message: `método \`${methodName}\` (línea ${lineStart}) tiene ${lineCount} líneas, máximo ${maxMethodLines}.`,
      })
    }
  }

  // Regla 3 — sin referencias a campos/métodos inexistentes.
  const declaredFields = new Set()
  const declaredMethods = new Set()
  const fieldRe = /(?:^|\n)\s*(?:public|protected|private|static|final|\s)+[\w<>,\[\]]+\s+(\w+)\s*[=;]/g
  while ((m = fieldRe.exec(stripped)) !== null) declaredFields.add(m[1])
  const methodNameRe = /(?:public|protected|private|static|final|abstract|synchronized|\s)+[\w<>,\[\]\s]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g
  while ((m = methodNameRe.exec(stripped)) !== null) {
    const n = m[1]
    if (!['if', 'while', 'for', 'switch', 'catch'].includes(n)) declaredMethods.add(n)
  }
  const thisRefRe = /\bthis\.(\w+)/g
  while ((m = thisRefRe.exec(stripped)) !== null) {
    const ref = m[1]
    if (!declaredFields.has(ref) && !declaredMethods.has(ref)) {
      const lineNum = stripped.slice(0, m.index).split('\n').length
      violations.push({
        rule: 'unknown-member',
        message: `línea ${lineNum}: \`this.${ref}\` no corresponde a ningún campo ni método declarado en la clase.`,
      })
    }
  }

  return violations
}

function stripJavaCommentsAndStrings(code) {
  let out = ''
  let i = 0
  const n = code.length
  while (i < n) {
    const c = code[i]
    const next = code[i + 1]
    if (c === '/' && next === '/') {
      while (i < n && code[i] !== '\n') { out += ' '; i++ }
      continue
    }
    if (c === '/' && next === '*') {
      out += '  '; i += 2
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) {
        out += code[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < n) { out += '  '; i += 2 }
      continue
    }
    if (c === '"') {
      out += '"'; i++
      while (i < n && code[i] !== '"') {
        if (code[i] === '\\' && i + 1 < n) { out += '  '; i += 2; continue }
        out += code[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < n) { out += '"'; i++ }
      continue
    }
    out += c
    i++
  }
  return out
}

function findMatchingBrace(text, openIdx) {
  let depth = 0
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}
