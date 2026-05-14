import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toAnthropicPayload } from './anthropic.js'

test('extrae el system fuera de messages y deja user/assistant adentro', () => {
  const { system, messages } = toAnthropicPayload([
    { role: 'system', content: 'sos un asistente' },
    { role: 'user', content: 'hola' },
    { role: 'assistant', content: 'qué hacés' },
  ])

  assert.equal(system, 'sos un asistente')
  assert.deepEqual(messages, [
    { role: 'user', content: 'hola' },
    { role: 'assistant', content: 'qué hacés' },
  ])
})

test('mergea múltiples system messages con doble salto de línea', () => {
  const { system } = toAnthropicPayload([
    { role: 'system', content: 'regla A' },
    { role: 'system', content: 'regla B' },
    { role: 'user', content: 'hi' },
  ])

  assert.equal(system, 'regla A\n\nregla B')
})

test('cae al SYSTEM_PROMPT default cuando no hay system messages', () => {
  const { system } = toAnthropicPayload([{ role: 'user', content: 'hola' }])

  assert.ok(system.length > 0, 'system no puede quedar vacío')
  assert.match(system, /asistente/i)
})

test('descarta roles desconocidos del array messages', () => {
  const { messages } = toAnthropicPayload([
    { role: 'user', content: 'hola' },
    { role: 'tool', content: 'no debería aparecer' },
    { role: 'assistant', content: 'buenas' },
  ])

  assert.deepEqual(messages, [
    { role: 'user', content: 'hola' },
    { role: 'assistant', content: 'buenas' },
  ])
})

test('preserva el orden original de user/assistant', () => {
  const { messages } = toAnthropicPayload([
    { role: 'user', content: '1' },
    { role: 'assistant', content: '2' },
    { role: 'user', content: '3' },
    { role: 'assistant', content: '4' },
  ])

  assert.deepEqual(
    messages.map((m) => m.content),
    ['1', '2', '3', '4']
  )
})
