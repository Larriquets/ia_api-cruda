# localStorage — claves activas

> Parte de [docs/ARCHITECTURE.md](../ARCHITECTURE.md). Cada modo persiste su propio estado para no pisarse con los otros. Las demos `/demo/*`, la landing `/` y el recorrido no persisten nada.

## Global

| Key | Contenido |
|---|---|
| `lang` | `'es' \| 'en'` — idioma de la UI (ver [i18n.md](i18n.md)) |

## Chat (`/chat`)

| Key | Contenido |
|---|---|
| `chat_context_snapshot` | `{messages, updatedAt}` — leído por `/contexto` con `storage` events para sync entre tabs |
| `chat_logs` | Log capado a `LOGS_MAX = 500` líneas |
| `openai_conversation_id` | ID de la conversación persistente en OpenAI |
| `chat_provider` | `'openai' \| 'anthropic' \| 'lmstudio'` (compartido entre modos; un `'ollama'` guardado de versiones viejas se descarta) |
| `chat_model_openai` | Modelo OpenAI elegido en el dropdown del Chat (fallback a `VITE_OPENAI_MODEL`) |
| `chat_model_anthropic` | Modelo Claude elegido en el dropdown del Chat (fallback a `VITE_ANTHROPIC_MODEL`) |
| `chat_system_prompt` | System editable del Chat |
| `chat_system_open` | Estado plegado del editor de system |
| `chat_temperature` | Slider 0–2, default 0.7 |

## Editor (`/editor`)

`code`, `lang`, `keep_context`, `history`, `cols`, logs, `editor_system_prompt`, `editor_system_open`.

## Loop Agéntico (`/loop-agentico`)

`agente_context_thread` (retomar conversación), `agente_code_snapshot`, `agente_language`, `agente_logs`, `agente_cols`, `agente_system_override`, `agente_system_open`.

## AGENTS.md (`/agents-md*`)

`agentmd_code_snapshot`, `agentmd_agents_md_v4`, `agentmd_skills_v1`, `agentmd_logs`, `agentmd_cols`.

## Ventana de contexto (`/ventana-contexto`)

`ctxwin_messages`, `ctxwin_strategy`, `ctxwin_limit_tokens`, `ctxwin_window_turns`, `ctxwin_provider`, `ctxwin_system_prompt`, `ctxwin_system_open`, `ctxwin_temperature`, `ctxwin_logs`.

## Razonamiento (`/razonamiento`)

`razon_provider`, `razon_model_openai`, `razon_model_anthropic`, `razon_effort`, `razon_summary`, `razon_instructions`, `razon_logs`.

## Logprobs (`/logprobs`)

`logprobs_model`, `logprobs_temperature`, `logprobs_top`, `logprobs_system`, `logprobs_logs`.

## Tokens (`/tokens`)

`tokens_text`, `tokens_encoding`.

## MCP (`/mcp`)

`mcp_host`, `mcp_logs`, `mcp_provider`, `mcp_agent_system`.

## Ruido (`/ruido`)

`ruido_provider`, `ruido_seed`, `ruido_intensity`.

## Especificidad (`/especificidad`)

`espec_provider`, `espec_prompt_vago`, `espec_prompt_especifico`.

## Mini-RAG (`/rag`)

`rag_docs`, `rag_dims`, `rag_topk`, `rag_model`, `rag_system`, `rag_logs`.

## LM Studio (compartido entre modos)

`lmstudio_host`, `lmstudio_model`.
