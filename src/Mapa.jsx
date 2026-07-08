import { useState } from 'react'
import BrandHome from './BrandHome.jsx'
import ModeSwitch from './ModeSwitch.jsx'
import { PREGUNTAS } from './preguntas.js'
import { MODOS, LABS, DEMOS } from './taller.js'
import { useT } from './i18n/useT.js'

// Mapa del territorio (`/mapa`): toda la app dibujada como archipiélago
// isométrico. Cada isla es un grupo de rutas (recorrido, modos, labs, demos,
// docs) y cada nodo es un <a> real — nada de canvas: SVG puro, cero deps,
// navegable con teclado. Es también material didáctico: lo que se ve acá es
// literalmente la lista de pathnames que App.jsx sabe atender.
// Las islas se alimentan de preguntas.js y taller.js — las mismas fuentes que
// la landing y los dropdowns del header, para que no se desincronicen.

// Proyección isométrica: la celda (i, j) de la grilla de una isla cae en
// (cx + (i-j)·ISO_W, cy + (i+j)·ISO_H). Es el clásico 2:1 de los juegos iso.
const ISO_W = 24
const ISO_H = 12
const TILE_W = 17 // media-diagonal horizontal del rombo de un nodo
const TILE_H = 9
const TILE_D = 5 // "espesor" del nodo (el fake 3D)
const PLAT_PAD = 0.9 // margen de la plataforma alrededor de la grilla, en celdas
const PLAT_D = 10 // espesor de la plataforma

// Docs y anexos no viven en taller.js (no son modos ni labs): lista propia,
// con el pathname literal como label, igual que las DEMOS.
const DOCS_ITEMS = [
  { emoji: '📚', href: '/docs', label: '/docs', subKey: 'entrada.tDocsSub' },
  { emoji: '⚙️', href: '/como-funciona', label: '/como-funciona', subKey: 'modeswitch.comoFuncSub' },
  { emoji: '🧾', href: '/contexto', label: '/contexto', subKey: 'modeswitch.contextoSub' },
  { emoji: '⚖️', href: '/proveedores', label: '/proveedores', subKey: 'modeswitch.provSub' },
]

const ENTRADA_ITEM = { emoji: '🚪', href: '/', labelKey: 'mapa.entradaNode', subKey: 'mapa.entradaNodeSub' }

const ISLAS = [
  {
    id: 'recorrido',
    emoji: '🧭',
    labelKey: 'mapa.islaRecorrido',
    cols: 3,
    cx: 190,
    cy: 150,
    orden: true, // dibuja el caminito interno: las paradas se visitan en orden
    items: [
      { emoji: '🧭', href: '/recorrido', labelKey: 'mapa.recorridoStartLabel', subKey: 'mapa.recorridoStartSub' },
      ...PREGUNTAS,
    ],
  },
  { id: 'modos', emoji: '💬', labelKey: 'mapa.islaModos', cols: 3, cx: 540, cy: 180, items: MODOS },
  { id: 'docs', emoji: '📚', labelKey: 'mapa.islaDocs', cols: 2, cx: 900, cy: 120, items: DOCS_ITEMS },
  { id: 'labs', emoji: '🧪', labelKey: 'mapa.islaLabs', cols: 3, cx: 850, cy: 330, items: LABS },
  { id: 'demos', emoji: '🎬', labelKey: 'mapa.islaDemos', cols: 4, cx: 330, cy: 380, items: DEMOS },
]

// Rutas entre islas: la escalera pedagógica (recorrido → demos → labs → modos)
// más las dos puertas saliendo de la entrada y los docs mirando todo.
const RUTAS = [
  { d: 'M 540 62 Q 350 60 215 118', cls: 'mapa-ruta-verde' },
  { d: 'M 540 62 Q 540 105 540 148', cls: 'mapa-ruta-azul' },
  { d: 'M 190 240 Q 195 315 285 362', cls: '' },
  { d: 'M 455 420 Q 630 465 795 372', cls: '' },
  { d: 'M 850 300 Q 775 235 660 205', cls: '' },
  { d: 'M 875 158 Q 770 125 645 165', cls: '' },
]

const gridPos = (isla, k) => {
  const i = k % isla.cols
  const j = Math.floor(k / isla.cols)
  return [isla.cx + (i - j) * ISO_W, isla.cy + (i + j) * ISO_H]
}

const itemLabel = (item, t) => (item.labelKey ? t(item.labelKey) : item.label)

function Nodo({ item, x, y, big, t, onHover, onLeave }) {
  const w = big ? TILE_W + 8 : TILE_W
  const h = big ? TILE_H + 4 : TILE_H
  return (
    <a
      href={item.href}
      className="mapa-nodo"
      onMouseEnter={() => onHover(item)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(item)}
      onBlur={onLeave}
    >
      <title>{`${itemLabel(item, t)} — ${item.href}`}</title>
      <g transform={`translate(${x} ${y})`}>
        <g className="mapa-nodo-lift">
          <polygon className="mapa-nodo-lado" points={`${-w},0 0,${h} 0,${h + TILE_D} ${-w},${TILE_D}`} />
          <polygon className="mapa-nodo-lado" points={`${w},0 0,${h} 0,${h + TILE_D} ${w},${TILE_D}`} />
          <polygon className="mapa-nodo-top" points={`0,${-h} ${w},0 0,${h} ${-w},0`} />
          <text className="mapa-nodo-emoji" x="0" y="3.5" textAnchor="middle">{item.emoji}</text>
        </g>
      </g>
    </a>
  )
}

