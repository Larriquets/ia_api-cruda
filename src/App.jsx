import { useState, useRef, useEffect, useCallback } from 'react'
import BrandHome from './BrandHome.jsx'
import {
  sendChatMessage,
  sendResponseMessage,
  createConversation,
  fetchConversationItems,
  OPENAI_CHAT_MODELS,
} from './openai.js'
import { sendClaudeMessage, ANTHROPIC_CHAT_MODELS } from './anthropic.js'
import { sendOllamaMessage } from './ollama.js'
import { sendLmStudioMessage } from './lmstudio.js'
import Contexto from './Contexto.jsx'
import Proveedores from './Proveedores.jsx'
import Editor from './Editor.jsx'
import LoopAgentico from './LoopAgentico.jsx'
import EditorAgentsMd from './EditorAgentsMd.jsx'
import VentanaContexto from './VentanaContexto.jsx'
import PromptInjection from './PromptInjection.jsx'
import Razonamiento from './Razonamiento.jsx'
import Logprobs from './Logprobs.jsx'
import Tokens from './Tokens.jsx'
import Mcp from './Mcp.jsx'
import Ruido from './Ruido.jsx'
import Rag from './Rag.jsx'
import Especificidad from './Especificidad.jsx'
import Docs from './Docs.jsx'
import ComoFunciona from './ComoFunciona.jsx'
import Recorrido from './Recorrido.jsx'
import ModosChat from './ModosChat.jsx'
import ModosEditor from './ModosEditor.jsx'
import ComoEdita from './ComoEdita.jsx'
import ModosAgentsMd from './ModosAgentsMd.jsx'
import ModosAgentsMdSkills from './ModosAgentsMdSkills.jsx'
import ModosRag from './ModosRag.jsx'
import ModosTokens from './ModosTokens.jsx'
import ModosLogprobs from './ModosLogprobs.jsx'
import ModosMcp from './ModosMcp.jsx'
import ModosVentana from './ModosVentana.jsx'
import ModosRuido from './ModosRuido.jsx'
import ModosEspecificidad from './ModosEspecificidad.jsx'
import ModosInjection from './ModosInjection.jsx'
import ModosRazonamiento from './ModosRazonamiento.jsx'
import Entrada from './Entrada.jsx'
import Tutos from './Tutos.jsx'
import DemoBacklink from './DemoBacklink.jsx'
import MissingKeyNotice from './MissingKeyNotice.jsx'
import ModeSwitch from './ModeSwitch.jsx'
import ReadDocLink from './ReadDocLink.jsx'
import ConfigBar from './ConfigBar.jsx'
import LmStudioModelPicker from './LmStudioModelPicker.jsx'
import WelcomeModal from './WelcomeModal.jsx'
import SystemEditor from './SystemEditor.jsx'
import TemperatureControl from './TemperatureControl.jsx'
import FirstTenMinutesGuide from './FirstTenMinutesGuide.jsx'
import { CHAT_DEFAULT_SYSTEM, getChatDefaultSystem, getChatPresets, isDefaultChatSystem } from './system-presets.js'
import { useT } from './i18n/useT.js'

const CONTEXT_STORAGE_KEY = 'chat_context_snapshot'
const CONV_ID_KEY = 'openai_conversation_id'
const PROVIDER_KEY = 'chat_provider'
const MODEL_OPENAI_KEY = 'chat_model_openai'
const MODEL_ANTHROPIC_KEY = 'chat_model_anthropic'
const LOGS_KEY = 'chat_logs'
const SYSTEM_KEY = 'chat_system_prompt'
const SYSTEM_OPEN_KEY = 'chat_system_open'
const TEMP_KEY = 'chat_temperature'
const LOGS_MAX = 500
const GUIDE_JSON_SYSTEM = 'Responde siempre como JSON valido. No uses Markdown. La raiz debe ser un objeto con las claves "respuesta" y "items".'

const buildInitialMessages = (systemPrompt) => [
  { role: 'system', content: systemPrompt || CHAT_DEFAULT_SYSTEM },
]