function Isla({ isla, sel, onSelect, t, onHover, onLeave }) {
  const maxI = isla.cols - 1
  const maxJ = Math.ceil(isla.items.length / isla.cols) - 1
  const p = PLAT_PAD
  // Esquinas de la plataforma: la grilla proyectada, con margen.
  const corner = (i, j) => [isla.cx + (i - j) * ISO_W, isla.cy + (i + j) * ISO_H]
  const [ax, ay] = corner(-p, -p)
  const [bx, by] = corner(maxI + p, -p)
  const [cxx, cyy] = corner(maxI + p, maxJ + p)
  const [dx, dy] = corner(-p, maxJ + p)
  const top = `${ax},${ay} ${bx},${by} ${cxx},${cyy} ${dx},${dy}`
  const ladoR = `${bx},${by} ${cxx},${cyy} ${cxx},${cyy + PLAT_D} ${bx},${by + PLAT_D}`
  const ladoL = `${dx},${dy} ${cxx},${cyy} ${cxx},${cyy + PLAT_D} ${dx},${dy + PLAT_D}`
  const selected = sel === isla.id
  const toggle = () => onSelect(selected ? null : isla.id)

  return (
    <g className={`mapa-isla mapa-isla-${isla.id}${selected ? ' mapa-isla-sel' : ''}`}>
      <g
        className="mapa-plataforma"
        role="button"
        tabIndex={0}
        aria-expanded={selected}
        aria-label={`${t(isla.labelKey)} — ${t('mapa.paradas', { count: isla.items.length })}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <polygon className="mapa-plat-lado" points={ladoL} />
        <polygon className="mapa-plat-lado" points={ladoR} />
        <polygon className="mapa-plat-top" points={top} />
        <text className="mapa-plat-label" x={isla.cx} y={ay - 12} textAnchor="middle">
          {isla.emoji} {t(isla.labelKey)}
          <tspan className="mapa-plat-count"> · {isla.items.length}</tspan>
        </text>
      </g>
      {isla.orden && (
        <polyline
          className="mapa-orden"
          points={isla.items.map((_, k) => gridPos(isla, k).join(',')).join(' ')}
        />
      )}
      {isla.items.map((item, k) => {
        const [x, y] = gridPos(isla, k)
        return <Nodo key={item.href} item={item} x={x} y={y} t={t} onHover={onHover} onLeave={onLeave} />
      })}
    </g>
  )
}

export default function Mapa() {
  const { t } = useT()
  const [hover, setHover] = useState(null)
  const [sel, setSel] = useState(null)
  const selIsla = ISLAS.find((isla) => isla.id === sel)
  const onHover = (item) => setHover(item)
  const onLeave = () => setHover(null)

  return (
    <div className="app mapa-page">
      <header className="header">
        <h1>
          <BrandHome />
          <span className="brand-subtitle">{t('mapa.subtitle')}</span>
        </h1>
        <div className="header-actions">
          <ModeSwitch active="mapa" />
        </div>
      </header>

      <main className="mapa-main">
        <section className="mapa-hero">
          <h2>{t('mapa.title')}</h2>
          <p>{t('mapa.intro')}</p>
        </section>

        <div className="mapa-hoverbar" aria-live="polite">
          {hover ? (
            <>
              <b>{hover.emoji} {itemLabel(hover, t)}</b>
              {' — '}{t(hover.subKey)}{' '}
              <code>{hover.href}</code>
            </>
          ) : (
            t('mapa.hoverIdle')
          )}
        </div>

        <div className="mapa-canvas">
          <svg viewBox="0 0 1080 560" role="img" aria-label={t('mapa.title')}>
            {RUTAS.map((ruta) => (
              <path key={ruta.d} className={`mapa-ruta ${ruta.cls}`} d={ruta.d} />
            ))}
            {ISLAS.map((isla) => (
              <Isla key={isla.id} isla={isla} sel={sel} onSelect={setSel} t={t} onHover={onHover} onLeave={onLeave} />
            ))}
            <g className="mapa-isla mapa-isla-entrada">
              <Nodo item={ENTRADA_ITEM} x={540} y={48} big t={t} onHover={onHover} onLeave={onLeave} />
              <text className="mapa-plat-label" x={540} y={18} textAnchor="middle">
                🚪 {t('mapa.entradaNode')}
              </text>
            </g>
          </svg>
        </div>

        <p className="mapa-escalera">{t('mapa.escalera')}</p>

        {selIsla ? (
          <section className="mapa-panel" aria-label={t(selIsla.labelKey)}>
            <h3>{selIsla.emoji} {t(selIsla.labelKey)}</h3>
            <ul className="entrada-links mapa-panel-links">
              {selIsla.items.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="entrada-link">
                    <span className="entrada-link-emoji">{item.emoji}</span>
                    <span className="entrada-link-body">
                      <b>{itemLabel(item, t)}</b>
                      <span className="entrada-link-sub">{t(item.subKey)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mapa-panel-hint">{t('mapa.panelHint')}</p>
        )}
      </main>
    </div>
  )
}