const buildGuideContextMessages = (systemPrompt) => [
  { role: 'system', content: systemPrompt || CHAT_DEFAULT_SYSTEM },
  { role: 'user', content: 'Estoy armando una app para aprender IA desde la API. Quiero entender que viaja en cada request.' },
  { role: 'assistant', content: 'Buen punto de partida: mira el array messages, el system prompt y el mensaje actual. Esa es la parte visible del contexto.' },
  { role: 'user', content: 'Tambien quiero mostrar que el historial no vive magicamente dentro del modelo.' },
  { role: 'assistant', content: 'Entonces conviene comparar un modo crudo con un modo conversacion. En crudo solo viaja el ultimo turno; en conversacion viaja el historial.' },
  { role: 'user', content: 'Agrega mucho ruido conceptual: tokens, memoria, providers, razonamiento y agentes.' },
  { role: 'assistant', content: 'Eso permite una segunda capa didactica: cuando el contexto crece, la app tiene que decidir que conservar, resumir o dejar afuera.' },
  { role: 'user', content: 'Este mensaje representa informacion vieja que tal vez ya no entre completa en una ventana chica de contexto.' },
  { role: 'assistant', content: 'Exacto. En una estrategia FIFO se perderia primero lo mas antiguo. En sliding window se conservan los ultimos turnos completos.' },
  { role: 'user', content: 'Ultima pregunta: si ahora mando un request nuevo, que deberia mirar?' },
  { role: 'assistant', content: 'Mira que mensajes aparecen marcados como parte del request y cuantos tokens estimados consume cada bloque.' },
]

export default function App() {
  const { t, lang } = useT()
  const [systemPrompt, setSystemPrompt] = useState(() => {
    if (typeof window === 'undefined') return getChatDefaultSystem(lang)
    return localStorage.getItem(SYSTEM_KEY) ?? getChatDefaultSystem(lang)
  })
  const [systemOpen, setSystemOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SYSTEM_OPEN_KEY) === '1'
  })
  const [temperature, setTemperature] = useState(() => {
    if (typeof window === 'undefined') return 0.7
    const raw = localStorage.getItem(TEMP_KEY)
    const parsed = raw != null ? parseFloat(raw) : NaN
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 2 ? parsed : 0.7
  })
  const [guideActive, setGuideActive] = useState(false)
  const [guideStep, setGuideStep] = useState(0)
  const [messages, setMessages] = useState(() => buildInitialMessages(
    typeof window === 'undefined' ? getChatDefaultSystem(lang) : (localStorage.getItem(SYSTEM_KEY) ?? getChatDefaultSystem(lang)),
  ))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rawRequest, setRawRequest] = useState(null)
  const [rawResponse, setRawResponse] = useState(null)
  const [logs, setLogs] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOGS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  // Si al montar vinieron líneas de localStorage, el panel les pone arriba un
  // divisor "sesión anterior" para que no parezcan actividad de ahora.
  const [hasRestoredLogs, setHasRestoredLogs] = useState(logs.length > 0)
  const [rawMode, setRawMode] = useState(true)
  const [persistentMode, setPersistentMode] = useState(false)
  const [provider, setProvider] = useState(() => {
    if (typeof window === 'undefined') return 'openai'
    const saved = localStorage.getItem(PROVIDER_KEY)
    if (saved === 'openai' || saved === 'anthropic' || saved === 'lmstudio') return saved
    return 'openai'
  })
  const [modelOpenAI, setModelOpenAI] = useState(() => {
    if (typeof window === 'undefined') return 'gpt-4o-mini'
    return localStorage.getItem(MODEL_OPENAI_KEY) || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
  })
  const [modelAnthropic, setModelAnthropic] = useState(() => {
    if (typeof window === 'undefined') return 'claude-haiku-4-5'
    return localStorage.getItem(MODEL_ANTHROPIC_KEY) || import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-haiku-4-5'
  })
  const [conversationId, setConversationId] = useState(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CONV_ID_KEY) || null
  })
  const [serverHistory, setServerHistory] = useState([])
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 'chat'
    if (window.location.pathname === '/') return 'entrada'
    if (window.location.pathname === '/chat') return 'chat'
    if (window.location.pathname === '/contexto') return 'contexto'
    if (window.location.pathname === '/proveedores') return 'proveedores'
    if (window.location.pathname === '/editor') return 'editor'
    if (window.location.pathname === '/loop-agentico') return 'loop-agentico'
    if (window.location.pathname === '/agents-md') return 'agents-md'
    if (window.location.pathname === '/agents-md-skills') return 'agents-md-skills'
    if (window.location.pathname === '/ventana-contexto') return 'ventana-contexto'
    if (window.location.pathname === '/prompt-injection') return 'prompt-injection'
    if (window.location.pathname === '/razonamiento') return 'razonamiento'
    if (window.location.pathname === '/logprobs') return 'logprobs'
    if (window.location.pathname === '/tokens') return 'tokens'
    if (window.location.pathname === '/mcp') return 'mcp'
    if (window.location.pathname === '/ruido') return 'ruido'
    if (window.location.pathname === '/rag') return 'rag'
    if (window.location.pathname === '/especificidad') return 'especificidad'
    if (window.location.pathname === '/docs') return 'docs'
    if (window.location.pathname === '/como-funciona') return 'como-funciona'
    if (window.location.pathname === '/recorrido') return 'recorrido'
    if (window.location.pathname === '/tutos/memoria') return 'tuto-memoria'
    if (window.location.pathname === '/tutos/tokens') return 'tuto-tokens'
    if (window.location.pathname === '/tutos/inventa') return 'tuto-inventa'
    if (window.location.pathname === '/tutos/fuentes') return 'tuto-fuentes'
    if (window.location.pathname === '/tutos/piensa') return 'tuto-piensa'
    if (window.location.pathname === '/tutos/agentes') return 'tuto-agentes'
    if (window.location.pathname === '/tutos/reglas') return 'tuto-reglas'
    if (window.location.pathname === '/demo/chat') return 'demo-chat'
    if (window.location.pathname === '/demo/editor') return 'demo-editor'
    if (window.location.pathname === '/demo/loop') return 'demo-loop'
    if (window.location.pathname === '/demo/rag') return 'demo-rag'
    if (window.location.pathname === '/demo/tokens') return 'demo-tokens'
    if (window.location.pathname === '/demo/logprobs') return 'demo-logprobs'
    if (window.location.pathname === '/demo/mcp') return 'demo-mcp'
    if (window.location.pathname === '/demo/ventana-contexto') return 'demo-ventana-contexto'
    if (window.location.pathname === '/demo/ruido') return 'demo-ruido'
    if (window.location.pathname === '/demo/especificidad') return 'demo-especificidad'
    if (window.location.pathname === '/demo/prompt-injection') return 'demo-prompt-injection'
    if (window.location.pathname === '/demo/razonamiento') return 'demo-razonamiento'
    if (window.location.pathname === '/demo/agents-md') return 'demo-agents-md'
    if (window.location.pathname === '/demo/agents-md-skills') return 'demo-agents-md-skills'
    return 'chat'
  })
  const chatRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  useEffect(() => {
    try {
      localStorage.setItem(
        CONTEXT_STORAGE_KEY,
        JSON.stringify({ messages, updatedAt: Date.now() })
      )
    } catch {
      // localStorage lleno o no disponible
    }

    console.groupCollapsed(
      `%c[CONTEXTO] ${messages.length} mensaje(s)`,
      'color:#fbbf24;font-weight:600'
    )
    console.table(
      messages.map((m, i) => ({
        '#': i,
        role: m.role,
        content: m.content.length > 80 ? m.content.slice(0, 77) + '...' : m.content,
        chars: m.content.length,
      }))
    )
    console.log('Array completo:', messages)
    console.groupEnd()
  }, [messages])

  useEffect(() => {
    try {
      const trimmed = logs.slice(-LOGS_MAX)
      localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed))
    } catch {
      // localStorage lleno o no disponible
    }
  }, [logs])

  // Al cambiar de idioma, si el system sigue siendo un default (de cualquier idioma)
  // o está vacío, lo swapeamos al default del nuevo idioma. Si el alumno lo personalizó,
  // se respeta tal cual.
  useEffect(() => {
    setSystemPrompt((prev) => (isDefaultChatSystem(prev) ? getChatDefaultSystem(lang) : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    try { localStorage.setItem(SYSTEM_KEY, systemPrompt) } catch { /* noop */ }
    setMessages((prev) => {
      const effective = systemPrompt.trim() ? systemPrompt : getChatDefaultSystem(lang)
      if (prev.length > 0 && prev[0].role === 'system') {
        if (prev[0].content === effective) return prev
        const next = prev.slice()
        next[0] = { role: 'system', content: effective }
        return next
      }
      return [{ role: 'system', content: effective }, ...prev]
    })
  }, [systemPrompt])

  useEffect(() => {
    try { localStorage.setItem(SYSTEM_OPEN_KEY, systemOpen ? '1' : '0') } catch { /* noop */ }
  }, [systemOpen])

  useEffect(() => {
    try { localStorage.setItem(TEMP_KEY, String(temperature)) } catch { /* noop */ }
  }, [temperature])

  useEffect(() => {
    if (persistentMode && conversationId) {
      refreshServerHistory(conversationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistentMode])

  const appendLog = useCallback((level, message) => {
    const timestamp = new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-AR', { hour12: false })
    setLogs((prev) => [...prev, { level, message, timestamp }])
  }, [lang])

  const resetLocalConversation = (nextSystem = systemPrompt) => {
    setMessages(buildInitialMessages(nextSystem))
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    setServerHistory([])
  }

  const startGuide = () => {
    setGuideActive(true)
    setGuideStep(0)
    setRawMode(true)
    setPersistentMode(false)
    resetLocalConversation(systemPrompt)
    appendLog('info', t('app.logGuideStart'))
  }

  const stopGuide = () => {
    setGuideActive(false)
    appendLog('info', t('app.logGuideClose'))
  }

  const prepareGuideStep = (step) => {
    setGuideStep(step)
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    setServerHistory([])

    if (step === 0) {
      setRawMode(true)
      setPersistentMode(false)
      setMessages(buildInitialMessages(systemPrompt))
      appendLog('info', t('app.logGuideStep1'))
      return
    }

    if (step === 1) {
      setRawMode(false)
      setPersistentMode(false)
      setMessages(buildInitialMessages(systemPrompt))
      appendLog('info', t('app.logGuideStep2'))
      return
    }

    if (step === 2) {
      setRawMode(true)
      setPersistentMode(false)
      setSystemPrompt(GUIDE_JSON_SYSTEM)
      setSystemOpen(true)
      setMessages(buildInitialMessages(GUIDE_JSON_SYSTEM))
      appendLog('info', t('app.logGuideStep3'))
      return
    }

    if (step === 3) {
      setRawMode(false)
      setPersistentMode(false)
      setMessages(buildGuideContextMessages(systemPrompt))
      appendLog('info', t('app.logGuideStep4'))
    }
  }

  const useGuidePrompt = (prompt) => {
    setInput(prompt)
    appendLog('info', t('app.logGuidePhrase', { prompt }))
  }

  const ensureConversationId = async () => {
    if (conversationId) return conversationId
    appendLog('info', t('app.logNoConvId'))
    const id = await createConversation({ onLog: appendLog })
    setConversationId(id)
    localStorage.setItem(CONV_ID_KEY, id)
    return id
  }

  const refreshServerHistory = async (id) => {
    try {
      const items = await fetchConversationItems(id, { onLog: appendLog })
      setServerHistory(items)
    } catch (err) {
      appendLog('error', t('app.logRefreshFail', { error: err.message }))
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    appendLog('user', t('app.logUserSends', { text }))

    try {
      if (persistentMode && provider === 'openai') {
        appendLog('info', t('app.logPersistActive'))

        const id = await ensureConversationId()

        setMessages((prev) => [...prev, { role: 'user', content: text }])

        const effectiveSystem = systemPrompt.trim() ? systemPrompt : getChatDefaultSystem(lang)
        const reply = await sendResponseMessage(text, id, {
          onLog: appendLog,
          onRawRequest: setRawRequest,
          onRawResponse: setRawResponse,
          instructions: effectiveSystem,
          temperature,
          model: modelOpenAI,
        })

        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        appendLog('success', t('app.logAdded'))

        refreshServerHistory(id)
      } else {
        const payload = rawMode
          ? [...buildInitialMessages(systemPrompt), { role: 'user', content: text }]
          : [...messages, { role: 'user', content: text }]

        const userMsg = { role: 'user', content: text }
        const baseMessages = rawMode ? buildInitialMessages(systemPrompt) : [...messages]

        if (provider === 'lmstudio') {
          // Streaming: agrega user + placeholder de assistant antes del fetch
          // para que el usuario vea el mensaje propio de inmediato.
          setMessages([...baseMessages, userMsg, { role: 'assistant', content: '' }])
        } else if (!rawMode) {
          setMessages([...messages, userMsg])
        } else {
          setMessages([...buildInitialMessages(systemPrompt), userMsg])
        }

        if (rawMode) {
          appendLog('info', t('app.logRawActive'))
        } else {
          appendLog('info', t('app.logConvActive', { n: payload.length }))
        }

        const sendFn =
          provider === 'anthropic'
            ? sendClaudeMessage
            : provider === 'ollama'
              ? sendOllamaMessage
              : provider === 'lmstudio'
                ? sendLmStudioMessage
                : sendChatMessage
        const providerLabel =
          provider === 'anthropic'
            ? t('app.provAnthropic')
            : provider === 'ollama'
              ? t('app.provOllama')
              : provider === 'lmstudio'
                ? t('app.provLmstudio')
                : t('app.provOpenAI')
        appendLog('info', t('app.logProviderIs', { label: providerLabel }))

        // onToken: solo para LM Studio. Actualiza el último mensaje del assistant
        // en tiempo real a medida que llegan los chunks SSE.
        let streamingText = ''
        const onToken = provider === 'lmstudio'
          ? (chunk) => {
              streamingText += chunk
              setMessages((prev) => {
                if (prev.length === 0 || prev[prev.length - 1].role !== 'assistant') return prev
                return [...prev.slice(0, -1), { role: 'assistant', content: streamingText }]
              })
            }
          : undefined

        // LM Studio y Ollama resuelven su modelo adentro del wrapper
        // (localStorage / env), así que solo OpenAI y Claude reciben override.
        const model =
          provider === 'anthropic' ? modelAnthropic
            : provider === 'openai' ? modelOpenAI
              : undefined

        const reply = await sendFn(payload, {
          onLog: appendLog,
          onRawRequest: setRawRequest,
          onRawResponse: setRawResponse,
          temperature,
          onToken,
          model,
        })

        if (provider !== 'lmstudio') {
          // Para proveedores no-streaming, setear el array completo al final
          if (rawMode) {
            setMessages([
              ...buildInitialMessages(systemPrompt),
              userMsg,
              { role: 'assistant', content: reply },
            ])
          } else {
            setMessages([...messages, userMsg, { role: 'assistant', content: reply }])
          }
        }
        appendLog('success', t('app.logAdded'))
      }
    } catch (err) {
      setError(err.message || t('app.errGeneric'))
      appendLog('error', err.message || t('app.errUnknown'))
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages(buildInitialMessages(systemPrompt))
    setError(null)
    setRawRequest(null)
    setRawResponse(null)
    setServerHistory([])
    appendLog('info', t('app.logResetLocal'))
  }

  const handleClearLogs = () => {
    setLogs([])
    setHasRestoredLogs(false)
    try {
      localStorage.removeItem(LOGS_KEY)
    } catch { /* noop */ }
  }

  const handleNewConversation = () => {
    localStorage.removeItem(CONV_ID_KEY)
    setConversationId(null)
    setServerHistory([])
    setMessages(buildInitialMessages(systemPrompt))
    appendLog('info', t('app.logConvDiscarded'))
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system')

  const estimateTokens = (text) => Math.ceil((text || '').length / 4)
  const contextTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)

  const goHome = () => { window.location.href = '/' }
  if (page === 'entrada') {
    // La landing es la bienvenida: no monta el WelcomeModal.
    // (El WelcomeModal describe los 5 modos del taller, así que solo se monta
    // en esas cinco páginas — no en labs, demos, tutos ni recorrido.)
    return <Entrada />
  }
  if (page === 'contexto') {
    return <Contexto onBack={goHome} />
  }
  if (page === 'proveedores') {
    return <Proveedores onBack={goHome} />
  }
  if (page === 'editor') {
    return <><WelcomeModal /><Editor onBack={goHome} /></>
  }
  if (page === 'loop-agentico') {
    return <><WelcomeModal /><LoopAgentico /></>
  }
  if (page === 'agents-md') {
    return <><WelcomeModal /><EditorAgentsMd withSkills={false} /></>
  }
  if (page === 'agents-md-skills') {
    return <><WelcomeModal /><EditorAgentsMd withSkills={true} /></>
  }
  if (page === 'ventana-contexto') {
    return <VentanaContexto />
  }
  if (page === 'prompt-injection') {
    return <PromptInjection />
  }
  if (page === 'razonamiento') {
    return <Razonamiento />
  }
  if (page === 'logprobs') {
    return <Logprobs />
  }
  if (page === 'tokens') {
    return <Tokens />
  }
  if (page === 'mcp') {
    return <Mcp />
  }
  if (page === 'ruido') {
    return <Ruido />
  }
  if (page === 'rag') {
    return <Rag />
  }
  if (page === 'especificidad') {
    return <Especificidad />
  }
  if (page === 'docs') {
    return <Docs />
  }
  if (page === 'como-funciona') {
    return <ComoFunciona />
  }
  if (page === 'recorrido') {
    return <Recorrido />
  }
  if (page === 'tuto-memoria') {
    return <Tutos tema="memoria" />
  }
  if (page === 'tuto-tokens') {
    return <Tutos tema="tokens" />
  }
  if (page === 'tuto-inventa') {
    return <Tutos tema="inventa" />
  }
  if (page === 'tuto-fuentes') {
    return <Tutos tema="fuentes" />
  }
  if (page === 'tuto-piensa') {
    return <Tutos tema="piensa" />
  }
  if (page === 'tuto-agentes') {
    return <Tutos tema="agentes" />
  }
  if (page === 'tuto-reglas') {
    return <Tutos tema="reglas" />
  }
  if (page === 'demo-chat') {
    return <ModosChat />
  }
  if (page === 'demo-editor') {
    return <ModosEditor />
  }
  if (page === 'demo-loop') {
    return <ComoEdita />
  }
  if (page === 'demo-rag') {
    return <ModosRag />
  }
  if (page === 'demo-tokens') {
    return <ModosTokens />
  }
  if (page === 'demo-logprobs') {
    return <ModosLogprobs />
  }
  if (page === 'demo-mcp') {
    return <ModosMcp />
  }
  if (page === 'demo-ventana-contexto') {
    return <ModosVentana />
  }
  if (page === 'demo-ruido') {
    return <ModosRuido />
  }
  if (page === 'demo-especificidad') {
    return <ModosEspecificidad />
  }
  if (page === 'demo-prompt-injection') {
    return <ModosInjection />
  }
  if (page === 'demo-razonamiento') {
    return <ModosRazonamiento />
  }
  if (page === 'demo-agents-md') {
    return <ModosAgentsMd />
  }
  if (page === 'demo-agents-md-skills') {
    return <ModosAgentsMdSkills />
  }

  return (
    <div className="app">
      <WelcomeModal />
      <header className="header">
        <h1>
          <BrandHome />
          <span className="brand-subtitle">{t('app.subtitlePre')}<span className="brand-mode">{t('app.modeChat')}</span>{t('app.subtitlePost')}</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="chat" />
        </div>
      </header>

      <DemoBacklink href="/demo/chat" />
      <MissingKeyNotice provider={provider} demoHref="/demo/chat" />

      <ConfigBar>
        <label className="hdr-select">
          <span className="hdr-select-label">{t('app.provider')}</span>
          <select
            value={provider}
            onChange={(e) => {
              const next = e.target.value
              setProvider(next)
              localStorage.setItem(PROVIDER_KEY, next)
              if (next !== 'openai' && persistentMode) {
                setPersistentMode(false)
                appendLog('info', t('app.logPersistOff'))
              }
              const label =
                next === 'anthropic'
                  ? t('app.provAnthropic')
                  : next === 'lmstudio'
                    ? t('app.provLmstudio')
                    : t('app.provOpenAI')
              appendLog('info', t('app.logProviderChanged', { label }))
            }}
            className={`hdr-select-input provider-select-${provider}`}
          >
            <option value="openai">🟢 OpenAI</option>
            <option value="anthropic">🟠 Claude (Anthropic)</option>
            <option value="lmstudio">🔵 LM Studio (local)</option>
          </select>
        </label>

        {provider === 'lmstudio' ? (
          <LmStudioModelPicker onLog={appendLog} />
        ) : provider === 'anthropic' ? (
          <label className="hdr-select">
            <span className="hdr-select-label">{t('app.model')}</span>
            <select
              value={modelAnthropic}
              onChange={(e) => {
                setModelAnthropic(e.target.value)
                localStorage.setItem(MODEL_ANTHROPIC_KEY, e.target.value)
                appendLog('info', t('app.logClaudeModel', { model: e.target.value }))
              }}
              disabled={loading}
              className="hdr-select-input"
              title={t('app.claudeModelTitle')}
            >
              {ANTHROPIC_CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} — {t(m.noteKey)}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="hdr-select">
            <span className="hdr-select-label">{t('app.model')}</span>
            <select
              value={modelOpenAI}
              onChange={(e) => {
                setModelOpenAI(e.target.value)
                localStorage.setItem(MODEL_OPENAI_KEY, e.target.value)
                appendLog('info', t('app.logOpenaiModel', { model: e.target.value }))
              }}
              disabled={loading}
              className="hdr-select-input"
              title={t('app.openaiModelTitle')}
            >
              {OPENAI_CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label} — {t(m.noteKey)}</option>
              ))}
            </select>
          </label>
        )}

        <button onClick={handleClear} className="clear-btn" type="button">{t('app.clear')}</button>

        <div className="config-bar-actions">
          <a
            href="/demo/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="read-doc-link view-demo-link"
            title={t('app.viewDemoTitle')}
          >
            {t('app.viewDemo')}
          </a>
          <ReadDocLink section="modo-chat" />
        </div>
      </ConfigBar>

      <div className="layout">
        {/* Panel 1 — Chat */}
        <section className="panel chat-panel">
          <div className="panel-title">
            <span>{t('app.panelChat')}</span>
            <span className="panel-provider">
              <span className={`provider-badge provider-badge-${provider}`}>
                {provider === 'anthropic'
                  ? '🟠 Claude'
                  : provider === 'ollama'
                    ? '🟣 Ollama'
                    : provider === 'lmstudio'
                      ? '🔵 LM Studio'
                      : '🟢 OpenAI'}
              </span>
              <a
                href="/proveedores"
                target="_blank"
                rel="noopener noreferrer"
                className="hdr-aux-link"
                title={t('app.compareTitle')}
              >
                {t('app.compare')}
              </a>
            </span>
          </div>

          <div className="mode-segmented" role="tablist" aria-label={t('app.modeLabel')}>
            <span className="mode-segmented-label">{t('app.modeLabel')}</span>
            <button
              type="button"
              role="tab"
              aria-selected={rawMode}
              className={`mode-seg-btn mode-seg-raw${rawMode ? ' active' : ''}`}
              onClick={() => {
                if (rawMode) return
                setPersistentMode(false)
                setRawMode(true)
                appendLog('info', t('app.logModeRaw'))
              }}
              title={t('app.modeRawTitle')}
            >
              {t('app.modeRaw')}
              <span className="mode-seg-sub">{t('app.modeRawSub')}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!rawMode && !persistentMode}
              className={`mode-seg-btn mode-seg-conversation${!rawMode && !persistentMode ? ' active' : ''}`}
              onClick={() => {
                if (!rawMode && !persistentMode) return
                setPersistentMode(false)
                setRawMode(false)
                appendLog('info', t('app.logModeConv'))
              }}
              title={t('app.modeConvTitle')}
            >
              {t('app.modeConv')}
              <span className="mode-seg-sub">{t('app.modeConvSub')}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={persistentMode}
              disabled={provider !== 'openai'}
              className={`mode-seg-btn mode-seg-persistent${persistentMode ? ' active' : ''}`}
              onClick={() => {
                if (persistentMode) return
                setPersistentMode(true)
                setRawMode(false)
                appendLog('info', t('app.logModePersist'))
              }}
              title={provider !== 'openai'
                ? t('app.modePersistTitleOnly')
                : t('app.modePersistTitle')}
            >
              {t('app.modePersist')}
              <span className="mode-seg-sub">
                {provider !== 'openai' ? t('app.modePersistSubOnly') : t('app.modePersistSub')}
              </span>
            </button>
            {persistentMode && (
              <button
                onClick={handleNewConversation}
                className="mode-seg-aux"
                type="button"
                title={t('app.newServerConvTitle')}
              >
                {t('app.newServerConv')}
              </button>
            )}
          </div>

          <SystemEditor
            value={systemPrompt}
            onChange={setSystemPrompt}
            defaultPrompt={getChatDefaultSystem(lang)}
            open={systemOpen}
            onToggleOpen={setSystemOpen}
            disabled={loading}
            presets={getChatPresets(lang)}
            onLog={appendLog}
            hint={
              rawMode
                ? t('app.hintRaw')
                : persistentMode
                  ? t('app.hintPersist')
                  : t('app.hintConv')
            }
          />

          <TemperatureControl
            value={temperature}
            onChange={setTemperature}
            disabled={loading}
            clampedTo={provider === 'anthropic' ? 1 : null}
          />

          <div className="chat" ref={chatRef}>
            {visibleMessages.length === 0 && (
              <div className="empty">{t('app.emptyChat')}</div>
            )}
            {visibleMessages.map((msg, i) => (
              <div key={i} className={`bubble bubble-${msg.role}`}>
                <div className="role">{msg.role === 'user' ? t('app.roleUser') : t('app.roleAssistant')}</div>
                <div className="content">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="bubble bubble-assistant">
                <div className="role">{t('app.roleAssistant')}</div>
                <div className="content">{t('app.writing')}</div>
              </div>
            )}
            {error && <div className="error">{error}</div>}
          </div>

          <form onSubmit={handleSend} className="composer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('app.composerPlaceholder')}
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()}>{t('app.send')}</button>
          </form>

          {!rawMode && !persistentMode && (
            <div className="context-section">
              <div className="context-header">
                <span className="context-title">{t('app.ctxClientTitle')}</span>
                <span className="context-header-right">
                  <span className="context-meta">
                    {t('app.ctxMeta', { n: messages.length, tokens: contextTokens })}
                  </span>
                  <a
                    href="/contexto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="docs-link criollo-link"
                    title={t('app.explainTitle')}
                  >
                    {t('app.explain')}
                  </a>
                </span>
              </div>
              <div className="context-list">
                {messages.map((m, i) => (
                  <div key={i} className={`ctx-msg ctx-${m.role}`}>
                    <span className="ctx-role">{m.role}</span>
                    <span className="ctx-content">{m.content}</span>
                    <span className="ctx-tokens">≈{estimateTokens(m.content)}t</span>
                  </div>
                ))}
              </div>
              <div className="context-foot">
                {t('app.ctxClientFootPre')} <code>messages[]</code> {t('app.ctxClientFootPost')}
              </div>
            </div>
          )}

          {persistentMode && (
            <div className="context-section context-server">
              <div className="context-header">
                <span className="context-title">{t('app.ctxServerTitle')}</span>
                <span className="context-header-right">
                  <span className="context-meta">
                    {conversationId
                      ? t('app.ctxServerItems', { n: serverHistory.length, id: conversationId.slice(0, 12) })
                      : t('app.ctxServerNone')}
                  </span>
                  {conversationId && (
                    <button
                      type="button"
                      onClick={() => refreshServerHistory(conversationId)}
                      className="docs-link criollo-link"
                      title={t('app.refreshTitle')}
                    >
                      {t('app.refresh')}
                    </button>
                  )}
                </span>
              </div>
              {conversationId ? (
                <>
                  <div className="context-list">
                    {serverHistory.length === 0 && (
                      <div className="empty" style={{ fontSize: 12 }}>
                        {t('app.ctxServerEmpty')}
                      </div>
                    )}
                    {serverHistory.map((item, i) => {
                      const role = item.role || item.type || '?'
                      const content = Array.isArray(item.content)
                        ? item.content.map((c) => c.text || c.input_text || c.output_text || '').join(' ')
                        : (item.content || JSON.stringify(item))
                      return (
                        <div key={item.id || i} className={`ctx-msg ctx-${role}`}>
                          <span className="ctx-role">{role}</span>
                          <span className="ctx-content">{content}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="context-foot">
                    {t('app.ctxServerFootPre')} <code>api.openai.com</code> {t('app.ctxServerFootMid')}
                    <code>{conversationId}</code>{t('app.ctxServerFootPost')}
                  </div>
                </>
              ) : (
                <div className="context-foot">
                  {t('app.ctxServerFootEmpty1')}
                  (<code>POST /v1/conversations</code>{t('app.ctxServerFootEmpty2')}
                </div>
              )}
            </div>
          )}

          {rawMode && (
            <div className="context-section context-raw-warning">
              <div className="context-header">
                <span className="context-title">{t('app.ctxAcc')}</span>
                <span className="context-header-right">
                  <span className="context-meta context-meta-warn">{t('app.ctxRawWarn')}</span>
                  <a
                    href="/contexto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="docs-link criollo-link"
                    title={t('app.explainTitle')}
                  >
                    {t('app.explain')}
                  </a>
                </span>
              </div>
              <div className="context-foot">
                {t('app.ctxRawFootPre')} <code>system</code> {t('app.ctxRawFootPost')}
              </div>
            </div>
          )}
        </section>

        {/* Panel 2 — Request/Response crudo */}
        <section className="panel raw-panel">
          <div className="panel-title">
            <span>{t('app.panelReq')}</span>
            <span className="panel-links">
              <a
                href="/como-funciona"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title={t('app.docsReqTitle')}
              >
                {t('app.docs')}
              </a>
            </span>
          </div>
          <pre className="raw">
            {rawRequest
              ? JSON.stringify(rawRequest, null, 2)
              : t('app.noReq')}
          </pre>
          <div className="panel-title panel-title-sub">
            <span>{t('app.panelRes')}</span>
            <span className="panel-links">
              <a
                href="/como-funciona"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
                title={t('app.docsResTitle')}
              >
                {t('app.docs')}
              </a>
            </span>
          </div>
          <pre className="raw">
            {rawResponse
              ? JSON.stringify(rawResponse, null, 2)
              : t('app.noRes')}
          </pre>
          {rawResponse && (
            <details className="field-guide">
              <summary>{t('app.fieldGuide')}</summary>
              <ul>
                <li><code>id</code> — {t('app.fg_id')}</li>
                <li><code>object</code> — {t('app.fg_object')} <code>chat.completion</code>.</li>
                <li><code>created</code> — {t('app.fg_created')}</li>
                <li><code>model</code> — {t('app.fg_model')}</li>
                <li><code>choices[]</code> — {t('app.fg_choices')}</li>
                <li><code>choices[].message.role</code> — {t('app.fg_role')}<code>assistant</code>).</li>
                <li><code>choices[].message.content</code> — {t('app.fg_content')}</li>
                <li><code>choices[].finish_reason</code> — {t('app.fg_finish')} <code>stop</code>, <code>length</code>, <code>content_filter</code>, etc.</li>
                <li><code>choices[].index</code> — {t('app.fg_index')}</li>
                <li><code>usage.prompt_tokens</code> — {t('app.fg_prompt_tokens')}</li>
                <li><code>usage.completion_tokens</code> — {t('app.fg_completion_tokens')}</li>
                <li><code>usage.total_tokens</code> — {t('app.fg_total_tokens')}</li>
                <li><code>system_fingerprint</code> — {t('app.fg_fingerprint')}</li>
              </ul>
              <a
                href="https://platform.openai.com/docs/api-reference/chat/object"
                target="_blank"
                rel="noopener noreferrer"
                className="docs-link"
              >
                {t('app.fg_ref')}
              </a>
            </details>
          )}
        </section>

        {/* Panel 3 — Log de proceso */}
        <section className="panel log-panel">
          <div className="panel-title">
            <span>{t('app.panelLog')}</span>
            <span className="panel-links">
              <span className="context-meta">
                {t('app.logLines', { n: logs.length })}
              </span>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="docs-link"
                  title={t('app.logClearTitle')}
                >
                  {t('app.logClear')}
                </button>
              )}
            </span>
          </div>
          <div className="log" ref={logRef}>
            {logs.length === 0 && <div className="empty">{t('app.logEmpty')}</div>}
            {hasRestoredLogs && logs.length > 0 && (
              <div className="log-restored-divider">{t('app.logPrevSession')}</div>
            )}
            {logs.map((entry, i) => (
              <div key={i} className={`log-line log-${entry.level}`}>
                <span className="log-time">{entry.timestamp}</span>
                <span className="log-level">[{entry.level}]</span>
                <span className="log-msg">{entry.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
