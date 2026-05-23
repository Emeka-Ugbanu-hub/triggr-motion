import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react"
import { Animate as TextAnimate } from "../src/text"
import type { AnimateTextHandle, AnimationPreset } from "../src/text/types"
import { Animate as ParagraphAnimate } from "../src/paragraph"
import type { AnimateParagraphHandle, ParagraphPreset } from "../src/paragraph/types"
import { Animate as BlockAnimate } from "../src/block"
import { SMOOTH, SPRING } from "../src/block/animations"
import { Animate as ListAnimate } from "../src/list"
import type { AnimateBlockHandle, BlockAnimationPreset } from "../src/block/types"
import type { AnimateListHandle, ListAnimationPreset } from "../src/list/types"

type ModuleId = "docs" | "text" | "paragraph" | "list" | "block"
type Trigger = "change" | "scroll" | "hover" | "click" | "manual" | "mount" | "exit"
type SecondaryTrigger = "none" | Trigger

type AnimationProperties = Record<string, [string | number, string | number]>

const SPRING_EASE = SPRING
const SMOOTH_EASE = SMOOTH
const EASE_IN = "cubic-bezier(0.0, 0.0, 0.2, 1)"
const SNAPPY_EASE = "cubic-bezier(0.2, 0, 0, 1)"

const ANIMATION_DEFAULTS: Record<string, { duration: number; easing: string }> = {
  springBounce: { duration: 500, easing: SMOOTH_EASE },
  springScale: { duration: 450, easing: SMOOTH_EASE },
  springSlideUp: { duration: 450, easing: SMOOTH_EASE },
  springSlideDown: { duration: 450, easing: SMOOTH_EASE },
  morphRadius: { duration: 400, easing: SMOOTH_EASE },
  morphCircle: { duration: 400, easing: SMOOTH_EASE },
  underlineDraw: { duration: 500, easing: SMOOTH_EASE },
  underlineSlide: { duration: 250, easing: SMOOTH_EASE },
  copyConfirm: { duration: 300, easing: SPRING_EASE },
  brightnessShift: { duration: 350, easing: SMOOTH_EASE },
  activeTabText: { duration: 250, easing: SMOOTH_EASE },
  staggerBlurIn: { duration: 450, easing: SMOOTH_EASE },
  feedAppend: { duration: 350, easing: SPRING_EASE },
  filterIn: { duration: 300, easing: SPRING_EASE },
  emptyToList: { duration: 400, easing: SMOOTH_EASE },
  modalIn: { duration: 400, easing: SPRING_EASE },
  modalOut: { duration: 200, easing: EASE_IN },
  popoverIn: { duration: 300, easing: SPRING_EASE },
  popoverOut: { duration: 150, easing: EASE_IN },
  toastIn: { duration: 400, easing: SPRING_EASE },
  toastOut: { duration: 200, easing: EASE_IN },
  successCheckIn: { duration: 500, easing: SPRING_EASE },
  buttonLoading: { duration: 600, easing: SMOOTH_EASE },
  focusRingPulse: { duration: 2000, easing: SMOOTH_EASE },
  selectionPulse: { duration: 400, easing: SMOOTH_EASE },
  insertItem: { duration: 350, easing: SPRING_EASE },
  emptyStateToList: { duration: 500, easing: SMOOTH_EASE },
  errorMessageIn: { duration: 300, easing: SNAPPY_EASE },
  tabPanelIn: { duration: 300, easing: SMOOTH_EASE },
  tabPanelOut: { duration: 200, easing: EASE_IN },
  successToast: { duration: 400, easing: SPRING_EASE },
  checkboxCheck: { duration: 350, easing: SPRING_EASE },
  fadeAway: { duration: 350, easing: SMOOTH_EASE },
  liftReveal: { duration: 400, easing: SMOOTH_EASE },
  fadeMask: { duration: 500, easing: SMOOTH_EASE },
  streamFade: { duration: 400, easing: SMOOTH_EASE },
  heightAuto: { duration: 350, easing: SMOOTH_EASE },
  fadeOutUp: { duration: 200, easing: EASE_IN },
  fadeOutDown: { duration: 200, easing: EASE_IN },
  slideOutUp: { duration: 220, easing: EASE_IN },
  slideOutDown: { duration: 220, easing: EASE_IN },
  slideOutLeft: { duration: 220, easing: EASE_IN },
  slideOutRight: { duration: 220, easing: EASE_IN },
  scaleOut: { duration: 200, easing: EASE_IN },
  blurOut: { duration: 250, easing: EASE_IN },
  clipOut: { duration: 250, easing: EASE_IN },
  strikeOut: { duration: 300, easing: EASE_IN },
  typeOut: { duration: 400, easing: EASE_IN },
  scrambleOut: { duration: 400, easing: EASE_IN },
  paragraphFadeOut: { duration: 200, easing: EASE_IN },
  collapseHeight: { duration: 300, easing: EASE_IN },
  wordFadeOut: { duration: 200, easing: EASE_IN },
  wordSlideOut: { duration: 220, easing: EASE_IN },
  lineFadeOut: { duration: 200, easing: EASE_IN },
  lineSlideOut: { duration: 220, easing: EASE_IN },
  fadeMaskOut: { duration: 300, easing: EASE_IN },
  itemSlideOutLeft: { duration: 220, easing: EASE_IN },
  itemSlideOutRight: { duration: 220, easing: EASE_IN },
  itemScaleOut: { duration: 200, easing: EASE_IN },
  itemPopOut: { duration: 220, easing: EASE_IN },
  itemBlurOut: { duration: 250, easing: EASE_IN },
  itemDismissOut: { duration: 250, easing: EASE_IN },
  rowCollapseOut: { duration: 280, easing: EASE_IN },
  tagRemove: { duration: 180, easing: EASE_IN },
  cardRemove: { duration: 240, easing: EASE_IN },
  dialogOut: { duration: 200, easing: EASE_IN },
  drawerOutLeft: { duration: 250, easing: EASE_IN },
  drawerOutRight: { duration: 250, easing: EASE_IN },
  drawerOutTop: { duration: 250, easing: EASE_IN },
  drawerOutBottom: { duration: 250, easing: EASE_IN },
  menuOut: { duration: 150, easing: EASE_IN },
  toastOutRight: { duration: 200, easing: EASE_IN },
  toastOutUp: { duration: 200, easing: EASE_IN },
  collapseWidth: { duration: 300, easing: EASE_IN },
  dismissOut: { duration: 200, easing: EASE_IN },
  errorOut: { duration: 300, easing: EASE_IN },
  successOut: { duration: 250, easing: EASE_IN },
}

const EASINGS: [string, string][] = [
  ["Spring", "cubic-bezier(0.34, 1.56, 0.64, 1)"],
  ["Smooth", "cubic-bezier(0.25, 0.46, 0.45, 0.94)"],
  ["Ease In", "cubic-bezier(0.0, 0.0, 0.2, 1)"],
  ["Ease Out", "cubic-bezier(0.4, 0.0, 1, 1)"],
  ["Ease In Out", "cubic-bezier(0.4, 0.0, 0.2, 1)"],
  ["Snappy", "cubic-bezier(0.2, 0, 0, 1)"],
  ["Linear", "linear"],
]

function getAnimationDefaults(name: string): { duration: number; easing: string } {
  return ANIMATION_DEFAULTS[name] ?? { duration: 400, easing: SPRING_EASE }
}

const TEXT_ALL_PRESETS: AnimationPreset[] = [
  "fadeSwap", "morph", "highlight", "blur",
  "decoder", "fadeIn",
  "slideReplace", "letterDrop", "glitch", "textReveal", "scatter",
  "typewriter", "splash", "scramble",
  "boldFlash", "strikeThrough", "odometer", "ticker",
  "textEffect", "staggerText", "textRotate", "gooeyMorph",
  "splitReveal", "splitSlide", "scrollFanIn",
  "bigBang", "scatterAssemble", "pixelRain", "vortex", "dominoFall",
  "pendulum", "centerBurst", "gravityBounce",
  "randomLetterSwap",
  "slideUp", "slideDown", "flip", "bounce",
  "popIn", "dropIn", "riseUp", "expandIn",
  "bump", "jitter", "popUp", "jello", "shake", "pulse", "blink", "wave", "ping",
  "liftReveal",
  "underlineDraw", "underlineSlide", "copyConfirm", "brightnessShift", "activeTabText",
]

const TEXT_CHANGE_PRESETS: AnimationPreset[] = [
  "fadeSwap", "morph", "slideReplace", "typewriter", "decoder", "scramble",
  "odometer", "ticker", "strikeThrough",
  "highlight", "boldFlash", "blur", "glitch",
  "slideUp", "slideDown", "flip", "bounce",
  "popIn", "dropIn", "riseUp", "expandIn",
  "fadeIn", "underlineDraw", "underlineSlide", "brightnessShift",
  "liftReveal",
]

const TEXT_SCROLL_PRESETS: AnimationPreset[] = [
  "fadeIn", "letterDrop", "textReveal", "scatter", "splash", "glitch",
  "slideUp", "slideDown", "flip", "bounce", "popIn", "dropIn", "riseUp", "expandIn",
  "underlineDraw",
]

const TEXT_INTERACTION_PRESETS: AnimationPreset[] = [
  "bump", "jitter", "popUp", "jello", "shake", "pulse", "blink", "wave", "ping",
  "highlight", "boldFlash", "blur", "textReveal",
  "underlineSlide", "underlineDraw", "copyConfirm", "brightnessShift", "activeTabText",
]

const TEXT_HOVER_PRESETS: AnimationPreset[] = [
  "bump", "jitter", "jello", "shake", "pulse", "blink", "wave",
  "highlight", "boldFlash", "blur",
  "underlineSlide", "underlineDraw", "brightnessShift", "activeTabText",
]

const TEXT_CLICK_PRESETS: AnimationPreset[] = [
  ...TEXT_HOVER_PRESETS,
  "popUp", "ping", "textReveal", "copyConfirm",
]

const TEXT_MOUNT_PRESETS: AnimationPreset[] = [
  "fadeIn", "decoder", "letterDrop", "textReveal", "scatter", "splash", "scramble", "glitch",
  "textEffect", "staggerText", "splitReveal", "splitSlide", "scrollFanIn",
  "bigBang", "scatterAssemble", "pixelRain", "vortex", "dominoFall",
  "pendulum", "centerBurst", "gravityBounce",
  "textRotate", "gooeyMorph", "randomLetterSwap",
  "slideUp", "slideDown", "flip", "bounce", "popIn", "dropIn", "riseUp", "expandIn",
  "underlineDraw", "copyConfirm", "brightnessShift", "activeTabText",
]

const PARAGRAPH_ALL_PRESETS: ParagraphPreset[] = [
  "fadeIn", "fadeOut", "fadeSwap", "morphText", "slideReplace",
  "wordFadeIn", "wordSlideUp", "wordPop",
  "lineFadeIn", "lineSlideUp",
  "streamIn", "streamSlide",
  "cursorBlink", "expandCollapse", "crossFade",
  "highlight", "flash", "morphBlur", "diffAnimate",
  "scrollWordReveal",
  "slideUp", "slideDown", "slideLeft", "slideRight",
  "popIn", "popOut", "expandIn", "collapseOut",
  "zoomIn", "zoomOut",
  "pulse", "shake", "errorMessageIn",
  "pushLeft", "pushRight", "flipPage",
  "fadeMask", "streamFade", "heightAuto",
]

const PARAGRAPH_CHANGE_PRESETS: ParagraphPreset[] = [
  "fadeSwap", "morphText", "slideReplace", "crossFade", "expandCollapse",
  "diffAnimate", "morphBlur", "pushLeft", "pushRight", "flipPage",
  "highlight", "flash",
  "wordFadeIn", "wordSlideUp", "wordPop",
  "lineFadeIn", "lineSlideUp", "streamIn", "streamSlide",
  "slideUp", "slideDown", "slideLeft", "slideRight",
  "popIn", "expandIn", "zoomIn", "shake", "errorMessageIn",
  "cursorBlink", "fadeMask", "streamFade", "heightAuto",
]

const PARAGRAPH_SCROLL_PRESETS: ParagraphPreset[] = [
  "fadeIn", "wordFadeIn", "wordSlideUp", "wordPop",
  "lineFadeIn", "lineSlideUp", "streamIn", "streamSlide",
  "scrollWordReveal", "slideUp", "slideDown", "slideLeft", "slideRight",
  "popIn", "expandIn", "zoomIn", "highlight", "flash",
  "fadeMask", "streamFade",
]

const PARAGRAPH_INTERACTION_PRESETS: ParagraphPreset[] = [
  "highlight", "flash", "pulse", "shake",
  "wordFadeIn", "wordSlideUp", "wordPop", "lineFadeIn", "lineSlideUp",
  "slideUp", "slideDown", "popIn", "zoomIn", "errorMessageIn",
  "cursorBlink",
]

const PARAGRAPH_MOUNT_PRESETS: ParagraphPreset[] = [
  "fadeIn", "wordFadeIn", "wordSlideUp", "wordPop",
  "lineFadeIn", "lineSlideUp", "streamIn", "streamSlide",
  "slideUp", "slideDown", "slideLeft", "slideRight",
  "popIn", "expandIn", "zoomIn", "errorMessageIn", "highlight", "flash",
  "cursorBlink", "fadeMask", "streamFade", "heightAuto",
]

const LIST_PRESETS: ListAnimationPreset[] = [
  "staggerFadeIn", "staggerSlideUp", "staggerSlideLeft", "staggerZoomIn", "staggerPopIn", "stackIn",
  "wordCascade", "wordWave", "wordDrop", "wordFadeIn",
  "marquee", "marqueeReverse", "marqueeFade",
  "parallax", "parallaxFast", "parallaxReverse", "tiltScroll", "scaleScroll", "parallaxStagger",
  "itemFadeIn", "itemSlideIn", "itemPopIn", "itemBounceIn",
  "itemFadeOut", "itemSlideOut", "itemCollapseOut",
  "fadeIn", "slideIn", "slideInLeft", "slideInRight",
  "popIn", "bounceIn", "expandIn", "flipIn",
  "fadeOut", "slideOut", "slideOutLeft", "slideOutRight",
  "popOut", "bounceOut", "collapseOut", "flipOut",
  "glideIn", "glideOut",
  "flip", "smooth", "spring", "none",
  "selectionPulse", "insertItem", "emptyStateToList", "staggerBlurIn", "feedAppend", "filterIn", "emptyToList",
]

const LIST_EXIT_PRESETS: ListAnimationPreset[] = ["fadeOut", "slideOut", "slideOutLeft", "slideOutRight", "popOut", "bounceOut", "collapseOut", "flipOut", "itemFadeOut", "itemSlideOut", "itemCollapseOut", "glideOut", "itemSlideOutLeft", "itemSlideOutRight", "itemScaleOut", "itemPopOut", "itemBlurOut", "itemDismissOut", "rowCollapseOut", "tagRemove", "cardRemove"]
const LIST_EXIT_ONLY_PRESETS: ListAnimationPreset[] = ["fadeOut", "slideOut", "slideOutLeft", "slideOutRight", "popOut", "bounceOut", "collapseOut", "flipOut", "itemFadeOut", "itemSlideOut", "itemCollapseOut", "glideOut", "itemSlideOutLeft", "itemSlideOutRight", "itemScaleOut", "itemPopOut", "itemBlurOut", "itemDismissOut", "rowCollapseOut", "tagRemove", "cardRemove"]
const LIST_ENTER_PRESETS: ListAnimationPreset[] = ["fadeIn", "slideIn", "slideInLeft", "slideInRight", "popIn", "bounceIn", "expandIn", "flipIn", "staggerFadeIn", "staggerSlideUp", "staggerSlideLeft", "staggerZoomIn", "staggerPopIn", "stackIn", "wordCascade", "wordWave", "wordDrop", "wordFadeIn", "itemFadeIn", "itemSlideIn", "itemPopIn", "itemBounceIn", "glideIn", "staggerBlurIn", "feedAppend", "filterIn", "emptyToList", "selectionPulse", "insertItem", "emptyStateToList"]
const LIST_REORDER_PRESETS: ListAnimationPreset[] = ["flip", "smooth", "spring", "none"]
const LIST_MARQUEE_PRESETS: ListAnimationPreset[] = ["marquee", "marqueeReverse", "marqueeFade"]
const LIST_PARALLAX_PRESETS: ListAnimationPreset[] = ["parallax", "parallaxFast", "parallaxReverse", "tiltScroll", "scaleScroll", "parallaxStagger"]

const BLOCK_ONESHOT_PRESETS: BlockAnimationPreset[] = [
  "fadeIn", "fadeOut", "fadeSwap",
  "slideUp", "slideDown", "slideLeft", "slideRight",
  "scaleIn", "scaleOut", "popIn", "popOut",
  "rotateIn", "rotateOut", "flipX", "flipY",
  "bounceIn", "bounceOut",
  "shake", "wiggle", "jello", "flash", "heartBeat",
  "glideIn", "glideOut", "dropIn", "riseUp",
  "expandIn", "collapseOut", "expandHeight", "fadeSlideUp",
  "blurIn", "blurOut", "clipUp", "clipLeft", "zoomIn", "zoomOut",
  "springBounce", "springScale", "springSlideUp", "springSlideDown",
  "morphRadius", "morphCircle",
  "press",
  "modalIn", "modalOut", "popoverIn", "popoverOut", "toastIn", "toastOut", "successCheckIn", "buttonLoading",
  "tabPanelIn", "tabPanelOut", "successToast", "checkboxCheck",
]

const BLOCK_CONTINUOUS_PRESETS: BlockAnimationPreset[] = ["pulse", "float", "spin", "ping", "shimmer", "focusRingPulse"]
const BLOCK_SCROLL_LINK_PRESETS: BlockAnimationPreset[] = [
  "parallax", "parallaxFast", "parallaxReverse", "tiltScroll", "scaleScroll",
]
const BLOCK_HOVER_STATE_PRESETS: BlockAnimationPreset[] = [
  "lift", "sink", "grow", "glow", "shadow", "borderPop",
]
const BLOCK_CURSOR_PRESETS: BlockAnimationPreset[] = [
  "tilt", "tilt3D", "rotate3D", "depth",
]
const BLOCK_OVERLAY_PRESETS: BlockAnimationPreset[] = ["ripple", "burst"]
const BLOCK_ENTRANCE_PRESETS: BlockAnimationPreset[] = [
  "fadeIn", "slideUp", "slideDown", "slideLeft", "slideRight",
  "scaleIn", "popIn", "rotateIn", "flipX", "flipY", "bounceIn",
  "glideIn", "dropIn", "riseUp", "expandIn", "expandHeight", "fadeSlideUp",
  "blurIn", "clipUp", "clipLeft", "zoomIn",
  "springBounce", "springScale", "springSlideUp", "springSlideDown",
  "modalIn", "popoverIn", "toastIn", "successCheckIn",
  "tabPanelIn", "successToast", "checkboxCheck",
]
const BLOCK_CHANGE_PRESETS: BlockAnimationPreset[] = [
  "fadeSwap", "slideUp", "slideDown", "slideLeft", "slideRight",
  "scaleIn", "popIn", "rotateIn", "flipX", "flipY", "bounceIn",
  "glideIn", "dropIn", "riseUp", "expandIn", "expandHeight", "fadeSlideUp",
  "blurIn", "clipUp", "clipLeft", "zoomIn",
  "springBounce", "springScale", "springSlideUp", "springSlideDown",
  "morphRadius", "morphCircle",
  "modalIn", "popoverIn", "toastIn", "successCheckIn",
  "tabPanelIn", "successToast", "checkboxCheck",
]
const BLOCK_INTERACTION_PRESETS: BlockAnimationPreset[] = [
  "press", "shake", "wiggle", "jello", "flash", "heartBeat",
  "popIn", "bounceIn", ...BLOCK_HOVER_STATE_PRESETS, ...BLOCK_CURSOR_PRESETS, ...BLOCK_CONTINUOUS_PRESETS,
]
const BLOCK_CLICK_PRESETS: BlockAnimationPreset[] = [
  "press", "ripple", "burst", "shake", "wiggle", "jello", "flash", "heartBeat",
  "popIn", "bounceIn", "scaleIn",
]

const EXIT_PRESETS_FOR_DEMO: BlockAnimationPreset[] = [
  "fadeOut", "scaleOut", "popOut", "rotateOut", "bounceOut",
  "glideOut", "collapseOut", "blurOut", "zoomOut",
  "modalOut", "dialogOut",
  "drawerOutLeft", "drawerOutRight", "drawerOutTop", "drawerOutBottom",
  "slideUp", "slideDown", "slideLeft", "slideRight",
  "popoverOut", "menuOut",
  "toastOut", "toastOutRight", "toastOutUp",
  "collapseWidth", "expandHeight",
  "dismissOut", "errorOut", "successOut",
  "tabPanelOut", "fadeSlideUp",
]

const BLOCK_EXIT_PRESETS: BlockAnimationPreset[] = EXIT_PRESETS_FOR_DEMO

const TEXT_EXIT_PRESETS: AnimationPreset[] = [
  "fadeOut", "fadeOutUp", "fadeOutDown", "shrinkOut",
  "slideOutUp", "slideOutDown", "slideOutLeft", "slideOutRight",
  "scaleOut", "popOut", "blurOut", "clipOut",
  "strikeOut", "typeOut", "scrambleOut",
  "fadeAway",
]

const PARAGRAPH_EXIT_PRESETS: ParagraphPreset[] = [
  "fadeOut", "paragraphFadeOut", "popOut", "collapseOut", "zoomOut",
  "slideOutUp", "slideOutDown", "slideOutLeft", "slideOutRight",
  "collapseHeight",
  "wordFadeOut", "wordSlideOut", "lineFadeOut", "lineSlideOut",
  "fadeMaskOut",
  "fadeSwap", "slideReplace", "crossFade", "slideUp", "slideDown",
]

function exitPresetsFor(module: ModuleId): string[] {
  if (module === "text") return TEXT_EXIT_PRESETS
  if (module === "paragraph") return PARAGRAPH_EXIT_PRESETS
  if (module === "list") return LIST_EXIT_PRESETS
  if (module === "block") return BLOCK_EXIT_PRESETS
  return []
}

function exitCategoryMatch(preset: string, category: string): boolean {
  const p = preset.toLowerCase()
  if (category === "fade") return p.includes("fade")
  if (category === "slide") return p.includes("slide") || p.includes("drawer")
  if (category === "scale") return p.includes("scale") || p.includes("pop")
  if (category === "collapse") return p.includes("collapse") || p.includes("height") || p.includes("width")
  if (category === "blur") return p.includes("blur")
  if (category === "modal") return p.includes("modal") || p.includes("dialog")
  if (category === "toast") return p.includes("toast")
  if (category === "item") return p.includes("item") || p.includes("tag") || p.includes("card") || p.includes("row")
  return true
}

let propRowCounter = 0
function nextPropRowId() { return `prop-${++propRowCounter}` }

function buildProperties(rows: PropertyRow[]): AnimationProperties | undefined {
  const valid = rows.filter(r => r.enabled && r.name.trim() && r.from && r.to)
  if (!valid.length) return undefined
  const props: AnimationProperties = {}
  for (const r of valid) {
    props[r.name.trim()] = [r.from, r.to]
  }
  return props
}

const PRESETS_BY_MODULE_TRIGGER: Record<Exclude<ModuleId, "docs">, string[] | Partial<Record<Trigger, string[]>>> = {
  text: {
    change: TEXT_CHANGE_PRESETS,
    scroll: TEXT_SCROLL_PRESETS,
    hover: TEXT_HOVER_PRESETS,
    click: TEXT_CLICK_PRESETS,
    manual: TEXT_CLICK_PRESETS,
    mount: TEXT_MOUNT_PRESETS,
    exit: TEXT_EXIT_PRESETS,
  },
  paragraph: {
    change: PARAGRAPH_CHANGE_PRESETS,
    scroll: PARAGRAPH_SCROLL_PRESETS,
    hover: PARAGRAPH_INTERACTION_PRESETS,
    click: PARAGRAPH_INTERACTION_PRESETS,
    manual: PARAGRAPH_INTERACTION_PRESETS,
    mount: PARAGRAPH_MOUNT_PRESETS,
    exit: PARAGRAPH_EXIT_PRESETS,
  },
  list: {
    scroll: [...LIST_ENTER_PRESETS, ...LIST_PARALLAX_PRESETS],
    hover: LIST_ENTER_PRESETS,
    click: LIST_ENTER_PRESETS,
    manual: [...LIST_ENTER_PRESETS, ...LIST_MARQUEE_PRESETS, ...LIST_REORDER_PRESETS],
    mount: [...LIST_ENTER_PRESETS, ...LIST_MARQUEE_PRESETS],
    exit: LIST_EXIT_PRESETS,
  },
  block: {
    change: BLOCK_CHANGE_PRESETS,
    scroll: [...BLOCK_ENTRANCE_PRESETS, ...BLOCK_SCROLL_LINK_PRESETS],
    hover: BLOCK_INTERACTION_PRESETS,
    click: BLOCK_CLICK_PRESETS,
    manual: [...BLOCK_ENTRANCE_PRESETS, ...BLOCK_ONESHOT_PRESETS, ...BLOCK_CONTINUOUS_PRESETS],
    mount: [...BLOCK_ENTRANCE_PRESETS, ...BLOCK_CONTINUOUS_PRESETS],
    exit: BLOCK_EXIT_PRESETS,
  },
}

function presetsFor(module: ModuleId, trigger: Trigger) {
  if (module === "docs") return []
  const config = PRESETS_BY_MODULE_TRIGGER[module]
  return Array.isArray(config) ? config : config[trigger] ?? []
}

type PropertyRow = { id: string; name: string; from: string; to: string; enabled: boolean }

type SavedPlaygroundState = {
  module: ModuleId
  trigger: Trigger
  preset: string
  exitPreset: string
  duration: number
  easing: string
  threshold: number
  stagger: number
  listSpeed: number
  dark: boolean
  propertyRows: PropertyRow[]
  animOptionsEnabled: boolean
  animOptions: { distance: number; scale: number; blur: number; rotate: number }
}

const PLAYGROUND_STATE_KEY = "trigr.playground.state"
const DEFAULT_PLAYGROUND_STATE: SavedPlaygroundState = {
  module: "docs",
  trigger: "change",
  preset: "fadeSwap",
  exitPreset: "",
  duration: 400,
  easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  threshold: 0.8,
  stagger: 60,
  listSpeed: 50,
  dark: false,
  propertyRows: [],
  animOptionsEnabled: false,
  animOptions: { distance: 32, scale: 0.92, blur: 4, rotate: 8 },
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function getSavedPlaygroundState(): SavedPlaygroundState {
  if (typeof window === "undefined") return DEFAULT_PLAYGROUND_STATE

  try {
    const raw = window.localStorage.getItem(PLAYGROUND_STATE_KEY)
    if (!raw) return DEFAULT_PLAYGROUND_STATE

    const saved = JSON.parse(raw) as Partial<SavedPlaygroundState>
    const module = saved.module && MODULE_META[saved.module] ? saved.module : DEFAULT_PLAYGROUND_STATE.module
    const trigger = module !== "docs" && saved.trigger && MODULE_META[module].triggers.includes(saved.trigger) ? saved.trigger : DEFAULT_PLAYGROUND_STATE.trigger
    const presets = presetsFor(module, trigger)
    const preset = saved.preset && presets.includes(saved.preset) ? saved.preset : presets[0] ?? DEFAULT_PLAYGROUND_STATE.preset
    const duration = clampNumber(saved.duration, DEFAULT_PLAYGROUND_STATE.duration, 100, 1000)
    const easing = typeof saved.easing === "string" && EASINGS.some(([, value]) => value === saved.easing) ? saved.easing : DEFAULT_PLAYGROUND_STATE.easing
    const threshold = clampNumber(saved.threshold, DEFAULT_PLAYGROUND_STATE.threshold, 0.05, 1)
    const stagger = clampNumber(saved.stagger, DEFAULT_PLAYGROUND_STATE.stagger, 0, 240)
    const listSpeed = clampNumber(saved.listSpeed, DEFAULT_PLAYGROUND_STATE.listSpeed, 10, 180)
    const exitPresets = exitPresetsFor(module)
    const exitPreset = typeof saved.exitPreset === "string" && exitPresets.includes(saved.exitPreset) ? saved.exitPreset : ""
    const dark = typeof saved.dark === "boolean" ? saved.dark : DEFAULT_PLAYGROUND_STATE.dark
    const propertyRows = Array.isArray(saved.propertyRows) ? saved.propertyRows as PropertyRow[] : []
    const animOptionsEnabled = typeof saved.animOptionsEnabled === "boolean" ? saved.animOptionsEnabled : DEFAULT_PLAYGROUND_STATE.animOptionsEnabled
    const animOptions = saved.animOptions && typeof saved.animOptions === "object" ? {
      distance: clampNumber(saved.animOptions.distance, DEFAULT_PLAYGROUND_STATE.animOptions.distance, 8, 128),
      scale: clampNumber(saved.animOptions.scale, DEFAULT_PLAYGROUND_STATE.animOptions.scale, 0.5, 1.5),
      blur: clampNumber(saved.animOptions.blur, DEFAULT_PLAYGROUND_STATE.animOptions.blur, 0, 20),
      rotate: clampNumber(saved.animOptions.rotate, DEFAULT_PLAYGROUND_STATE.animOptions.rotate, -30, 30),
    } : DEFAULT_PLAYGROUND_STATE.animOptions
    return { module, trigger, preset, exitPreset, duration, easing, threshold, stagger, listSpeed, dark, propertyRows, animOptionsEnabled, animOptions }
  } catch {
    return DEFAULT_PLAYGROUND_STATE
  }
}


type RuntimeOptions = {
  threshold: number
  stagger: number
  listSpeed: number
  propertyRows: PropertyRow[]
}

const MODULE_META: Record<ModuleId, { title: string; desc: string; color: string; triggers: Trigger[] }> = {
  docs: {
    title: "Docs",
    desc: "A complete guide to trigr: mental model, modules, triggers, presets, best practices, and real-world recipes.",
    color: "#111111",
    triggers: [],
  },
  text: {
    title: "Text",
    desc: "Animate individual characters, words, and numbers on change, scroll, hover, click, manual, or mount trigger. Perfect for headlines, live counters, navigation, and interactive labels.",
    color: "#6366f1",
    triggers: ["change", "scroll", "hover", "click", "manual", "mount", "exit"],
  },
  paragraph: {
    title: "Paragraph",
    desc: "Word and line-level animations for prose, articles, and card descriptions. Supports the same trigger system as Text for content transitions and scroll reveals.",
    color: "#06b6d4",
    triggers: ["change", "scroll", "hover", "click", "manual", "mount", "exit"],
  },
  list: {
    title: "List",
    desc: "Animate any repeated collection: cards, buttons, menu items, feature rows, pricing options, logos, dashboard rows, and scroll-depth stacks.",
    color: "#f59e0b",
    triggers: ["mount", "scroll", "hover", "click", "manual", "exit"],
  },
  block: {
    title: "Block",
    desc: "Animate any element — cards, sections, notifications — with scroll, hover, click, change, manual, or mount triggers. Includes parallax, 3D tilt, hover states, overlays, and exit animations.",
    color: "#a855f7",
    triggers: ["change", "scroll", "hover", "click", "manual", "mount", "exit"],
  },
}

// ── Shared UI Components ──────────────────────────────────────────

const PreviewCodeContext = createContext<{ inPreview: boolean; codeOpen: boolean } | null>(null)
const RuntimeOptionsContext = createContext<RuntimeOptions>({
  threshold: DEFAULT_PLAYGROUND_STATE.threshold,
  stagger: DEFAULT_PLAYGROUND_STATE.stagger,
  listSpeed: DEFAULT_PLAYGROUND_STATE.listSpeed,
  propertyRows: [],
})

function useRuntimeOptions() {
  return useContext(RuntimeOptionsContext)
}

function propertiesSnippet(properties?: AnimationProperties) {
  if (!properties) return ""
  const rows = Object.entries(properties)
    .map(([key, [from, to]]) => `    ${key}: [${JSON.stringify(from)}, ${JSON.stringify(to)}],`)
    .join("\n")
  return `\n  properties={{\n${rows}\n  }}`
}

function presetOptionsSnippet(opts?: Record<string, number>) {
  if (!opts) return ""
  const rows = Object.entries(opts)
    .map(([key, val]) => `    ${key}: ${val},`)
    .join("\n")
  return `\n  presetOptions={{\n${rows}\n  }}`
}

function triggerProp(base: Trigger) {
  return base
}

function triggerSnippet(base: Trigger) {
  return `"${base}"`
}

function CapabilityPanel({ module, trigger, preset }: { module: ModuleId; trigger: Trigger; preset: string }) {
  const { threshold, stagger, listSpeed, propertyRows } = useRuntimeOptions()
  const activeProperties = useMemo(() => buildProperties(propertyRows), [propertyRows])
  const listParallax = module === "list" && LIST_PARALLAX_PRESETS.includes(preset as ListAnimationPreset)
  const listMarquee = module === "list" && LIST_MARQUEE_PRESETS.includes(preset as ListAnimationPreset)
  const items = [
    `${trigger} trigger`,
    `${preset} preset`,
    module === "list" && trigger !== "scroll" ? `${stagger}ms stagger` : `${threshold} threshold`,
    listParallax ? `${(listSpeed / 100).toFixed(2)} parallax speed`
      : listMarquee ? `${listSpeed}px/s marquee`
      : null,
    activeProperties ? `${Object.keys(activeProperties).length} custom properties` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="capability-panel">
      <div>
        <span className="capability-eyebrow">This demo covers</span>
        <div className="capability-chips">
          {items.map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>
    </div>
  )
}

function Code({ children }: { children: string }) {
  const previewCode = useContext(PreviewCodeContext)
  const [open, setOpen] = useState(false)
  const show = previewCode ? previewCode.codeOpen : open

  return (
    <div className="code-wrap">
      {!previewCode && (
        <button type="button" className="view-code-btn" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide Code" : "View Code"}
        </button>
      )}
      {show && (
        <pre className="code">
          {children.split(/("(?:[^"]*)")/g).map((part, i) => (
            <span key={i} className={
              part.startsWith("\"") ? "code-string"
              : part.includes("<") || part.includes(">") ? "code-tag"
              : ""
            }>{part}</span>
          ))}
        </pre>
      )}
    </div>
  )
}

function DocCode({ children }: { children: string }) {
  return (
    <pre className="code docs-code">
      {children.split(/("(?:[^"]*)")/g).map((part, i) => (
        <span key={i} className={
          part.startsWith("\"") ? "code-string"
          : part.includes("<") || part.includes(">") ? "code-tag"
          : ""
        }>{part}</span>
      ))}
    </pre>
  )
}

function SelectMenu({ value, options, onChange }: { value: string; options: string[]; onChange: (next: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.toLowerCase().includes(q))
  }, [options, query])

  const onDocClick = useCallback((event: MouseEvent) => {
    if (!rootRef.current) return
    if (!rootRef.current.contains(event.target as Node)) {
      setOpen(false)
      setQuery("")
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [onDocClick])

  return (
    <div className={`select-menu${open ? " open" : ""}`} ref={rootRef}>
      <button type="button" className="select-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="select-value">{value}</span>
        <span className="select-caret">⌄</span>
      </button>
      {open && (
        <div className="select-popover">
          <div className="select-search-wrap">
            <input
              autoFocus
              className="select-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
            />
          </div>
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`select-option${option === value ? " active" : ""}`}
              onClick={() => {
                onChange(option)
                setOpen(false)
                setQuery("")
              }}
            >
              {option}
            </button>
          ))}
          {filteredOptions.length === 0 && <div className="select-empty">No matches</div>}
        </div>
      )}
    </div>
  )
}

function PreviewCard({ children, header, toolbar, className = "", enableCodeToggle = true }: { children: ReactNode; header?: ReactNode; toolbar?: ReactNode; className?: string; enableCodeToggle?: boolean }) {
  const [codeOpen, setCodeOpen] = useState(false)

  function toggleCodeFromHeader() {
    setCodeOpen((v) => !v)
  }

  return (
    <div className={`preview-card${className ? ` ${className}` : ""}`}>
      <div className="preview-header">
        <div className="traffic-lights">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="preview-actions">
          {enableCodeToggle && (
            <button type="button" className="window-action-btn view-code-header-btn" onClick={toggleCodeFromHeader}>
              {codeOpen ? "Hide Code" : "View Code"}
            </button>
          )}
          {header}
        </div>
      </div>
      {toolbar && <div className="preview-toolbar">{toolbar}</div>}
      <div className={`preview-body${codeOpen ? " code-open" : " preview-open"}`}>
        <PreviewCodeContext.Provider value={{ inPreview: true, codeOpen }}>
          {children}
        </PreviewCodeContext.Provider>
      </div>
    </div>
  )
}

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="replay-btn" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      </svg>
      Replay
    </button>
  )
}

function ManualStage({ children, count, duration, onFire }: { children: ReactNode; count: number; duration: number; onFire: () => void }) {
  const [cooling, setCooling] = useState(false)
  function fire() {
    if (cooling) return
    setCooling(true)
    onFire()
    window.setTimeout(() => setCooling(false), duration)
  }
  return (
    <div className="demo-stage">
      <p className="demo-label">Click the button below to fire the animation</p>
      <button className="fire-button demo-fire-btn" disabled={cooling} onClick={fire}>
        {cooling ? "Animating…" : "Fire Animation"}
      </button>
      <span className="demo-meta">{count} fires · {cooling ? "animating" : "ready"}</span>
      <div className="manual-target">{children}</div>
    </div>
  )
}

// ── Text Section ──────────────────────────────────────────────────

const SEARCH_PRESETS = ["fadeSwap", "morph", "scramble", "typewriter", "decoder", "letterDrop", "highlight"]
const RANDOM_WORDS = ["trigr", "animation", "motion", "design", "morph", "scroll", "hover", "click", "physics", "spring", "easing", "keyframe", "stagger", "parallax", "interaction", "playground", "typography", "gradient", "overlay", "reveal"]

function SearchDemo({ preset, duration, easing, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [draft, setDraft] = useState("trigr")
  const [query, setQuery] = useState("trigr")
  useRuntimeOptions()
  const triggerValue = triggerProp("change")
  const nextWord = RANDOM_WORDS[(RANDOM_WORDS.indexOf(query) + 1) % RANDOM_WORDS.length] ?? "motion"

  function commit(next = draft.trim() || "trigr") {
    setQuery(next)
    setDraft(next)
  }

  return (
    <div className="real-demo">
      <div className="search-real-ui">
        <div className="search-real-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit()
            }}
            placeholder="Search products..."
          />
          <button className="search-commit-btn" onClick={() => commit()}>Change</button>
        </div>
        <div className="search-real-results">
          <div className="search-real-result-item">
            <div className="search-real-result-thumb" />
            <div className="search-real-result-body">
              <TextAnimate.Text trigger={triggerValue} value={query} animation={preset} duration={duration} easing={easing} as="span" className="search-result-title" {...(preset === "highlight" ? { highlightColor: "yellow" } : {})} properties={properties} presetOptions={presetOptions as any}>
                {query}
              </TextAnimate.Text>
              <p>Found in 12 products · Updated yesterday</p>
            </div>
          </div>
        </div>
        <div className="change-demo-actions">
          <button className="fire-button" onClick={() => commit(nextWord)}>Next value</button>
          <button className="ghost-button" onClick={() => commit("trigr")}>Reset</button>
        </div>
      </div>
      <Code>{
`import { Animate } from "trigr/text"

function SearchResults() {
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState("")

  return (
    <div className="search">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button onClick={() => setQuery(draft)}>Change</button>
      <Animate.Text
        trigger=${triggerSnippet("change")}
        value={query}
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"${presetOptionsSnippet(presetOptions)}
        as="span"${propertiesSnippet(properties)}
      >
        {query}
      </Animate.Text>
    </div>
  )
}`}</Code>
    </div>
  )
}

const NAV_ITEMS = ["Home", "Products", "Pricing", "About", "Contact"]

function NavLinksDemo({ preset, duration, easing, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [hovered, setHovered] = useState("")
  useRuntimeOptions()
  const triggerValue = triggerProp("hover")
  return (
    <div className="real-demo">
      <div className="app-header-demo">
        <div className="app-header-logo">
          <div className="app-header-logo-icon" />
          <span>Acme</span>
        </div>
        <nav className="nav-links-demo">
          {NAV_ITEMS.map((item) => (
            <TextAnimate.Text
              key={item}
              trigger={triggerValue}
              animation={preset}
              duration={duration}
              easing={easing}
              properties={properties}
              presetOptions={presetOptions as any}
              as="button"
              className="nav-link-item"
              onHoverStart={() => setHovered(item)}
              onHoverEnd={() => setHovered("")}
            >
              {item}
            </TextAnimate.Text>
          ))}
        </nav>
        <button className="app-header-cta">Get Started</button>
      </div>
      <Code>{
`import { Animate } from "trigr/text"

function AppHeader() {
  return (
    <header className="app-header">
      <div className="logo">Acme</div>
      <nav>
        ${NAV_ITEMS.map((item) => `<Animate.Text
  trigger="hover"
  animation="${preset}"
  duration={${duration}}
  easing="${easing}"
  as="a"
>
  ${item}
</Animate.Text>`).join("\n        ")}
      </nav>
    </header>
  )
}`}</Code>
    </div>
  )
}

function CTADemo({ preset, duration, easing, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [count, setCount] = useState(0)
  useRuntimeOptions()
  const triggerValue = triggerProp("click")
  return (
    <div className="real-demo">
      <div className="landing-hero-demo">
        <span className="landing-eyebrow">New Release</span>
        <TextAnimate.Text
          trigger={triggerValue}
          animation={preset}
          duration={duration}
          easing={easing}
          properties={properties}
          presetOptions={presetOptions as any}
          onClick={() => setCount((c) => c + 1)}
          as="h1"
          className="landing-headline"
        >
          Ship motion that feels right
        </TextAnimate.Text>
        <p className="landing-subtitle">Click the headline to see the animation replay. Perfect for hero sections that need to respond to user interaction.</p>
        <div className="landing-actions">
          <button className="landing-btn landing-btn-primary">Get Started</button>
          <button className="landing-btn">View Docs</button>
        </div>
      </div>
      <Code>{
`import { Animate } from "trigr/text"

function LandingHero() {
  return (
    <section className="hero">
      <span className="eyebrow">New Release</span>
      <Animate.Text
        trigger="click"
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"${presetOptionsSnippet(presetOptions)}${propertiesSnippet(properties)}
        as="h1"
      >
        Ship motion that feels right
      </Animate.Text>
      <p>Click the headline to replay</p>
    </section>
  )
}`}</Code>
    </div>
  )
}

const HEADINGS = ["Features", "Blog", "Testimonials", "FAQ"]

function SectionHeadersDemo({ preset, duration, easing, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const { threshold } = useRuntimeOptions()
  const triggerValue = triggerProp("scroll")
  return (
    <div className="real-demo scroll-demo">
      <div className="scroll-entry-screen">
        <div className="scroll-intro">Scroll ⌄</div>
      </div>
      <div className="scroll-hfeed">
        {HEADINGS.map((h) => (
          <div key={h} className="scroll-reveal-item">
            <TextAnimate.Text trigger={triggerValue} animation={preset} duration={duration} easing={easing} threshold={threshold} once={false} repeat as="h2" {...(preset === "highlight" ? { highlightColor: "yellow" } : {})} properties={properties} presetOptions={presetOptions as any}>
              {h}
            </TextAnimate.Text>
            <p className="demo-label">This is the {h.toLowerCase()} section. It animates each time you scroll back.</p>
          </div>
        ))}
      </div>
      <Code>{
`import { Animate } from "trigr/text"

const sections = ${JSON.stringify(HEADINGS)}

function PageSections() {
  return sections.map((heading) => (
    <section key={heading}>
      <Animate.Text
        trigger=${triggerSnippet("scroll")}
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"${presetOptionsSnippet(presetOptions)}
        threshold={${threshold}}${preset === "highlight" ? '\n        highlightColor="yellow"' : ""}${propertiesSnippet(properties)}
        once={false}
        repeat
        as="h2"
      >
        {heading}
      </Animate.Text>
    </section>
  ))
}`}</Code>
    </div>
  )
}

const QUOTES = [
  "The best interface is no interface.",
  "Design is not just what it looks like.",
  "Simplicity is the ultimate sophistication.",
]

function QuoteRotatorDemo({ preset, duration, easing, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [idx, setIdx] = useState(0)
  const [count, setCount] = useState(0)
  const ref = useRef<AnimateTextHandle>(null)
  useRuntimeOptions()
  const triggerValue = triggerProp("manual")
  const quote = QUOTES[idx]

  function next() {
    setIdx((i) => (i + 1) % QUOTES.length)
    setCount((c) => c + 1)
    requestAnimationFrame(() => ref.current?.animate())
  }

  return (
    <div className="real-demo">
      <div className="testimonial-demo">
        <div className="testimonial-avatar" />
        <div className="quote-display">
          <TextAnimate.Text ref={ref} trigger={triggerValue} value={quote} animation={preset} duration={duration} easing={easing} as="blockquote" properties={properties} presetOptions={presetOptions as any}>
            "{quote}"
          </TextAnimate.Text>
        </div>
        <div className="testimonial-author">
          <strong>Sarah Chen</strong>
          <span>Design Lead at Vercel</span>
        </div>
        <div className="manual-controls">
          <button className="fire-button" onClick={next}>Next Quote</button>
        </div>
      </div>
      <Code>{
`import { Animate } from "trigr/text"

function Testimonials() {
  const ref = useRef(null)

  function next() {
    ref.current?.animate()
  }

  return (
    <div className="testimonial">
      <Animate.Text
        ref={ref}
        trigger="manual"
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"
        as="blockquote"
      >
        "The best interface..."
      </Animate.Text>
      <button onClick={next}>Next</button>
    </div>
  )
}`}</Code>
    </div>
  )
}

const MOUNT_HEADLINES = ["Page Loaded", "Welcome Back", "Section Ready"]

function TextMountDemo({ preset, duration, easing, exitPreset, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; exitPreset?: AnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [visible, setVisible] = useState(true)
  const [headlineIdx, setHeadlineIdx] = useState(0)
  useRuntimeOptions()
  const triggerValue = triggerProp("mount")
  const hasExit = !!exitPreset
  function toggle() {
    setVisible((v) => {
      if (!v) setHeadlineIdx((i) => (i + 1) % MOUNT_HEADLINES.length)
      return !v
    })
  }
  return (
    <div className="real-demo">
      <div className="page-load-demo">
        <div className="page-load-controls">
          <button className="fire-button" onClick={toggle}>{visible ? "Unmount" : "Mount Section"}</button>
        </div>
        <div className="page-load-content">
          <TextAnimate.Text
            key={hasExit ? "text-exit-demo" : String(visible)}
            show={hasExit ? visible : undefined}
            exitAnimation={hasExit ? exitPreset : undefined}
            unmountOnExit={false}
            trigger={triggerValue}
            animation={preset}
            duration={duration}
            easing={easing}
            as="h2"
            properties={properties}
            presetOptions={presetOptions as any}
          >
            {MOUNT_HEADLINES[headlineIdx]}
          </TextAnimate.Text>
          <p className="page-load-desc">This section animates when it mounts — perfect for page transitions and lazy-loaded content.</p>
          <div className="page-load-stats">
            <div className="page-load-stat"><strong>12K+</strong><span>Users</span></div>
            <div className="page-load-stat"><strong>99.9%</strong><span>Uptime</span></div>
            <div className="page-load-stat"><strong>&lt;50ms</strong><span>Latency</span></div>
          </div>
        </div>
      </div>
      <Code>{
`import { Animate } from "trigr/text"

function FeatureSection() {
  const [show, setShow] = useState(true)

  return (
    <section>${hasExit ? `
      <Animate.Text
        show={show}
        exitAnimation="${exitPreset}"
        unmountOnExit
        ` : `
      {show && (`}<Animate.Text
        trigger="mount"
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"
        as="h2"
      >
        Page Loaded
      </Animate.Text>${hasExit ? "" : `
      )}`}
    </section>
  )
}`}</Code>
    </div>
  )
}

function TextExitDemo({ preset, duration, easing, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [show, setShow] = useState(true)
  const [version, setVersion] = useState(0)
  return (
    <div className="real-demo">
      <div className="page-load-demo">
        <p className="demo-label">Toggle the headline to test the selected text exit animation.</p>
        <div className="page-load-controls">
          <button className="fire-button" onClick={() => setShow((v) => !v)}>{show ? "Run Exit" : "Mount Again"}</button>
          <button className="ghost-button" onClick={() => { setVersion((v) => v + 1); setShow(true) }}>Reset</button>
        </div>
        <div className="exit-preview-slot">
          <TextAnimate.Text
            key={version}
            trigger="mount"
            animation="fadeIn"
            show={show}
            exitAnimation={preset}
            unmountOnExit={false}
            duration={duration}
            easing={easing}
            as="h2"
            className="exit-demo-title"
            properties={properties}
            presetOptions={presetOptions as any}
          >
            Exit cleanly
          </TextAnimate.Text>
        </div>
      </div>
      <Code>{
`import { Animate } from "trigr/text"

function ExitExample() {
  const [show, setShow] = useState(true)

  return (
    <Animate.Text
      trigger="mount"
      animation="fadeIn"
      show={show}
      exitAnimation="${preset}"
      unmountOnExit={false}
      duration={${duration}}
      easing="${easing}"
      as="h2"${propertiesSnippet(properties)}
    >
      Exit cleanly
    </Animate.Text>
  )
}`}</Code>
    </div>
  )
}

function TextSection({ preset, duration, easing, trigger, exitPreset, properties, presetOptions }: { preset: AnimationPreset; duration: number; easing: string; trigger: Trigger; exitPreset?: AnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const content = trigger === "exit" ? <TextExitDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "change" ? <SearchDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "hover" ? <NavLinksDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "click" ? <CTADemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "scroll" ? <SectionHeadersDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "manual" ? <QuoteRotatorDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "mount" ? <TextMountDemo preset={preset} duration={duration} easing={easing} exitPreset={exitPreset} properties={properties} presetOptions={presetOptions} />
    : <CTADemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />

  return (
    <div className="section">
      <PreviewCard>{content}</PreviewCard>
    </div>
  )
}

// ── Paragraph Section ─────────────────────────────────────────────

const ARTICLES = [
  { title: "Designing Microinteractions", body: "Small, functional moments that guide users and create delightful experiences. The key is keeping them subtle and purposeful." },
  { title: "The Physics of Animation", body: "Good motion follows real-world physics — objects accelerate naturally and create interfaces that feel alive." },
]

const RANDOM_SENTENCES = [
  "The quick brown fox jumps over the lazy dog near the riverbank.",
  "Motion design brings user interfaces to life with purpose and grace.",
  "Every pixel should serve a purpose in the grand design of things.",
  "Spring physics create natural-feeling animations that users love.",
  "A well-timed transition can make the difference between good and great.",
  "Scroll-triggered animations reveal content progressively as users explore.",
  "Hover states provide immediate feedback that guides user interaction.",
  "Staggered animations add depth and polish to interface elements.",
  "Keyframe animations give precise control over every motion and pause.",
  "Responsive design ensures your animations look great at any screen size.",
]

function paragraphHighlightProps(preset: ParagraphPreset) {
  return preset === "highlight" ? { highlightColor: "yellow" } : {}
}

function paragraphHighlightSnippet(preset: ParagraphPreset) {
  return preset === "highlight" ? '\n      highlightColor="yellow"' : ""
}

function ArticlePreviewDemo({ preset, duration, easing, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [articleIdx, setArticleIdx] = useState(0)
  const [randomBody, setRandomBody] = useState<string | null>(null)
  useRuntimeOptions()
  const triggerValue = triggerProp("change")
  const article = articleIdx >= 0 ? ARTICLES[articleIdx] : { title: "Random Article", body: randomBody ?? "" }
  const displayBody = articleIdx >= 0 ? ARTICLES[articleIdx].body : (randomBody ?? "")

  return (
    <div className="real-demo">
      <div className="blog-card-demo">
        <div className="blog-card-image" />
        <div className="blog-card-body">
          <div className="blog-card-meta">
            <span className="blog-card-tag">Design</span>
            <span className="blog-card-date">Jan 15, 2025</span>
          </div>
          <ParagraphAnimate.Paragraph trigger={triggerValue} value={displayBody} animation={preset} duration={duration} easing={easing} as="article" {...paragraphHighlightProps(preset)} properties={properties} presetOptions={presetOptions as any}>
            <h3>{article.title}</h3>
            <p>{displayBody}</p>
          </ParagraphAnimate.Paragraph>
          <div className="blog-card-footer">
            <div className="blog-card-author">
              <div className="blog-card-author-avatar" />
              <span>Alex Rivera</span>
            </div>
            <button className="blog-card-read" onClick={() => setArticleIdx((i) => (i + 1) % ARTICLES.length)}>Read Next →</button>
          </div>
        </div>
      </div>
      <Code>{
        `import { Animate } from "trigr/paragraph"

function ArticleCard() {
  const [article, setArticle] = useState(articles[0])

  return (
    <article className="card">
      <Animate.Paragraph
        trigger=${triggerSnippet("change")}
        value={article.body}
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"${presetOptionsSnippet(presetOptions)}${paragraphHighlightSnippet(preset)}${propertiesSnippet(properties)}
        as="div"
      >
        <h3>{article.title}</h3>
        <p>{article.body}</p>
      </Animate.Paragraph>
    </article>
  )
}`}</Code>
    </div>
  )
}

const STORY_PARAGRAPHS = [
  "The morning light filtered through the tall windows of the old library.",
  "Dust motes danced in the golden beams, swirling with each passing breeze.",
  "She ran her fingers along the worn spines of the books, reading their faded titles.",
  "Each volume held a world within its pages, waiting to be discovered anew.",
]

function StoryScrollDemo({ preset, duration, easing, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const { threshold } = useRuntimeOptions()
  const triggerValue = triggerProp("scroll")
  return (
    <div className="real-demo scroll-demo">
      <div className="scroll-entry-screen">
        <div className="scroll-intro">Scroll ⌄</div>
      </div>
      <div className="story-content">
        {STORY_PARAGRAPHS.map((text, i) => (
          <div key={i} className="story-paragraph">
            <ParagraphAnimate.Paragraph trigger={triggerValue} animation={preset} duration={duration} easing={easing} threshold={threshold} once={false} repeat as="div" {...paragraphHighlightProps(preset)} properties={properties} presetOptions={presetOptions as any}>
              <p>{text}</p>
            </ParagraphAnimate.Paragraph>
          </div>
        ))}
      </div>
      <Code>{
`import { Animate } from "trigr/paragraph"

const paragraphs = ${JSON.stringify(STORY_PARAGRAPHS)}

function StoryPage() {
  return paragraphs.map((text, i) => (
    <Animate.Paragraph
      key={i}
      trigger=${triggerSnippet("scroll")}
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
      threshold={${threshold}}${paragraphHighlightSnippet(preset)}
      once={false}
      repeat
      as="div"
    >
      <p>{text}</p>
    </Animate.Paragraph>
  ))
}`}</Code>
    </div>
  )
}

function ParagraphHoverDemo({ preset, duration, easing, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const ref = useRef<AnimateParagraphHandle>(null)
  useRuntimeOptions()
  const triggerValue = triggerProp("hover")
  return (
    <div className="real-demo">
      <p className="demo-label">Hover over the text to animate it</p>
      <ParagraphAnimate.Paragraph ref={ref} trigger={triggerValue} animation={preset} duration={duration} easing={easing} as="p" className="paragraph-hover-demo" {...paragraphHighlightProps(preset)} properties={properties} presetOptions={presetOptions as any}>
        Hover over this paragraph to see the {preset} animation in action. The text animates each time you hover, making it perfect for interactive content and micro-copy.
      </ParagraphAnimate.Paragraph>
      <Code>{
`import { Animate } from "trigr/paragraph"

function InteractiveText() {
  return (
    <Animate.Paragraph
      trigger="hover"
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
      ${preset === "highlight" ? 'highlightColor="yellow"\n      ' : ""}as="p"
    >
      Hover over this paragraph to see the ${preset} animation in action.
    </Animate.Paragraph>
  )
}`}</Code>
    </div>
  )
}

function ReadMoreDemo({ preset, duration, easing, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false)
  const ref = useRef<AnimateParagraphHandle>(null)
  useRuntimeOptions()
  const triggerValue = triggerProp("click")

  function handleClick() {
    setExpanded((e) => !e)
    ref.current?.animate()
  }

  return (
    <div className="real-demo">
      <p className="demo-label">Click "Read more" to see the paragraph animate with the full content</p>
      <ParagraphAnimate.Paragraph
        ref={ref}
        trigger={triggerValue}
        animation={preset}
        duration={duration}
        easing={easing}
        properties={properties}
        presetOptions={presetOptions as any}
        onClick={handleClick}
        as="div"
        className="readmore-card"
        {...paragraphHighlightProps(preset)}
      >
        <p>{expanded
          ? "This is the full expanded content. The paragraph animates smoothly when the text changes, giving the user a clear sense of what changed and where to look next."
          : "A short preview of the content. Click below to read the full article with a smooth paragraph transition."
        }</p>
      </ParagraphAnimate.Paragraph>
      <button className="fire-button" onClick={handleClick}>{expanded ? "Show Less" : "Read More"}</button>
      <Code>{
`import { Animate } from "trigr/paragraph"

function ReadMoreCard() {
  const [expanded, setExpanded] = useState(false)
  const ref = useRef(null)

  function handleClick() {
    setExpanded((e) => !e)
    ref.current?.animate()
  }

  return (
    <Animate.Paragraph
      ref={ref}
      trigger="click"
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
      onClick={handleClick}
      ${preset === "highlight" ? 'highlightColor="yellow"\n      ' : ""}as="div"
    >
      <p>{expanded ? "Full content…" : "Preview…"}</p>
    </Animate.Paragraph>
  )
}`}</Code>
    </div>
  )
}

const SLIDES = [
  { title: "Introduction", body: "Welcome to the presentation. This is the first slide showing an overview of the topics we will cover today." },
  { title: "Key Concepts", body: "Understanding the fundamental principles behind motion in user interfaces and how they improve the user experience." },
  { title: "Implementation", body: "Practical examples of how to implement these animations using the trigr library with various triggers and presets." },
]

function SlideDeckDemo({ preset, duration, easing, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [slideIdx, setSlideIdx] = useState(0)
  const [count, setCount] = useState(0)
  const ref = useRef<AnimateParagraphHandle>(null)
  useRuntimeOptions()
  const triggerValue = triggerProp("manual")
  const slide = SLIDES[slideIdx]

  function next() {
    setSlideIdx((i) => (i + 1) % SLIDES.length)
    setCount((c) => c + 1)
    ref.current?.animate()
  }
  function prev() {
    setSlideIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length)
    setCount((c) => c + 1)
    ref.current?.animate()
  }

  return (
    <div className="real-demo">
      <p className="demo-label">Use the arrows to navigate slides with paragraph transitions</p>
      <div className="slide-deck">
        <ParagraphAnimate.Paragraph ref={ref} trigger={triggerValue} animation={preset} duration={duration} easing={easing} as="div" {...paragraphHighlightProps(preset)} properties={properties} presetOptions={presetOptions as any}>
          <span className="slide-number">{slideIdx + 1} / {SLIDES.length}</span>
          <h3>{slide.title}</h3>
          <p>{slide.body}</p>
        </ParagraphAnimate.Paragraph>
      </div>
      <div className="manual-controls">
        <button className="fire-button" onClick={prev}>← Prev</button>
        <button className="fire-button" onClick={next}>Next →</button>
        <span className="demo-meta">{count} transitions</span>
      </div>
      <Code>{
`import { Animate } from "trigr/paragraph"

const slides = ${JSON.stringify(SLIDES, null, 2).replace(/\n/g, "\n  ")}

function SlideDeck() {
  const ref = useRef(null)
  const [idx, setIdx] = useState(0)
  const slide = slides[idx]

  function next() {
    setIdx((i) => (i + 1) % slides.length)
    ref.current?.animate()
  }

  return (
    <Animate.Paragraph
      ref={ref}
      trigger="manual"
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
      ${preset === "highlight" ? 'highlightColor="yellow"\n      ' : ""}as="div"
    >
      <h3>{slide.title}</h3>
      <p>{slide.body}</p>
    </Animate.Paragraph>
  )
}`}</Code>
    </div>
  )
}

const PARAGRAPH_CONTENT = "This paragraph appears with a smooth entrance animation as soon as it mounts. Perfect for loading states, dynamic content, and page transitions."

function ParagraphMountDemo({ preset, duration, easing, exitPreset, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; exitPreset?: ParagraphPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [visible, setVisible] = useState(true)
  useRuntimeOptions()
  const triggerValue = triggerProp("mount")
  const hasExit = !!exitPreset
  return (
    <div className="real-demo">
      <p className="demo-label">Toggle to mount/unmount content with an entrance animation</p>
      <div className="manual-controls">
        <button className="fire-button" onClick={() => setVisible((v) => !v)}>{visible ? "Unmount" : "Mount"}</button>
      </div>
      <div style={{ minHeight: 80 }}>
        {hasExit ? (
          <BlockAnimate.Block show={visible} exitAnimation={exitPreset as BlockAnimationPreset} unmountOnExit duration={duration} easing={easing}>
            <ParagraphAnimate.Paragraph key={String(visible)} trigger={triggerValue} animation={preset} duration={duration} easing={easing} {...paragraphHighlightProps(preset)} properties={properties} presetOptions={presetOptions as any}>
              {PARAGRAPH_CONTENT}
            </ParagraphAnimate.Paragraph>
          </BlockAnimate.Block>
        ) : (
          visible && (
            <ParagraphAnimate.Paragraph key={String(visible)} trigger={triggerValue} animation={preset} duration={duration} easing={easing} {...paragraphHighlightProps(preset)} properties={properties} presetOptions={presetOptions as any}>
              {PARAGRAPH_CONTENT}
            </ParagraphAnimate.Paragraph>
          )
        )}
      </div>
      <Code>{
`import { Animate } from "trigr/paragraph"${hasExit ? `\nimport { Animate as BlockAnimate } from "trigr/block"` : ""}

function MountDemo() {
  const [show, setShow] = useState(true)

  return (
    <div>
      <button onClick={() => setShow((v) => !v)}>
        {show ? "Unmount" : "Mount"}
      </button>${hasExit ? `
      <BlockAnimate.Block
        show={show}
        exitAnimation="${exitPreset}"
        unmountOnExit
      >` : `
      {show && (`}
        <Animate.Paragraph
          trigger="mount"
          animation="${preset}"
          duration={${duration}}
          easing="${easing}"
          ${preset === "highlight" ? 'highlightColor="yellow"\n          ' : ""}>
          This paragraph fades in on mount.
        </Animate.Paragraph>${hasExit ? `
      </BlockAnimate.Block>` : `
      )}`}
    </div>
  )
}`}</Code>
    </div>
  )
}

function ParagraphExitDemo({ preset, duration, easing, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [show, setShow] = useState(true)
  const [version, setVersion] = useState(0)
  return (
    <div className="real-demo">
      <p className="demo-label">Toggle this paragraph to test line, word, and block-level exits without removing the preview frame.</p>
      <div className="manual-controls">
        <button className="fire-button" onClick={() => setShow((v) => !v)}>{show ? "Run Exit" : "Mount Again"}</button>
        <button className="ghost-button" onClick={() => { setVersion((v) => v + 1); setShow(true) }}>Reset</button>
      </div>
      <div className="exit-preview-slot paragraph-exit-slot">
        <ParagraphAnimate.Paragraph
          key={version}
          trigger="mount"
          animation="fadeIn"
          show={show}
          exitAnimation={preset}
          unmountOnExit={false}
          duration={duration}
          easing={easing}
          as="div"
          className="readmore-card"
          properties={properties}
          presetOptions={presetOptions as any}
        >
          <h3>Paragraph exit</h3>
          <p>Exit animations should preserve the preview height, stay readable, and clean up without leaving ghost styles behind.</p>
        </ParagraphAnimate.Paragraph>
      </div>
      <Code>{
`import { Animate } from "trigr/paragraph"

function ParagraphExit() {
  const [show, setShow] = useState(true)

  return (
    <Animate.Paragraph
      trigger="mount"
      animation="fadeIn"
      show={show}
      exitAnimation="${preset}"
      unmountOnExit={false}
      duration={${duration}}
      easing="${easing}"
      as="div"${propertiesSnippet(properties)}
    >
      <h3>Paragraph exit</h3>
      <p>Exit animations preserve layout while leaving.</p>
    </Animate.Paragraph>
  )
}`}</Code>
    </div>
  )
}

function ParagraphSection({ preset, duration, easing, trigger, exitPreset, properties, presetOptions }: { preset: ParagraphPreset; duration: number; easing: string; trigger: Trigger; exitPreset?: ParagraphPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const content = trigger === "exit" ? <ParagraphExitDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "change" ? <ArticlePreviewDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "scroll" ? <StoryScrollDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "hover" ? <ParagraphHoverDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "click" ? <ReadMoreDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "manual" ? <SlideDeckDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "mount" ? <ParagraphMountDemo preset={preset} duration={duration} easing={easing} exitPreset={exitPreset} properties={properties} presetOptions={presetOptions} />
    : <ArticlePreviewDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />

  return (
    <div className="section">
      <PreviewCard>{content}</PreviewCard>
    </div>
  )
}

// ── List Section ──────────────────────────────────────────────────

function resolveListAnimations(preset: ListAnimationPreset) {
  if (preset === "marquee" || preset === "marqueeReverse" || preset === "marqueeFade") return { animation: preset as const }
  if (LIST_PARALLAX_PRESETS.includes(preset)) return { animation: preset as const }
  const isExitOnly = LIST_EXIT_PRESETS.includes(preset)
  const isEnterOnly = LIST_ENTER_PRESETS.includes(preset)
  const isReorder = LIST_REORDER_PRESETS.includes(preset)
  if (isReorder) {
    return { animation: "slideIn" as ListAnimationPreset, exitAnimation: "slideOut" as ListAnimationPreset, reorderAnimation: preset }
  }
  if (isExitOnly) {
    const enterMatch = LIST_ENTER_PRESETS.find((e) => { const base = e.replace(/In$/, "").replace(/Left|Right/, ""); const pBase = preset.replace(/Out$/, "").replace(/Left|Right/, ""); return base.trim() === pBase.trim() })
    return { animation: enterMatch ?? "slideIn" as ListAnimationPreset, exitAnimation: preset, reorderAnimation: "flip" as ListAnimationPreset }
  }
  if (isEnterOnly) {
    const exitMatch = LIST_EXIT_PRESETS.find((e) => { const base = e.replace(/Out$/, "").replace(/Left|Right/, ""); const pBase = preset.replace(/In$/, "").replace(/Left|Right/, ""); return base.trim() === pBase.trim() })
    return { animation: preset, exitAnimation: exitMatch ?? "slideOut" as ListAnimationPreset, reorderAnimation: "flip" as ListAnimationPreset }
  }
  return { animation: preset as ListAnimationPreset, exitAnimation: "slideOut" as ListAnimationPreset, reorderAnimation: "flip" as ListAnimationPreset }
}

type ListDemoItem = { id: string; title: string; desc: string; meta: string; tone: string }

const LIST_DEMO_POOL: ListDemoItem[] = [
  { id: "revenue", title: "Revenue", desc: "$48.2k this month", meta: "+12.4%", tone: "green" },
  { id: "activation", title: "Activation", desc: "1,284 completed flows", meta: "+8.1%", tone: "blue" },
  { id: "retention", title: "Retention", desc: "74% returning accounts", meta: "-1.2%", tone: "amber" },
  { id: "support", title: "Support", desc: "18 open conversations", meta: "Live", tone: "pink" },
  { id: "deploys", title: "Deploys", desc: "6 releases this week", meta: "Ready", tone: "violet" },
]

const MARQUEE_LABELS = ["Linear", "Vercel", "Stripe", "Raycast", "Figma", "Notion"]
const CASCADE_LABELS = ["Motion", "Tokens", "Layout", "Scroll", "Hover", "State"]

function listDemoMode(preset: ListAnimationPreset) {
  if (preset === "marquee" || preset === "marqueeReverse" || preset === "marqueeFade") return "marquee"
  if (LIST_PARALLAX_PRESETS.includes(preset)) return "parallax"
  if (preset === "wordCascade" || preset === "wordWave" || preset === "wordDrop" || preset === "wordFadeIn") return "cascade"
  if (LIST_REORDER_PRESETS.includes(preset)) return "reorder"
  if (preset.startsWith("item") || LIST_EXIT_PRESETS.includes(preset)) return "presence"
  if (preset === "slideInLeft" || preset === "glideIn") return "slideLeft"
  if (preset === "slideInRight") return "slideRight"
  if (preset === "staggerSlideLeft") return "slideRight"
  if (preset === "flipIn" || preset === "flipOut") return "flip"
  if (preset === "bounceIn" || preset === "bounceOut" || preset === "itemBounceIn") return "bounce"
  if (preset === "staggerPopIn" || preset === "popIn" || preset === "popOut") return "pop"
  return "stagger"
}

function ListChangeDemo({ preset, duration, easing, exitPreset, properties, presetOptions }: { preset: ListAnimationPreset; duration: number; easing: string; exitPreset?: ListAnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [items, setItems] = useState<ListDemoItem[]>(LIST_DEMO_POOL.slice(0, 4))
  const [input, setInput] = useState("")
  const { stagger, listSpeed } = useRuntimeOptions()
  const triggerValue = triggerProp("mount")
  const mode = listDemoMode(preset)
  const isMarquee = mode === "marquee"
  const listAnim = useMemo(() => resolveListAnimations(preset), [preset])
  const effectiveExit = exitPreset ?? listAnim.exitAnimation

  const add = useCallback(() => {
    const next = input.trim()
    if (!next) {
      const poolItem = LIST_DEMO_POOL.find((candidate) => !items.some((item) => item.id === candidate.id))
      if (poolItem) setItems((prev) => [poolItem, ...prev])
      return
    }
    const id = `${next.toLowerCase().replace(/\W+/g, "-")}-${Date.now()}`
    setItems((prev) => [{ id, title: next, desc: "Custom collection item", meta: "New", tone: "blue" }, ...prev])
    setInput("")
  }, [input, items])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toolbar = isMarquee ? undefined : (
    <div className="field-row">
      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add item..." />
      <button onClick={add}>Add</button>
      <button onClick={() => setItems((c) => c.slice(0, -1))}>Remove</button>
      <button onClick={() => setItems((c) => [...c].reverse())}>Reorder</button>
      <span className="toolbar-count">{items.length} items</span>
    </div>
  )

  const code = isMarquee
    ? `import { Animate } from "trigr/list"\n\n<Animate.List animation="${preset}" speed={${listSpeed}}>\n  {logos.map((logo) => (\n    <span key={logo}>{logo}</span>\n  ))}\n</Animate.List>`
    : `import { Animate } from "trigr/list"\n\n<Animate.List\n  animation="${listAnim.animation}"\n  exitAnimation="${effectiveExit}"\n  duration={${duration}}\n  easing="${easing}"\n  stagger={${stagger}}\n>\n  {items.map((item) => (\n    <DashboardRow key={item.id} item={item} />\n  ))}\n</Animate.List>`

  return (
    <div className="section">
      <PreviewCard header={<ReplayButton onClick={() => setItems((c) => [...c].reverse())} />} toolbar={toolbar}>
        {isMarquee ? (
          <div className="real-demo">
            <p className="demo-label">Marquee carousel — repeated children loop continuously without the collection knowing what they are.</p>
            <div className="marquee-demo">
              <span className="marquee-prefix">trusted by</span>
              <ListAnimate.List trigger={triggerValue} animation={preset} duration={duration} speed={listSpeed} properties={properties} presetOptions={presetOptions as any}>
                {MARQUEE_LABELS.map((item) => <span className="marquee-item" key={item}>{item}</span>)}
              </ListAnimate.List>
            </div>
          </div>
        ) : (
          <div className={`list-demo list-demo-${mode}`}>
            <p className="demo-label">
              {mode === "cascade" ? "Cascade presets work well for tags, words, filters, and compact repeated UI."
                : mode === "reorder" ? "Reorder presets use keyed children to animate dashboard rows with FLIP."
                : mode === "presence" ? "Presence presets keep removed children alive long enough to exit cleanly."
                : mode === "slideLeft" ? "Items animate in from the left — ideal for sidebars, navigation, and menus."
                : mode === "slideRight" ? "Items animate in from the right — great for panels, drawers, and notifications."
                : mode === "flip" ? "Items flip into view with a 3D perspective — perfect for cards, tiles, and galleries."
                : mode === "bounce" ? "Items bounce into place with elastic energy — use for playful UIs and highlights."
                : mode === "pop" ? "Items pop with a scale overshoot — works well for callouts, alerts, and emphasis."
                : "Stagger presets reveal repeated cards, blocks, and feature rows with an offset per child."}
            </p>
              <ListAnimate.List
              trigger={triggerValue}
              animation={listAnim.animation}
              exitAnimation={effectiveExit}
              reorderAnimation={listAnim.reorderAnimation}
              duration={duration}
              reorderDuration={duration}
              easing={easing}
              stagger={stagger}
              properties={properties}
              presetOptions={presetOptions as any}
            >
              {mode === "cascade" ? CASCADE_LABELS.map((item) => (
                <button className="list-tag-pill" key={item}>{item}</button>
              )) : items.map((item) => {
                if (mode === "stagger") {
                  return (
                    <article className={`list-feature-card tone-${item.tone}`} key={item.id}>
                      <span>{item.meta}</span>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </article>
                  )
                }
                if (mode === "presence") {
                  return (
                    <div className="list-notification-row" key={item.id}>
                      <span className={`list-status-dot tone-${item.tone}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                      <button className="list-remove-btn" onClick={() => remove(item.id)} aria-label="Remove">Dismiss</button>
                    </div>
                  )
                }
                if (mode === "slideLeft" || mode === "slideRight") {
                  const side = mode === "slideLeft" ? "left" : "right"
                  return (
                    <div className={`list-nav-row side-${side}`} key={item.id}>
                      <span className={`nav-icon tone-${item.tone}`} />
                      <strong>{item.title}</strong>
                      <span className="nav-meta">{item.meta}</span>
                    </div>
                  )
                }
                if (mode === "flip") {
                  return (
                    <div className="list-flip-card" key={item.id}>
                      <span className={`flip-dot tone-${item.tone}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                      <span className="flip-meta">{item.meta}</span>
                    </div>
                  )
                }
                if (mode === "bounce") {
                  return (
                    <div className="list-bounce-item" key={item.id}>
                      <span className={`bounce-ball tone-${item.tone}`} />
                      <div>
                        <strong>{item.title}</strong>
                      </div>
                    </div>
                  )
                }
                if (mode === "pop") {
                  return (
                    <div className="list-pop-row" key={item.id}>
                      <strong>{item.title}</strong>
                      <span className="pop-badge">{item.meta}</span>
                    </div>
                  )
                }
                return (
                  <div className="list-dashboard-row" key={item.id}>
                    <span className={`list-status-dot tone-${item.tone}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                    <span>{item.meta}</span>
                  </div>
                )
              })}
            </ListAnimate.List>
          </div>
        )}
        <Code>{code}</Code>
      </PreviewCard>
    </div>
  )
}

const LIST_MOUNT_ITEMS = [
  { id: "overview", title: "Overview", desc: "Workspace pulse and recent changes" },
  { id: "projects", title: "Projects", desc: "Active launches and timelines" },
  { id: "reports", title: "Reports", desc: "Weekly metrics and exports" },
  { id: "settings", title: "Settings", desc: "Team permissions and billing" },
]

function ListMountDemo({ preset, duration, easing, exitPreset, properties, presetOptions }: { preset: ListAnimationPreset; duration: number; easing: string; exitPreset?: ListAnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [visible, setVisible] = useState(true)
  const { stagger } = useRuntimeOptions()
  const triggerValue = triggerProp("mount")
  return (
    <div className="section">
      <PreviewCard>
        <div className="real-demo">
          <p className="demo-label">Toggle list mount/unmount — items animate in with staggered entrance</p>
          <div className="manual-controls">
            <button className="fire-button" onClick={() => setVisible((v) => !v)}>{visible ? "Unmount" : "Mount"}</button>
          </div>
          <div className="list-demo list-demo-presence" style={{ minHeight: 260 }}>
            {visible && (
              <ListAnimate.List key={String(visible)} trigger={triggerValue} animation={preset} duration={duration} easing={easing} stagger={stagger} properties={properties} presetOptions={presetOptions as any}>
                {LIST_MOUNT_ITEMS.map((item) => (
                  <div className="list-dashboard-row" key={item.id}>
                    <span className="list-status-dot tone-blue" />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                    <span>Open</span>
                  </div>
                ))}
              </ListAnimate.List>
            )}
          </div>
        </div>
        <Code>{
`import { Animate } from "trigr/list"

function ListMountDemo() {
  const [show, setShow] = useState(true)

  return (
    <div>
      <button onClick={() => setShow((v) => !v)}>
        {show ? "Hide" : "Show"}
      </button>
      {show && (
        <Animate.List
          trigger={${triggerSnippet("mount")}}
          animation="${preset}"${exitPreset ? `
          exitAnimation="${exitPreset}"` : ""}
          duration={${duration}}
          easing="${easing}"
          stagger={${stagger}}
        >
          {items.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </Animate.List>
      )}
    </div>
  )
}`}</Code>
      </PreviewCard>
    </div>
  )
}

function ListScrollDemo({ preset, duration, easing, properties, presetOptions }: { preset: ListAnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const { stagger, threshold, listSpeed } = useRuntimeOptions()
  const triggerValue = triggerProp("scroll")
  const parallaxSpeed = Number((listSpeed / 100).toFixed(2))
  const isParallax = LIST_PARALLAX_PRESETS.includes(preset)

  if (isParallax) {
    const cards = [
      { id: "urban", title: "Urban Reflections", desc: "Cards travel at slightly different depths while the preview scrolls.", tone: "pricing" },
      { id: "wild", title: "Wilderness Silence", desc: "Each keyed child remains developer-owned; trigr only controls collection motion.", tone: "features" },
      { id: "ocean", title: "Ocean Whispers", desc: "Use this for card stacks, hero panels, logos, pricing rows, or feature blocks.", tone: "basic" },
      { id: "mountain", title: "Mountain Echoes", desc: "The collection creates depth without changing the public child structure.", tone: "faq" },
    ]
    return (
      <div className="real-demo scroll-demo list-parallax-demo">
        <div className="scroll-entry-screen">
          <div className="scroll-intro">Scroll ⌄</div>
        </div>
        <ListAnimate.List
          trigger={triggerValue}
          animation={preset}
          speed={parallaxSpeed}
          threshold={threshold}
          properties={properties}
          presetOptions={presetOptions as any}
          className="list-parallax-stack"
        >
          {cards.map((card) => (
            <article className={`list-parallax-card card-${card.tone}`} key={card.id}>
              <span>{card.id}</span>
              <strong>{card.title}</strong>
              <p>{card.desc}</p>
              <button>See more →</button>
            </article>
          ))}
        </ListAnimate.List>
        <Code>{
`import { Animate } from "trigr/list"

function CollectionParallax({ cards }) {
  return (
    <Animate.List
      trigger=${triggerSnippet("scroll")}
      animation="${preset}"
      speed={${parallaxSpeed}}
      threshold={${threshold}}
    >
      {cards.map((card) => (
        <article key={card.id}>{card.title}</article>
      ))}
    </Animate.List>
  )
}`}</Code>
      </div>
    )
  }

  return (
    <div className="real-demo scroll-demo">
      <div className="scroll-entry-screen">
        <div className="scroll-intro">Scroll ⌄</div>
      </div>
      {["Metrics", "Notifications", "Pricing"].map((label, index) => (
        <div className="list-scroll-item" key={label}>
            <ListAnimate.List trigger={triggerValue} animation={preset} duration={duration} easing={easing} stagger={stagger} threshold={threshold} properties={properties} presetOptions={presetOptions as any}>
            {LIST_DEMO_POOL.slice(index, index + 3).map((item) => (
              <div className="list-dashboard-row" key={`${label}-${item.id}`}>
                <span className={`list-status-dot tone-${item.tone}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
                <span>{item.meta}</span>
              </div>
            ))}
          </ListAnimate.List>
        </div>
      ))}
      <Code>{
`import { Animate } from "trigr/list"

function ScrollCollection() {
  return (
    <Animate.List
      trigger=${triggerSnippet("scroll")}
      animation="${preset}"
      threshold={${threshold}}
      duration={${duration}}
      easing="${easing}"
      stagger={${stagger}}
    >
      {rows.map((row) => (
        <DashboardRow key={row.id} {...row} />
      ))}
    </Animate.List>
  )
}`}</Code>
    </div>
  )
}

function ListInteractionDemo({ preset, duration, easing, trigger, properties, presetOptions }: { preset: ListAnimationPreset; duration: number; easing: string; trigger: Trigger; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const ref = useRef<AnimateListHandle>(null)
  const [fires, setFires] = useState(0)
  const { stagger } = useRuntimeOptions()
  const triggerValue = triggerProp(trigger)
  const isManual = trigger === "manual"
  return (
    <div className="real-demo">
      <p className="demo-label">
        {trigger === "hover" ? "Hover the menu group to replay the collection animation."
          : trigger === "click" ? "Click the collection to replay the animation across keyed children."
          : "Fire the collection animation imperatively with ref.current.animate()."}
      </p>
      {isManual && (
        <button className="fire-button" onClick={() => { ref.current?.animate(); setFires((count) => count + 1) }}>
          Fire collection
        </button>
      )}
      <div className="list-demo list-demo-presence">
          <ListAnimate.List
          ref={ref}
          trigger={triggerValue}
          animation={preset}
          duration={duration}
          easing={easing}
          stagger={stagger}
          properties={properties}
          presetOptions={presetOptions as any}
          onReorder={() => setFires((count) => count + 1)}
        >
          {LIST_MOUNT_ITEMS.map((item) => (
            <button className="list-menu-button" key={item.id}>
              <span className="list-status-dot tone-violet" />
              <span>{item.title}</span>
            </button>
          ))}
        </ListAnimate.List>
      </div>
      <span className="demo-meta">{isManual ? `${fires} manual fires` : `${trigger} trigger`}</span>
      <Code>{
`import { Animate } from "trigr/list"

function MenuMotion() {
  const ref = useRef(null)

  return (
    <>
      ${isManual ? `<button onClick={() => ref.current?.animate()}>Fire</button>` : ""}
      <Animate.List
        ref={ref}
        trigger=${triggerSnippet(trigger)}
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"
        stagger={${stagger}}
      >
        {items.map((item) => (
          <button key={item.id}>{item.title}</button>
        ))}
      </Animate.List>
    </>
  )
}`}</Code>
    </div>
  )
}

function ListSection({ preset, duration, easing, trigger, exitPreset, properties, presetOptions }: { preset: ListAnimationPreset; duration: number; easing: string; trigger: Trigger; exitPreset?: ListAnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  if (trigger === "mount") {
    return <ListMountDemo preset={preset} duration={duration} easing={easing} exitPreset={exitPreset} properties={properties} presetOptions={presetOptions} />
  }

  const content = trigger === "exit" ? <ListChangeDemo preset={preset} duration={duration} easing={easing} exitPreset={preset} properties={properties} presetOptions={presetOptions} />
    : trigger === "scroll" ? <ListScrollDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "hover" || trigger === "click" || trigger === "manual" ? <ListInteractionDemo preset={preset} duration={duration} easing={easing} trigger={trigger} properties={properties} presetOptions={presetOptions} />
    : <ListChangeDemo preset={preset} duration={duration} easing={easing} exitPreset={exitPreset} properties={properties} presetOptions={presetOptions} />

  return (
    <div className="section">
      <PreviewCard>{content}</PreviewCard>
    </div>
  )
}

// ── Block Section ─────────────────────────────────────────────────

function BlockCard({ title, desc, tone }: { title: string; desc: string; tone?: string }) {
  return (
    <div className={`block-demo-card${tone ? ` card-${tone}` : ""}`}>
      <div className="block-card-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18"/></svg>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <button>Learn More →</button>
    </div>
  )
}

function BlockChangeDemo({ preset, duration, easing, onReplay, properties, presetOptions }: { preset: BlockAnimationPreset; duration: number; easing: string; onReplay: () => void; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [tick, setTick] = useState(0)
  useRuntimeOptions()
  const triggerValue = triggerProp("change")
  return (
    <div className="real-demo">
      <p className="demo-label">Each notification triggers a block animation on value change</p>
      <button className="fire-button" onClick={() => { setTick((c) => c + 1); onReplay() }}>
        New Notification
      </button>
      <div className="block-preview-area">
        <BlockAnimate.Block trigger={triggerValue} value={tick} animation={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions as any}>
          <BlockCard title={`Notification #${tick}`} desc={`This card animates in using the "${preset}" preset when data changes.`} />
        </BlockAnimate.Block>
      </div>
      <Code>{
`import { Animate } from "trigr/block"

function NotificationFeed() {
  const [tick, setTick] = useState(0)

  function addNotif() {
    setTick((c) => c + 1)
  }

  return (
    <>
      <button onClick={addNotif}>New Notification</button>
      <Animate.Block
        trigger=${triggerSnippet("change")}
        value={tick}
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"${presetOptionsSnippet(presetOptions)}${propertiesSnippet(properties)}
      >
        <Card title={\`Notification #\${tick}\`} desc="..." />
      </Animate.Block>
    </>
  )
}`}</Code>
    </div>
  )
}

function BlockScrollDemo({ preset, duration, easing, properties, presetOptions }: { preset: BlockAnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const isScrollLinked = ["parallax", "parallaxFast", "parallaxReverse", "tiltScroll", "scaleScroll"].includes(preset)
  const { threshold } = useRuntimeOptions()
  const triggerValue = triggerProp("scroll")

  if (isScrollLinked) {
    const blockSpeed = 0.5
    return (
      <div className="real-demo scroll-demo block-parallax-demo">
        <div className="scroll-entry-screen">
          <div className="scroll-intro">Scroll <span aria-hidden="true">⌄</span></div>
        </div>
        <div className="block-scroll-item">
          <BlockAnimate.Block
            trigger={triggerValue}
            animation={preset}
            speed={blockSpeed}
            threshold={threshold}
            duration={duration}
            easing={easing}
            properties={properties}
            presetOptions={presetOptions as any}
            className="block-parallax-element"
          >
            <div className="block-parallax-visual">
              <span>Hero media</span>
              <strong>One block, independent scroll speed</strong>
              <p>Use block parallax for a single visual, card, image, or section moving against the page.</p>
            </div>
          </BlockAnimate.Block>
        </div>
        <Code>{`import { Animate } from "trigr/block"

function HeroParallax() {
  return (
    <Animate.Block
      trigger=${triggerSnippet("scroll")}
      animation="${preset}"
      speed={${blockSpeed}}
      threshold={${threshold}}
    >
      <div className="hero-image" />
    </Animate.Block>
  )
}`}</Code>
      </div>
    )
  }

  return (
    <div className="real-demo scroll-demo">
      <div className="scroll-entry-screen">
        <div className="scroll-intro">Scroll ⌄</div>
      </div>
      {["Features", "Pricing", "FAQ"].map((section) => (
        <div key={section} className="block-scroll-item">
          <BlockAnimate.Block animation={preset} trigger={triggerValue} duration={duration} easing={easing} threshold={threshold} once={false} repeat properties={properties} presetOptions={presetOptions as any}>
            <BlockCard title={section} desc={`This ${section.toLowerCase()} section animates each time it scrolls into view.`} tone={section.toLowerCase()} />
          </BlockAnimate.Block>
        </div>
      ))}
      <Code>{
`import { Animate } from "trigr/block"

const sections = ["Features", "Pricing", "FAQ"]

function LandingPage() {
  return sections.map((section) => (
    <section key={section}>
      <Animate.Block
        trigger=${triggerSnippet("scroll")}
        animation="${preset}"
        duration={${duration}}
        easing="${easing}"${presetOptionsSnippet(presetOptions)}
        threshold={${threshold}}${propertiesSnippet(properties)}
        once={false}
        repeat
      >
        <Card title={section} desc="..." />
      </Animate.Block>
    </section>
  ))
}`}</Code>
    </div>
  )
}

function BlockHoverDemo({ preset, duration, easing, properties, presetOptions }: { preset: BlockAnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  useRuntimeOptions()
  const triggerValue = triggerProp("hover")
  return (
    <div className="real-demo">
      <p className="demo-label">Hover over each card to see the hover state animation</p>
      <div className="block-hover-grid">
        <BlockAnimate.Block trigger={triggerValue} animation={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions as any}>
          <BlockCard title="Basic Plan" desc="$19/mo — Great for individuals getting started." tone="basic" />
        </BlockAnimate.Block>
        <BlockAnimate.Block trigger={triggerValue} animation={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions as any}>
          <BlockCard title="Pro Plan" desc="$49/mo — Advanced features for teams." tone="pro" />
        </BlockAnimate.Block>
      </div>
      <Code>{
`import { Animate } from "trigr/block"

const plans = [
  { title: "Basic Plan", desc: "..." },
  { title: "Pro Plan", desc: "..." },
]

function PricingGrid() {
  return plans.map((plan) => (
    <Animate.Block
      key={plan.title}
      trigger="hover"
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
    >
      <Card title={plan.title} desc={plan.desc} />
    </Animate.Block>
  ))
}`}</Code>
    </div>
  )
}

function BlockClickDemo({ preset, duration, easing, properties, presetOptions }: { preset: BlockAnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [count, setCount] = useState(0)
  const ref = useRef<AnimateBlockHandle>(null)
  useRuntimeOptions()
  const triggerValue = triggerProp("click")
  return (
    <div className="real-demo">
      <p className="demo-label">Click the card to trigger the animation</p>
      <BlockAnimate.Block ref={ref} trigger={triggerValue} animation={preset} duration={duration} easing={easing} onClick={() => setCount((c) => c + 1)} properties={properties} presetOptions={presetOptions as any}>
        <BlockCard title={`Clicked ${count} times`} desc={`The "${preset}" animation plays each time you click this card.`} />
      </BlockAnimate.Block>
      <Code>{
`import { Animate } from "trigr/block"

function InteractiveCard() {
  const ref = useRef(null)
  const [count, setCount] = useState(0)

  return (
    <Animate.Block
      ref={ref}
      trigger="click"
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
      onClick={() => setCount((c) => c + 1)}
    >
      <Card title={\`Clicked \${count} times\`} desc="..." />
    </Animate.Block>
  )
}`}</Code>
    </div>
  )
}

const STEPS = ["Fill in your details", "Verify your email", "Set up billing", "Done!"]

function BlockManualDemo({ preset, duration, easing, properties, presetOptions }: { preset: BlockAnimationPreset; duration: number; easing: string; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [step, setStep] = useState(0)
  const [count, setCount] = useState(0)
  const ref = useRef<AnimateBlockHandle>(null)
  useRuntimeOptions()
  const triggerValue = triggerProp("manual")

  function next() {
    ref.current?.animate()
    setStep((s) => (s + 1) % STEPS.length)
    setCount((c) => c + 1)
  }

  return (
    <div className="real-demo">
      <p className="demo-label">Step through the onboarding flow — each step triggers a manual animation</p>
      <BlockAnimate.Block ref={ref} trigger={triggerValue} animation={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions as any}>
        <BlockCard title={`Step ${step + 1}: ${STEPS[step]}`} desc={`This card animates via ref.current?.animate() when you click "Next Step".`} />
      </BlockAnimate.Block>
      <div className="manual-controls">
        <button className="fire-button" onClick={next}>Next Step</button>
        <span className="demo-meta">Step {step + 1} of {STEPS.length}</span>
      </div>
      <Code>{
`import { Animate } from "trigr/block"

const steps = ${JSON.stringify(STEPS)}

function OnboardingFlow() {
  const ref = useRef(null)
  const [step, setStep] = useState(0)

  function next() {
    ref.current?.animate()
    setStep((s) => (s + 1) % steps.length)
  }

  return (
    <Animate.Block
      ref={ref}
      trigger="manual"
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
    >
      <Card title={steps[step]} desc="..." />
    </Animate.Block>
  )
}`}</Code>
    </div>
  )
}

function BlockMountDemo({ preset, duration, easing, exitPreset, properties, presetOptions }: { preset: BlockAnimationPreset; duration: number; easing: string; exitPreset?: BlockAnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [show, setShow] = useState(true)
  useRuntimeOptions()
  const triggerValue = triggerProp("mount")
  const hasExit = !!exitPreset

  const content = (
    <BlockAnimate.Block key={show ? "show" : "hide"} trigger={triggerValue} animation={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions as any}>
      <BlockCard title="Welcome!" desc={`Animating in with "${preset}" triggered on mount.`} tone="welcome" />
    </BlockAnimate.Block>
  )

  return (
    <div className="real-demo">
      <p className="demo-label">This card animates in as soon as it mounts{hasExit ? " — toggle to see the exit animation" : ""}</p>
      <div className="demo-actions">
        <button className="fire-button" onClick={() => setShow((v) => !v)}>{show ? "Exit" : "Show"}</button>
      </div>
      {hasExit ? (
        <BlockAnimate.Block show={show} exitAnimation={exitPreset} unmountOnExit duration={duration} easing={easing} presetOptions={presetOptions as any}>
          {content}
        </BlockAnimate.Block>
      ) : content}
      <Code>{
`import { Animate } from "trigr/block"

function PageEntrance() {
  const [show, setShow] = useState(true)

  return (
    <Animate.Block
      show={show}${hasExit ? `
      exitAnimation="${exitPreset}"
      unmountOnExit` : ""}
      animation="${preset}"
      duration={${duration}}
      easing="${easing}"
    >
      <Card title="Welcome!" desc="..." />
    </Animate.Block>
  )
}`}</Code>
    </div>
  )
}

function BlockExitDemo({ duration, easing, preset, properties, presetOptions }: { duration: number; easing: string; preset?: BlockAnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const [items, setItems] = useState([
    { id: 1, title: "Build pipeline failed", desc: "The production build failed on commit a3f2c1d." },
    { id: 2, title: "Deployment complete", desc: "Version 2.4.1 deployed to staging successfully." },
    { id: 3, title: "New comment on PR #42", desc: "Alex requested changes to the animation module." },
  ])
  const [exitingIds, setExitingIds] = useState<number[]>([])
  const [exitPreset, setExitPreset] = useState<BlockAnimationPreset>(preset ?? "fadeOut")
  useEffect(() => { if (preset) setExitPreset(preset) }, [preset])
  useRuntimeOptions()

  function dismiss(id: number) {
    if (exitingIds.includes(id)) return
    setExitingIds((prev) => [...prev, id])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id))
      setExitingIds((prev) => prev.filter((itemId) => itemId !== id))
    }, Math.max(180, duration) + 80)
  }

  function reset() {
    setItems([
      { id: 1, title: "Build pipeline failed", desc: "The production build failed on commit a3f2c1d." },
      { id: 2, title: "Deployment complete", desc: "Version 2.4.1 deployed to staging successfully." },
      { id: 3, title: "New comment on PR #42", desc: "Alex requested changes to the animation module." },
    ])
    setExitingIds([])
  }

  return (
    <div className="real-demo">
      <p className="demo-label">Dismiss each notification — it exits with the selected animation</p>
      <div className="exit-controls">
        <label className="control-label-sm">Exit animation:</label>
        <SelectMenu
          value={exitPreset}
          options={EXIT_PRESETS_FOR_DEMO}
          onChange={(v) => setExitPreset(v as BlockAnimationPreset)}
        />
      </div>
      <div className="notif-stack">
        {items.map((item) => (
          <BlockAnimate.Block
            key={item.id}
            trigger="mount"
            animation="fadeIn"
            show={!exitingIds.includes(item.id)}
            exitAnimation={exitPreset}
            duration={duration}
            easing={easing}
            unmountOnExit
            properties={properties}
            presetOptions={presetOptions as any}
          >
            <div className="notif-card" onClick={() => dismiss(item.id)}>
              <div className="notif-body">
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
              <button className="notif-dismiss" onClick={(e: React.MouseEvent) => { e.stopPropagation(); dismiss(item.id) }} aria-label="Dismiss">✕</button>
            </div>
          </BlockAnimate.Block>
        ))}
      </div>
      {items.length === 0 && (
        <div className="empty-notifs">
          <p>All cleared! <button className="fire-button" onClick={reset}>Reset</button></p>
        </div>
      )}
      <Code>{
`import { useState } from "react"
import { Animate } from "trigr/block"

const notifications = [
  { id: 1, title: "Build failed", desc: "..." },
  { id: 2, title: "Deploy complete", desc: "..." },
]

function NotificationStack() {
  const [items, setItems] = useState(notifications)

  function dismiss(id) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return items.map((item) => (
    <Animate.Block
      key={item.id}
      trigger="mount"
      animation="fadeIn"
      show={true}
      exitAnimation="${exitPreset}"
      duration={${duration}}
      easing="${easing}"
      unmountOnExit
    >
      <div onClick={() => dismiss(item.id)}>
        <strong>{item.title}</strong>
        <p>{item.desc}</p>
      </div>
    </Animate.Block>
  ))
}`}</Code>
    </div>
  )
}

function BlockSection({ preset, duration, easing, trigger, exitPreset, properties, presetOptions }: { preset: BlockAnimationPreset; duration: number; easing: string; trigger: Trigger; exitPreset?: BlockAnimationPreset; properties?: AnimationProperties; presetOptions?: Record<string, number> }) {
  const replay = useCallback(() => {}, [])
  const isExitDemo = trigger === "exit"

  const content = isExitDemo
    ? <BlockExitDemo duration={duration} easing={easing} preset={preset} properties={properties} presetOptions={presetOptions} />
    : trigger === "change" ? <BlockChangeDemo preset={preset} duration={duration} easing={easing} onReplay={replay} properties={properties} presetOptions={presetOptions} />
    : trigger === "scroll" ? <BlockScrollDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "hover" ? <BlockHoverDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "click" ? <BlockClickDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "manual" ? <BlockManualDemo preset={preset} duration={duration} easing={easing} properties={properties} presetOptions={presetOptions} />
    : trigger === "mount" ? <BlockMountDemo preset={preset} duration={duration} easing={easing} exitPreset={exitPreset} properties={properties} presetOptions={presetOptions} />
    : <BlockChangeDemo preset={preset} duration={duration} easing={easing} onReplay={replay} properties={properties} presetOptions={presetOptions} />

  return (
    <div className="section">
      <PreviewCard>{content}</PreviewCard>
    </div>
  )
}

// ── Docs Section ─────────────────────────────────────────────────

const DOC_MODULES = [
  {
    title: "Text",
    importPath: "trigr/text",
    component: "Animate.Text",
    use: "Short, inline text: words, labels, counters, nav items, headings, and tiny state changes.",
    examples: "Search labels, pricing words, changing numbers, hero keywords, command buttons.",
  },
  {
    title: "Paragraph",
    importPath: "trigr/paragraph",
    component: "Animate.Paragraph",
    use: "Longer prose where words and lines need to remain readable while animating.",
    examples: "Article intros, marketing copy, FAQ answers, onboarding descriptions, feature summaries.",
  },
  {
    title: "List",
    importPath: "trigr/list",
    component: "Animate.List",
    use: "Any repeated keyed collection, not only list tags.",
    examples: "Cards, buttons, menu items, dashboard rows, feature rows, logos, pricing options.",
  },
  {
    title: "Block",
    importPath: "trigr/block",
    component: "Animate.Block",
    use: "One complete element or surface moving as a unit.",
    examples: "Cards, panels, modals, notifications, hero images, sections, hover surfaces.",
  },
]

const DOC_TRIGGERS = [
  { name: "change", desc: "Runs when the children or value prop change. Best for replacing or updating content.", best: "fadeSwap, morph, slideReplace, typewriter, diffAnimate, block entrances." },
  { name: "scroll", desc: "Runs when the element reaches the configured viewport threshold.", best: "fadeIn, slide, line/word reveals, block parallax, list parallax variants." },
  { name: "hover", desc: "Runs on pointer hover. Best for short feedback that resets on leave.", best: "bump, lift, glow, press-like feedback, compact list item reveals." },
  { name: "click", desc: "Runs on click or tap. Best for tactile confirmation.", best: "press, ripple, burst, shake, bounce, list item feedback." },
  { name: "manual", desc: "Runs from ref.current.animate(). Use when outside state controls the timing.", best: "Replay buttons, guided tours, command palettes, step-by-step flows." },
  { name: "mount", desc: "Runs when the component appears. Best for first paint and conditional UI.", best: "fadeIn, popIn, stackIn, staggerSlideUp, block entrances." },
  { name: "exit", desc: "Runs when content leaves through show/unmount or keyed list removal.", best: "fadeOut, slideOut, collapseOut, blurOut, item removal, toast/modal exits." },
]

const DOC_ANIMATION_GROUPS = [
  {
    module: "Text",
    groups: [
      { title: "Swap and replace", presets: ["fadeSwap", "morph", "slideReplace", "typewriter", "decoder", "scramble", "odometer", "ticker", "textRotate", "gooeyMorph"], best: "Use with change when old and new text both matter." },
      { title: "Reveal", presets: ["fadeIn", "letterDrop", "textReveal", "scatter", "splash", "splitReveal", "splitSlide", "staggerText", "textEffect", "scrollFanIn"], best: "Use on mount or scroll for headings and labels." },
      { title: "Particle and physics", presets: ["bigBang", "scatterAssemble", "pixelRain", "vortex", "dominoFall", "pendulum", "centerBurst", "gravityBounce"], best: "Use sparingly for hero moments and expressive text." },
      { title: "Interaction", presets: ["bump", "jitter", "popUp", "jello", "shake", "pulse", "blink", "wave", "ping", "highlight", "boldFlash", "blur", "randomLetterSwap"], best: "Use with hover, click, or manual feedback." },
      { title: "Exit", presets: ["fadeOut", "fadeOutUp", "fadeOutDown", "slideOutUp", "slideOutDown", "slideOutLeft", "slideOutRight", "scaleOut", "popOut", "blurOut", "clipOut", "fadeAway"], best: "Use with show + exitAnimation when inline text leaves." },
    ],
  },
  {
    module: "Paragraph",
    groups: [
      { title: "Word and line reveal", presets: ["wordFadeIn", "wordSlideUp", "wordPop", "lineFadeIn", "lineSlideUp", "streamIn", "streamSlide", "scrollWordReveal"], best: "Use with scroll or mount for readable prose." },
      { title: "Content replacement", presets: ["fadeSwap", "morphText", "slideReplace", "crossFade", "expandCollapse", "morphBlur", "pushLeft", "pushRight", "flipPage"], best: "Use with change when paragraph copy updates." },
      { title: "Review and emphasis", presets: ["highlight", "diffAnimate", "flash"], best: "Use for text review, edits, changed words, or attention states." },
      { title: "Paragraph-level motion", presets: ["fadeIn", "slideUp", "slideDown", "slideLeft", "slideRight", "popIn", "expandIn", "zoomIn", "pulse", "shake"], best: "Use for paragraph-level entrances on scroll or mount — unlike Block these operate on word/line structure, not just the outer box." },
      { title: "Exit", presets: ["paragraphFadeOut", "slideOutUp", "slideOutDown", "slideOutLeft", "slideOutRight", "collapseHeight", "wordFadeOut", "wordSlideOut", "lineFadeOut", "lineSlideOut", "fadeMaskOut"], best: "Use when prose leaves a view, accordion, panel, or route." },
    ],
  },
  {
    module: "List",
    groups: [
      { title: "Stagger", presets: ["staggerFadeIn", "staggerSlideUp", "staggerSlideLeft", "staggerZoomIn", "staggerPopIn", "stackIn"], best: "Use for cards, rows, blocks, buttons, and feature lists." },
      { title: "Cascade", presets: ["wordCascade", "wordWave", "wordDrop", "wordFadeIn"], best: "Use for compact word, tag, and button collections." },
      { title: "Presence", presets: ["itemFadeIn", "itemSlideIn", "itemPopIn", "itemBounceIn", "itemFadeOut", "itemSlideOut", "itemCollapseOut"], best: "Use when keyed children are added or removed." },
      { title: "Exit", presets: ["itemFadeOut", "itemSlideOut", "itemCollapseOut", "itemDismissOut", "rowCollapseOut", "tagRemove", "cardRemove"], best: "Use with keyed removal for rows, cards, tags, notifications, and menus." },
      { title: "Motion systems", presets: ["marquee", "marqueeReverse", "marqueeFade", "parallax", "parallaxFast", "parallaxReverse", "tiltScroll", "scaleScroll", "parallaxStagger", "flip", "smooth", "spring", "none"], best: "Use for logos, scroll-depth card groups, and keyed reorder." },
    ],
  },
  {
    module: "Block",
    groups: [
      { title: "Entrance and exit", presets: ["fadeIn", "fadeSwap", "slideUp", "slideDown", "slideLeft", "slideRight", "scaleIn", "popIn", "rotateIn", "flipX", "flipY", "bounceIn", "blurIn", "clipUp", "clipLeft", "zoomIn"], best: "Use for cards, panels, sections, and notifications." },
      { title: "Scroll-linked", presets: ["parallax", "parallaxFast", "parallaxReverse", "tiltScroll", "scaleScroll"], best: "Use for one hero image, card, or section moving at a different scroll speed." },
      { title: "Hover and cursor", presets: ["lift", "sink", "grow", "glow", "shadow", "borderPop", "tilt", "tilt3D", "rotate3D", "depth"], best: "Use for interactive cards, pricing panels, and clickable surfaces." },
      { title: "Feedback and overlays", presets: ["press", "ripple", "burst", "shake", "wiggle", "jello", "flash", "heartBeat", "pulse", "float", "spin", "ping", "shimmer"], best: "Use for click feedback, loading surfaces, and status moments." },
      { title: "Exit", presets: ["fadeOut", "scaleOut", "popOut", "rotateOut", "bounceOut", "collapseOut", "blurOut", "modalOut", "drawerOutLeft", "toastOut", "dismissOut", "tabPanelOut"], best: "Use for unmounting cards, modals, drawers, tabs, and notifications." },
    ],
  },
]

function DocsSection() {
  return (
    <div className="docs-page">
      <section className="docs-hero">
        <div className="docs-hero-content">
          <span className="docs-kicker">React Animation System</span>
          <h2>Animation that feels like it belongs in your product.</h2>
          <p className="docs-hero-subtitle">
            trigr is a content-aware animation library for React. One import per
            content type. One prop to trigger. Polished motion out of the box.
          </p>
          <div className="docs-hero-actions">
            <a href="#modules" className="docs-hero-btn docs-hero-btn-primary">Explore Modules</a>
            <a href="https://github.com/Emeka-Ugbanu-hub/Trigr" target="_blank" rel="noopener noreferrer" className="docs-hero-btn">View on GitHub</a>
          </div>
        </div>
        <div className="docs-hero-preview">
          <DocCode>{`import { Animate } from "trigr/text"

<Animate.Text
  trigger="change"
  animation="fadeSwap"
>
  {label}
</Animate.Text>`}</DocCode>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span>01</span>
          <h3>Core Model</h3>
          <p>One component per content type. One trigger system everywhere.</p>
        </div>
        <div className="docs-principle-grid">
          <article>
            <strong>Import by what animates</strong>
            <p>Use text for inline words, paragraph for prose, list for repeated keyed children, and block for one full surface.</p>
          </article>
          <article>
            <strong>Trigger by when it runs</strong>
            <p>Use scroll, change, hover, click, manual, or mount. Pass an array for multi-trigger, e.g. <code>trigger={["scroll", "change"]}</code>.</p>
          </article>
          <article>
            <strong>Presets stay content-aware</strong>
            <p>The same idea can feel different by module because text, paragraphs, lists, and blocks have different layout needs.</p>
          </article>
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span>02</span>
          <h3>Modules</h3>
          <p>Pick the wrapper that matches the content shape, not the visual style.</p>
        </div>
        <div className="docs-module-grid">
          {DOC_MODULES.map((item) => (
            <article key={item.title} className="docs-module-card">
              <div>
                <h4>{item.title}</h4>
                <code>{item.importPath}</code>
              </div>
              <p>{item.use}</p>
              <small>{item.examples}</small>
              <strong>{item.component}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span>03</span>
          <h3>Triggers</h3>
          <p>Triggers decide when motion fires. Presets decide how it feels.</p>
        </div>
        <div className="docs-trigger-grid">
          {DOC_TRIGGERS.map((item) => (
            <article key={item.name}>
              <h4>{item.name}</h4>
              <p>{item.desc}</p>
              <small>{item.best}</small>
            </article>
          ))}
        </div>
        <DocCode>{`<Animate.Text
  trigger={["scroll", "change"]}
  scrollAnimation="fadeIn"
  animation="fadeSwap"
  threshold={0.3}
>
  {text}
</Animate.Text>

{/* Or use the triggers API for per-trigger animations: */}
<Animate.Text
  triggers={[
    { trigger: "scroll", animation: "fadeIn", threshold: 0.3 },
    { trigger: "change", animation: "fadeSwap" },
  ]}
>
  {text}
</Animate.Text>`}</DocCode>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span>04</span>
          <h3>Animation Categories</h3>
          <p>Every preset is grouped by intent so teams can choose motion deliberately.</p>
        </div>
        <div className="docs-animation-groups">
          {DOC_ANIMATION_GROUPS.map((module) => (
            <article key={module.module} className="docs-animation-module">
              <h4>{module.module}</h4>
              <div className="docs-preset-groups">
                {module.groups.map((group) => (
                  <div key={group.title} className="docs-preset-group">
                    <div>
                      <strong>{group.title}</strong>
                      <small>{group.best}</small>
                    </div>
                    <div className="docs-preset-pills">
                      {group.presets.map((preset) => <span key={preset}>{preset}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-section">
        <div className="docs-section-head">
          <span>05</span>
          <h3>Extended API</h3>
          <p>Additional props and APIs shared across modules.</p>
        </div>
        <div className="docs-api-grid">
          <article>
            <h4>properties</h4>
            <p>Tween one or more CSS properties alongside the main animation. Pass an object where each key is a CSS property and the value is a <code>[from, to]</code> pair.</p>
            <DocCode>{`<Animate.Text
  trigger="change"
  animation="morph"
  properties={{
    color: ["#111111", "#7F77DD"],
    letterSpacing: ["0px", "0.5px"]
  }}
>
  {label}
</Animate.Text>`}</DocCode>
          </article>
          <article>
            <h4>triggers</h4>
            <p>Array of per-trigger configs that replace <code>trigger</code> + <code>scrollAnimation</code>. Each object specifies a trigger source, its animation, and an optional per-trigger <code>threshold</code>. The old <code>trigger</code>/<code>scrollAnimation</code> props still work for backwards compatibility.</p>
            <DocCode>{`<Animate.Text
  triggers={[
    { trigger: "scroll", animation: "wordFadeIn", threshold: 0.3 },
    { trigger: "click", animation: "shake" },
    { trigger: "hover", animation: "highlight" },
  ]}
>
  {label}
</Animate.Text>`}</DocCode>
          </article>
          <article>
            <h4>show</h4>
            <p>Controls mounted state declaratively. When <code>show</code> becomes <code>false</code>, <code>exitAnimation</code> plays before unmount. Available on Text, Paragraph, and Block. List exits are driven by keyed child removal.</p>
            <DocCode>{`<Animate.Block
  show={isVisible}
  animation="fadeIn"
  exitAnimation="fadeOut"
  unmountOnExit
>
  <Card />
</Animate.Block>

<Animate.Text
  show={showLabel}
  animation="fadeIn"
  exitAnimation="slideOutUp"
>
  Saved
</Animate.Text>`}</DocCode>
          </article>
          <article>
            <h4>speed</h4>
            <p>Used by marquee and scroll-linked presets. On <code>Animate.List</code> it controls marquee pixels-per-second (default <code>50</code>). On <code>Animate.Block</code> it controls parallax depth multiplier (default <code>0.5</code>).</p>
            <DocCode>{`<Animate.List
  animation="marquee"
  speed={50}
>
  {logos.map((logo) => <span key={logo}>{logo}</span>)}
</Animate.List>`}</DocCode>
          </article>
          <article>
            <h4>as</h4>
            <p>Sets the wrapper element rendered by each module. Text defaults to <code>"span"</code>; Paragraph, List, and Block default to <code>"div"</code>. List item wrappers are always <code>&lt;div&gt;</code> and cannot be changed.</p>
            <DocCode>{`<Animate.Text as="h2">
  Hello
</Animate.Text>

<Animate.List as="ul">
  {items.map((item) => <li key={item.id}>{item.name}</li>)}
</Animate.List>`}</DocCode>
          </article>
          <article>
            <h4>reorder</h4>
            <p>Sets the reorder animation preset for keyed list children. Accepts <code>"flip"</code>, <code>"smooth"</code>, <code>"spring"</code>, or <code>"none"</code>. Detects key changes and animates items to their new positions.</p>
            <DocCode>{`<Animate.List
  animation="staggerFadeIn"
  exitAnimation="slideOut"
  reorderAnimation="flip"
>
  {items.map((item) => <Row key={item.id} {...item} />)}
</Animate.List>`}</DocCode>
          </article>
          <article>
            <h4>AnimateHandle (ref API)</h4>
            <p>Every component exposes an imperative handle with <code>animate()</code>. Use with <code>trigger="manual"</code> or any trigger to replay the animation.</p>
            <DocCode>{`const ref = useRef(null)

function handleClick() {
  ref.current?.animate()
}

<Animate.Text ref={ref} trigger="manual" animation="bounce">
  Click Me
</Animate.Text>`}</DocCode>
          </article>
          <article>
            <h4>Easing constants</h4>
            <p>Each module exports named easing constants: <code>SPRING</code>, <code>SNAPPY</code>, <code>SMOOTH</code>, <code>EASE_IN</code>, <code>EASE_OUT</code>, <code>EASE_IN_OUT</code>. All except <code>SNAPPY</code> are available from every module (SNAPPY is not in paragraph). Pass the string or constant to <code>easing</code>.</p>
            <DocCode>{`import { SPRING, SMOOTH } from "trigr/text"

<Animate.Text
  trigger="change"
  animation="morph"
  easing={SPRING}
>
  {label}
</Animate.Text>`}</DocCode>
          </article>
          <article>
            <h4>Four modules only</h4>
            <p>trigr ships exactly four modules: <code>text</code>, <code>paragraph</code>, <code>list</code>, and <code>block</code>. Earlier prototypes included <code>trigr/mount</code> and <code>trigr/empty</code> — these were removed. Every animation path now lives inside the four content-aware wrappers above.</p>
          </article>
        </div>
      </section>

      <section className="docs-section docs-best-practices">
        <div className="docs-section-head">
          <span>06</span>
          <h3>Best Practices</h3>
          <p>Rules for using trigr in production without making the interface feel busy.</p>
        </div>
        <div className="docs-practice-grid">
          <article><strong>Use change presets for replacement</strong><p>fadeSwap, morph, typewriter, and slideReplace need old and new values to feel correct.</p></article>
          <article><strong>Use scroll presets for reveal</strong><p>Scroll should reveal content or link motion to scroll depth. Avoid forcing swap-only presets into scroll demos.</p></article>
          <article><strong>Use list for keyed collections</strong><p>Every child needs a stable key. trigr uses keys for presence, reorder, and item tracking.</p></article>
          <article><strong>Keep hover and click short</strong><p>Interaction feedback should feel immediate. Use shorter duration and snappy easing.</p></article>
          <article><strong>Prefer block for one surface</strong><p>If one complete card or image moves together, use block. If many children move as a collection, use list. Paragraph works with prose structure, not just the outer box.</p></article>
          <article><strong>Add properties for parallel style transitions</strong><p>Use properties when color, font size, or background should tween alongside the animation.</p></article>
          <article><strong>Use show for block exit animations</strong><p>Wrap conditional block content with show + exitAnimation + unmountOnExit instead of manual state toggling for smooth unmounts.</p></article>
        </div>
      </section>
    </div>
  )
}

// ── Main Playground ───────────────────────────────────────────────

export default function Playground() {
  const initialState = useMemo(getSavedPlaygroundState, [])
  const [module, setModule] = useState<ModuleId>(initialState.module)
  const [trigger, setTrigger] = useState<Trigger>(initialState.trigger)
  const [preset, setPreset] = useState(initialState.preset)
  const [duration, setDuration] = useState(initialState.duration)
  const [easing, setEasing] = useState(initialState.easing)
  const [threshold, setThreshold] = useState(initialState.threshold)
  const [stagger, setStagger] = useState(initialState.stagger)
  const [listSpeed, setListSpeed] = useState(initialState.listSpeed)
  const [exitPreset, setExitPreset] = useState(initialState.exitPreset)
  const [exitCategory, setExitCategory] = useState("all")
  const [propertyRows, setPropertyRows] = useState<PropertyRow[]>(initialState.propertyRows)
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(initialState.dark)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [animDistance, setAnimDistance] = useState(initialState.animOptions.distance)
  const [animScale, setAnimScale] = useState(initialState.animOptions.scale)
  const [animBlur, setAnimBlur] = useState(initialState.animOptions.blur)
  const [animRotate, setAnimRotate] = useState(initialState.animOptions.rotate)
  const [animOptionsEnabled, setAnimOptionsEnabled] = useState(initialState.animOptionsEnabled)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light"
  }, [dark])
  const runtimeOptions = useMemo<RuntimeOptions>(() => ({
    threshold,
    stagger,
    listSpeed,
    propertyRows,
  }), [listSpeed, stagger, threshold, propertyRows])

  const meta = MODULE_META[module]
  const availablePresets = presetsFor(module, trigger)
  const activeSectionKey = `${module}:${trigger}:${preset}`
  const isListParallaxPreset = module === "list" && LIST_PARALLAX_PRESETS.includes(preset as ListAnimationPreset)
  const isListMarqueePreset = module === "list" && LIST_MARQUEE_PRESETS.includes(preset as ListAnimationPreset)
  const filteredExitOptions = useMemo(() => {
    const all = exitPresetsFor(module)
    if (exitCategory === "all") return all
    return all.filter(p => exitCategoryMatch(p, exitCategory))
  }, [module, exitCategory])

  const allTriggers = meta.triggers
  const exitTrigger = "exit" as Trigger

  useEffect(() => {
    if (module === "docs") {
      if (preset) setPreset("")
      return
    }
    if (!availablePresets.includes(preset as never)) {
      setPreset(availablePresets[0] ?? "fadeIn")
    }
  }, [availablePresets, module, preset])

  useEffect(() => {
    if (!exitPreset || module === "docs") return
    const validExits = exitPresetsFor(module)
    if (!validExits.includes(exitPreset)) {
      setExitPreset("")
    }
  }, [module, exitPreset])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(PLAYGROUND_STATE_KEY, JSON.stringify({
      module,
      trigger,
      preset,
      exitPreset,
      duration,
      easing,
      threshold,
      stagger,
      listSpeed,
      dark,
      propertyRows,
      animOptionsEnabled,
      animOptions: { distance: animDistance, scale: animScale, blur: animBlur, rotate: animRotate },
    }))
  }, [module, trigger, preset, exitPreset, duration, easing, threshold, stagger, listSpeed, dark, propertyRows, animOptionsEnabled, animDistance, animScale, animBlur, animRotate])

  function selectModule(m: ModuleId, t?: Trigger) {
    setModule(m)
    setExitPreset("")
    const nextTrigger = t ?? MODULE_META[m].triggers[0] ?? DEFAULT_PLAYGROUND_STATE.trigger
    setTrigger(nextTrigger)
    const nextPreset = m === "docs" ? "" : presetsFor(m, nextTrigger)[0] ?? "fadeIn"
    setPreset(nextPreset)
    if (nextPreset && m !== "docs") {
      const def = getAnimationDefaults(nextPreset)
      setDuration(def.duration)
      setEasing(def.easing)
    }
    setSidebarOpen(false)
  }

  function selectTrigger(t: Trigger) {
    if (module === "docs") return
    setTrigger(t)
    const presets = presetsFor(module, t)
    const nextPreset = presets[0] ?? "fadeIn"
    setPreset(nextPreset)
    const def = getAnimationDefaults(nextPreset)
    setDuration(def.duration)
    setEasing(def.easing)
  }

  const moduleEntries = useMemo(() => Object.keys(MODULE_META) as ModuleId[], [])
  const properties = useMemo(() => buildProperties(propertyRows), [propertyRows])

  const presetOptions = useMemo(() => {
    if (!animOptionsEnabled) return undefined
    const opts: Record<string, number> = {}
    if (animDistance !== 32) opts.distance = animDistance
    if (animScale !== 0.92) opts.scale = animScale
    if (animBlur !== 4) opts.blur = animBlur
    if (animRotate !== 8) opts.rotate = animRotate
    return Object.keys(opts).length ? opts : undefined
  }, [animOptionsEnabled, animDistance, animScale, animBlur, animRotate])

  return (
    <div>
      <style>{styles}</style>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="logo">
            <svg viewBox="0 0 240 80" width="100" height="34" xmlns="http://www.w3.org/2000/svg">
              <rect width="240" height="80" fill="transparent" />
              <g fill="var(--logo-fill)">
                <rect x="10" y="14" width="8" height="8" />
                <rect x="20" y="14" width="8" height="8" />
                <rect x="30" y="14" width="8" height="8" />
                <rect x="10" y="28" width="8" height="8" />
                <rect x="30" y="28" width="8" height="8" />
                <rect x="10" y="42" width="8" height="8" />
                <rect x="20" y="42" width="8" height="8" />
                <rect x="30" y="42" width="8" height="8" />
              </g>
              <text x="50" y="48" fontFamily="'Courier New', monospace" fontSize="36" fontWeight="bold" fill="var(--logo-fill)" letterSpacing="2">trigr</text>
            </svg>
          </span>
          <nav className="topbar-nav">
            <button type="button" onClick={() => selectModule("docs")}>Docs</button>
            <a href="https://github.com/Emeka-Ugbanu-hub/Trigr" target="_blank" rel="noopener noreferrer">GitHub</a>
            <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">
              {dark ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
            </button>
          </nav>
        </div>
      </header>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="layout">
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="sidebar-scroll">
            {moduleEntries.map((m) => {
                  const mm = MODULE_META[m]
                  const isActive = module === m
                  return (
                    <div key={m} className={`sidebar-module${isActive ? " active" : ""}`} style={isActive ? { "--module-color": mm.color } as React.CSSProperties : {}}>
                      <button className="sidebar-module-btn" onClick={() => selectModule(m, mm.triggers[0])}>
                        <span className="sidebar-module-indicator" />
                        <span className="sidebar-module-title">{mm.title}</span>
                      </button>
                      {isActive && mm.triggers.length > 0 && (
                        <div className="sidebar-triggers">
                          {mm.triggers.map((t) => (
                            <button
                              key={t}
                              className={`sidebar-trigger${trigger === t ? " active" : ""}`}
                              onClick={() => selectTrigger(t)}
                            >
                              <span className="sidebar-trigger-name">{t}</span>
                              <span className="sidebar-trigger-count">{presetsFor(m, t).length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              {module !== "docs" && <div className="controls-section">
              <div className="controls-header">
                <span className="controls-title">Controls</span>
              </div>
              <div className="control-group">
                <label className="control-label">Animation</label>
                <SelectMenu value={preset} options={availablePresets} onChange={setPreset} />
              </div>
              <div className="control-group">
                <label className="control-label">Exit Animation</label>
                <SelectMenu
                  value={exitPreset || "None"}
                  options={["None", ...filteredExitOptions]}
                  onChange={(v) => setExitPreset(v === "None" ? "" : v)}
                />
              </div>
              {exitPresetsFor(module).length > 0 && (
                <div className="control-group">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    <button type="button" className={!exitCategory || exitCategory === "all" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("all")}>All</button>
                    <button type="button" className={exitCategory === "fade" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("fade")}>Fade</button>
                    <button type="button" className={exitCategory === "slide" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("slide")}>Slide</button>
                    <button type="button" className={exitCategory === "scale" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("scale")}>Scale</button>
                    <button type="button" className={exitCategory === "collapse" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("collapse")}>Collapse</button>
                    <button type="button" className={exitCategory === "blur" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("blur")}>Blur</button>
                    {module === "block" && <button type="button" className={exitCategory === "modal" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("modal")}>Modal</button>}
                    {module === "block" && <button type="button" className={exitCategory === "toast" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("toast")}>Toast</button>}
                    {module === "list" && <button type="button" className={exitCategory === "item" ? "control-chip active" : "control-chip"} onClick={() => setExitCategory("item")}>Item</button>}
                  </div>
                </div>
              )}
              <div className="control-group">
                <div className="control-label-row">
                  <label className="control-label">Duration</label>
                  <span className="control-value">{duration}ms</span>
                </div>
                <input type="range" min="100" max="1000" step="10" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="control-slider" />
              </div>
              <div className="control-group">
                <label className="control-label">Easing</label>
                <SelectMenu
                  value={EASINGS.find(([, val]) => val === easing)?.[0] ?? "Spring"}
                  options={EASINGS.map(([label]) => label)}
                  onChange={(label) => {
                    const next = EASINGS.find(([name]) => name === label)?.[1]
                    if (next) setEasing(next)
                  }}
                />
              </div>
              <div className="control-group">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button type="button" className="properties-toggle" onClick={() => setOptionsOpen(v => !v)}>
                    <span className="control-label">Animation Options</span>
                    <span className="properties-toggle-icon">{optionsOpen ? "▾" : "▸"}</span>
                    {animOptionsEnabled && <span className="properties-count">on</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnimOptionsEnabled(v => !v)}
                    className="property-enable-btn"
                    style={{
                      padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)",
                      background: animOptionsEnabled ? "#31c66d" : "var(--bg)",
                      color: animOptionsEnabled ? "#fff" : "var(--text-tertiary)",
                      fontSize: 11, cursor: "pointer", marginLeft: "auto",
                    }}
                  >
                    {animOptionsEnabled ? "on" : "off"}
                  </button>
                </div>
              </div>

              {optionsOpen && (
                <div className="properties-panel">
                  <div className="control-group">
                    <div className="control-label-row">
                      <label className="control-label">Distance</label>
                      <span className="control-value">{animDistance}px</span>
                    </div>
                    <input type="range" min="8" max="128" step="8" value={animDistance}
                      onChange={(e) => setAnimDistance(Number(e.target.value))}
                      className="control-slider" />
                  </div>
                  <div className="control-group">
                    <div className="control-label-row">
                      <label className="control-label">Scale</label>
                      <span className="control-value">{animScale.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0.5" max="1.5" step="0.02" value={animScale}
                      onChange={(e) => setAnimScale(Number(e.target.value))}
                      className="control-slider" />
                  </div>
                  <div className="control-group">
                    <div className="control-label-row">
                      <label className="control-label">Blur</label>
                      <span className="control-value">{animBlur}px</span>
                    </div>
                    <input type="range" min="0" max="20" step="1" value={animBlur}
                      onChange={(e) => setAnimBlur(Number(e.target.value))}
                      className="control-slider" />
                  </div>
                  {module === "block" && (
                    <div className="control-group">
                      <div className="control-label-row">
                        <label className="control-label">Rotate</label>
                        <span className="control-value">{animRotate}°</span>
                      </div>
                      <input type="range" min="-30" max="30" step="2" value={animRotate}
                        onChange={(e) => setAnimRotate(Number(e.target.value))}
                        className="control-slider" />
                    </div>
                  )}
                </div>
              )}
              <div className="control-group">
                <button type="button" className="properties-toggle" onClick={() => setPropertiesOpen(v => !v)}>
                  <span className="control-label">Properties</span>
                  <span className="properties-toggle-icon">{propertiesOpen ? "▾" : "▸"}</span>
                  {propertyRows.some(r => r.enabled) && <span className="properties-count">{propertyRows.filter(r => r.enabled).length}</span>}
                </button>
              </div>

              {propertiesOpen && (
                <div className="properties-panel">
                  <div className="properties-quick" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Quick insert:</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <button type="button" className="control-chip" onClick={() => setPropertyRows(prev => [...prev, { id: nextPropRowId(), name: "color", from: "#111111", to: "#7F77DD", enabled: true }])}>Color</button>
                      <button type="button" className="control-chip" onClick={() => setPropertyRows(prev => [...prev, { id: nextPropRowId(), name: "backgroundColor", from: "#ffffff", to: "#f7f7f7", enabled: true }])}>Background</button>
                      <button type="button" className="control-chip" onClick={() => setPropertyRows(prev => [...prev, { id: nextPropRowId(), name: "borderColor", from: "#e5e5e5", to: "#111111", enabled: true }])}>Border</button>
                      <button type="button" className="control-chip" onClick={() => setPropertyRows(prev => [...prev, { id: nextPropRowId(), name: "fontSize", from: "14px", to: "18px", enabled: true }])}>Font size</button>
                      <button type="button" className="control-chip" onClick={() => setPropertyRows(prev => [...prev, { id: nextPropRowId(), name: "opacity", from: "1", to: "0.7", enabled: true }])}>Opacity</button>
                      <button type="button" className="control-chip" onClick={() => setPropertyRows(prev => [...prev, { id: nextPropRowId(), name: "filter", from: "blur(0px)", to: "blur(4px)", enabled: true }])}>Blur</button>
                    </div>
                  </div>

                  {propertyRows.map((row) => (
                    <div key={row.id} className="property-row" style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => setPropertyRows(prev => prev.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                        placeholder="property"
                        className="property-input"
                        style={{ width: "30%", minWidth: 60 }}
                      />
                      <input
                        type="text"
                        value={row.from}
                        onChange={(e) => setPropertyRows(prev => prev.map(r => r.id === row.id ? { ...r, from: e.target.value } : r))}
                        placeholder="from"
                        className="property-input"
                        style={{ width: "30%", minWidth: 60 }}
                      />
                      <input
                        type="text"
                        value={row.to}
                        onChange={(e) => setPropertyRows(prev => prev.map(r => r.id === row.id ? { ...r, to: e.target.value } : r))}
                        placeholder="to"
                        className="property-input"
                        style={{ width: "30%", minWidth: 60 }}
                      />
                      <button
                        type="button"
                        onClick={() => setPropertyRows(prev => prev.map(r => r.id === row.id ? { ...r, enabled: !r.enabled } : r))}
                        className="property-enable-btn"
                        style={{
                          padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)",
                          background: row.enabled ? "#31c66d" : "var(--bg)",
                          color: row.enabled ? "#fff" : "var(--text-tertiary)",
                          fontSize: 11, cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        {row.enabled ? "on" : "off"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPropertyRows(prev => prev.filter(r => r.id !== row.id))}
                        className="property-remove-btn"
                        style={{ padding: "2px 6px", border: "none", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                      >
                        ×
                      </button>
                      {row.name.toLowerCase().includes("transform") && (
                        <div style={{ width: "100%", fontSize: 11, color: "#f59e0b", marginTop: 2, paddingLeft: 2 }}>
                          ⚠ transform may conflict with animation presets
                        </div>
                      )}
                    </div>
                  ))}

                  <button type="button" className="control-chip" onClick={() => setPropertyRows(prev => [...prev, { id: nextPropRowId(), name: "", from: "", to: "", enabled: false }])} style={{ marginTop: 4 }}>
                    + Add property
                  </button>
                </div>
              )}
              {(module === "text" || module === "paragraph" || module === "block" || module === "list") && trigger === "scroll" && (
                <div className="control-group">
                  <div className="control-label-row">
                    <label className="control-label">Threshold</label>
                    <span className="control-value">{threshold.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.1" max="1" step="0.05" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="control-slider" />
                </div>
              )}
              {module === "list" && (
                <>
                  {!isListParallaxPreset && !isListMarqueePreset && (
                    <div className="control-group">
                      <div className="control-label-row">
                        <label className="control-label">Stagger</label>
                        <span className="control-value">{stagger}ms</span>
                      </div>
                      <input type="range" min="0" max="240" step="10" value={stagger} onChange={(e) => setStagger(Number(e.target.value))} className="control-slider" />
                    </div>
                  )}
                  {(isListParallaxPreset || isListMarqueePreset) && (
                    <div className="control-group">
                      <div className="control-label-row">
                        <label className="control-label">{isListParallaxPreset ? "Parallax speed" : "Marquee speed"}</label>
                        <span className="control-value">{isListParallaxPreset ? (listSpeed / 100).toFixed(2) : `${listSpeed}px/s`}</span>
                      </div>
                      <input type="range" min="10" max="180" step="5" value={listSpeed} onChange={(e) => setListSpeed(Number(e.target.value))} className="control-slider" />
                    </div>
                  )}
                </>
              )}
            </div>}
          </div>
        </aside>
        <main className="main">
          <div className="main-header">
            <h1>{meta.title} {module !== "docs" && <span className="badge">{trigger}</span>}</h1>
            <p className="main-desc">{meta.desc}</p>
          </div>
          <div className="main-content">
            <RuntimeOptionsContext.Provider value={runtimeOptions}>
              {module !== "docs" && <CapabilityPanel module={module} trigger={trigger} preset={preset} />}
              {module === "docs" && <DocsSection />}
              {module === "text" && <TextSection key={activeSectionKey} preset={preset as AnimationPreset} duration={duration} easing={easing} trigger={trigger} exitPreset={exitPreset as AnimationPreset} properties={properties} presetOptions={presetOptions} />}
              {module === "paragraph" && <ParagraphSection key={activeSectionKey} preset={preset as ParagraphPreset} duration={duration} easing={easing} trigger={trigger} exitPreset={exitPreset as ParagraphPreset} properties={properties} presetOptions={presetOptions} />}
              {module === "list" && <ListSection key={activeSectionKey} preset={preset as ListAnimationPreset} duration={duration} easing={easing} trigger={trigger} exitPreset={exitPreset as ListAnimationPreset} properties={properties} presetOptions={presetOptions} />}
              {module === "block" && <BlockSection key={activeSectionKey} preset={preset as BlockAnimationPreset} duration={duration} easing={easing} trigger={trigger} exitPreset={exitPreset as BlockAnimationPreset} properties={properties} presetOptions={presetOptions} />}
            </RuntimeOptionsContext.Provider>
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────

const styles = `
*, *::before, *::after { box-sizing: border-box; }

:root {
  --bg: #fafafa;
  --bg-elevated: #ffffff;
  --bg-sidebar: #f5f5f5;
  --bg-topbar: #ffffff;
  --border: #e8e8e8;
  --border-subtle: #f0f0f0;
  --text: #171717;
  --text-secondary: #525252;
  --text-tertiary: #737373;
  --accent: #171717;
  --accent-hover: #404040;
  --docs-bg: #ffffff;
  --code-bg: #f5f5f5;
  --logo-fill: #171717;
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
  --shadow-lg: 0 4px 6px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.06);
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --sidebar-width: 260px;
  --preview-stage-height: clamp(420px, calc(100dvh - 210px), 560px);
}

[data-theme="dark"] {
  --bg: #0a0a0a;
  --bg-elevated: #141414;
  --bg-sidebar: #0a0a0a;
  --bg-topbar: #0a0a0a;
  --border: #262626;
  --border-subtle: #0d0d0d;
  --text: #f5f5f5;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --accent: #f5f5f5;
  --accent-hover: #ffffff;
  --docs-bg: #141414;
  --code-bg: #1a1a1a;
  --logo-fill: #f5f5f5;
}

[data-theme="dark"] .select-trigger,
[data-theme="dark"] .select-popover,
[data-theme="dark"] .select-search-wrap,
[data-theme="dark"] .select-empty,
[data-theme="dark"] .preview-card,
[data-theme="dark"] .docs-section,
[data-theme="dark"] .docs-hero,
[data-theme="dark"] .docs-module-card,
[data-theme="dark"] .docs-practice-grid article,
[data-theme="dark"] .capability-panel,
[data-theme="dark"] .docs-api-grid article,
[data-theme="dark"] .docs-trigger-grid article,
[data-theme="dark"] .docs-principle-grid article,
[data-theme="dark"] .docs-preset-group,
[data-theme="dark"] .docs-animation-module { background: var(--bg-elevated); }

[data-theme="dark"] .select-option { color: var(--text); }
[data-theme="dark"] .select-option:hover { background: var(--bg-sidebar); }
[data-theme="dark"] .select-option.active { background: #2a2a2e; color: var(--text); font-weight: 600; }
[data-theme="dark"] .select-caret { color: var(--text-tertiary); }
[data-theme="dark"] .select-trigger:hover { border-color: var(--border); }
[data-theme="dark"] .select-menu.open .select-trigger { border-color: var(--text-tertiary); box-shadow: 0 0 0 2px rgba(232,232,237,0.08); }

[data-theme="dark"] .doc-code { background: var(--code-bg); }

[data-theme="dark"] .control-slider { background: var(--border); }
[data-theme="dark"] .control-slider::-webkit-slider-thumb { background: var(--text); }

[data-theme="dark"] .sidebar-trigger:hover { background: var(--bg-elevated); }
[data-theme="dark"] .sidebar-trigger.active { background: var(--bg-elevated); }

[data-theme="dark"] .preview-body { background: var(--bg-elevated); }
[data-theme="dark"] .preview-toolbar { background: var(--bg-sidebar); border-color: var(--border-subtle); }
[data-theme="dark"] .code-wrap { background: var(--code-bg); }
[data-theme="dark"] .code-block { background: #1a1a1c; }
[data-theme="dark"] .demo-stage { background: var(--bg-elevated); }
[data-theme="dark"] .real-demo { background: var(--bg-elevated); }
[data-theme="dark"] .search-field { background: var(--bg-elevated); }
[data-theme="dark"] .toast-demo { background: var(--bg-elevated); }
[data-theme="dark"] .card-basic { background: #2a2520; }
[data-theme="dark"] .card-pricing { background: #2a2020; }
[data-theme="dark"] .card-faq { background: #20202a; }
[data-theme="dark"] .list-card { background: var(--bg-elevated); }
[data-theme="dark"] .grid-card { background: var(--bg-elevated); }
[data-theme="dark"] .reorder-card { background: var(--bg-elevated); }
[data-theme="dark"] .ghost { background: var(--bg-elevated); border-color: var(--border); }
[data-theme="dark"] .nav-links-demo { background: var(--bg-elevated); }
[data-theme="dark"] .docs-hero::before {
  background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%);
}

/* ── Dark Mode Text Colors ─────────────────── */
/* Force all text to use light colors in dark mode */
[data-theme="dark"] .docs-hero h2,
[data-theme="dark"] .docs-hero p,
[data-theme="dark"] .docs-section h3,
[data-theme="dark"] .docs-section p,
[data-theme="dark"] .docs-section strong,
[data-theme="dark"] .docs-module-card h4,
[data-theme="dark"] .docs-module-card p,
[data-theme="dark"] .docs-module-card small,
[data-theme="dark"] .docs-module-card > strong,
[data-theme="dark"] .docs-principle-grid article strong,
[data-theme="dark"] .docs-principle-grid article p,
[data-theme="dark"] .docs-trigger-grid h4,
[data-theme="dark"] .docs-trigger-grid p,
[data-theme="dark"] .docs-trigger-grid small,
[data-theme="dark"] .docs-practice-grid article strong,
[data-theme="dark"] .docs-practice-grid article p,
[data-theme="dark"] .docs-api-grid article h4,
[data-theme="dark"] .docs-api-grid article p,
[data-theme="dark"] .docs-animation-module h4,
[data-theme="dark"] .docs-preset-group strong,
[data-theme="dark"] .docs-preset-group small { color: var(--text) !important; }

[data-theme="dark"] .docs-hero-subtitle,
[data-theme="dark"] .docs-section-head p,
[data-theme="dark"] .docs-module-card p,
[data-theme="dark"] .docs-principle-grid article p,
[data-theme="dark"] .docs-trigger-grid p,
[data-theme="dark"] .docs-practice-grid article p,
[data-theme="dark"] .docs-api-grid article p,
[data-theme="dark"] .docs-kicker,
[data-theme="dark"] .docs-section-head span,
[data-theme="dark"] .docs-module-card small,
[data-theme="dark"] .docs-trigger-grid small,
[data-theme="dark"] .docs-preset-group small { color: var(--text-secondary) !important; }

/* Blog card dark mode */
[data-theme="dark"] .blog-card-body h3,
[data-theme="dark"] .blog-card-body p,
[data-theme="dark"] .blog-card-meta,
[data-theme="dark"] .blog-card-date,
[data-theme="dark"] .blog-card-author,
[data-theme="dark"] .blog-card-read,
[data-theme="dark"] .blog-card-tag { color: var(--text) !important; }

/* Search demo dark mode */
[data-theme="dark"] .search-real-header,
[data-theme="dark"] .search-real-header input,
[data-theme="dark"] .search-real-result-item,
[data-theme="dark"] .search-real-result-body h4,
[data-theme="dark"] .search-real-result-body p { color: var(--text) !important; }
[data-theme="dark"] .search-real-header input::placeholder { color: var(--text-tertiary); }

/* App header demo dark mode */
[data-theme="dark"] .app-header-demo,
[data-theme="dark"] .app-header-logo,
[data-theme="dark"] .app-header-logo span { color: var(--text) !important; }
[data-theme="dark"] .app-header-cta { color: var(--bg-elevated) !important; }

/* Landing hero demo dark mode */
[data-theme="dark"] .landing-hero-demo,
[data-theme="dark"] .landing-eyebrow,
[data-theme="dark"] .landing-headline,
[data-theme="dark"] .landing-subtitle { color: var(--text) !important; }
[data-theme="dark"] .landing-btn { color: var(--text-secondary) !important; background: var(--bg-elevated) !important; }
[data-theme="dark"] .landing-btn:hover { color: var(--text) !important; }
[data-theme="dark"] .landing-btn-primary,
[data-theme="dark"] .landing-btn-primary:hover { color: var(--bg-elevated) !important; background: var(--accent) !important; }

/* Testimonial demo dark mode */
[data-theme="dark"] .testimonial-demo,
[data-theme="dark"] .testimonial-author strong,
[data-theme="dark"] .testimonial-author span { color: var(--text) !important; }

/* Page load demo dark mode */
[data-theme="dark"] .page-load-content,
[data-theme="dark"] .page-load-content h2,
[data-theme="dark"] .page-load-desc,
[data-theme="dark"] .page-load-stat strong,
[data-theme="dark"] .page-load-stat span { color: var(--text) !important; }
[data-theme="dark"] .page-load-desc,
[data-theme="dark"] .page-load-stat span { color: var(--text-secondary) !important; }

/* List demos dark mode */
[data-theme="dark"] .list-dashboard-row,
[data-theme="dark"] .list-feature-card,
[data-theme="dark"] .list-notification-row,
[data-theme="dark"] .list-tag-pill,
[data-theme="dark"] .list-nav-row,
[data-theme="dark"] .list-flip-card,
[data-theme="dark"] .list-bounce-item,
[data-theme="dark"] .list-pop-row,
[data-theme="dark"] .list-menu-button { background: var(--bg-elevated) !important; }
[data-theme="dark"] .list-dashboard-row,
[data-theme="dark"] .list-dashboard-row strong,
[data-theme="dark"] .list-dashboard-row p,
[data-theme="dark"] .list-feature-card,
[data-theme="dark"] .list-feature-card strong,
[data-theme="dark"] .list-feature-card p,
[data-theme="dark"] .list-feature-card span,
[data-theme="dark"] .list-notification-row,
[data-theme="dark"] .list-notification-row strong,
[data-theme="dark"] .list-notification-row p,
[data-theme="dark"] .list-tag-pill,
[data-theme="dark"] .list-nav-row,
[data-theme="dark"] .list-nav-row strong,
[data-theme="dark"] .list-flip-card,
[data-theme="dark"] .list-flip-card strong,
[data-theme="dark"] .list-bounce-item,
[data-theme="dark"] .list-bounce-item strong,
[data-theme="dark"] .list-pop-row,
[data-theme="dark"] .list-pop-row strong,
[data-theme="dark"] .list-menu-button { color: var(--text) !important; }
[data-theme="dark"] .list-dashboard-row p,
[data-theme="dark"] .list-feature-card p,
[data-theme="dark"] .list-notification-row p,
[data-theme="dark"] .list-flip-card p,
[data-theme="dark"] .list-pop-row .pop-badge { color: var(--text-secondary) !important; }
[data-theme="dark"] .list-feature-card.tone-green,
[data-theme="dark"] .list-feature-card.tone-blue,
[data-theme="dark"] .list-feature-card.tone-amber,
[data-theme="dark"] .list-feature-card.tone-pink,
[data-theme="dark"] .list-feature-card.tone-violet { background: var(--bg-elevated) !important; }
[data-theme="dark"] .pop-badge { background: rgba(255,255,255,0.08) !important; color: var(--text-secondary) !important; }
[data-theme="dark"] .list-parallax-demo { background: var(--bg-elevated) !important; }
[data-theme="dark"] .list-parallax-card { color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .list-parallax-card span { color: var(--text-tertiary) !important; }
[data-theme="dark"] .list-parallax-card p { color: var(--text-secondary) !important; }
[data-theme="dark"] .list-parallax-card button { background: var(--text) !important; color: var(--bg-elevated) !important; border-color: var(--text) !important; }
[data-theme="dark"] .list-remove-btn { color: var(--text-tertiary) !important; }
[data-theme="dark"] .toolbar-count { color: var(--text-secondary) !important; }

/* Block demos dark mode */
[data-theme="dark"] .block-demo-card,
[data-theme="dark"] .block-demo-card h3,
[data-theme="dark"] .block-demo-card p,
[data-theme="dark"] .block-card-icon { color: var(--text) !important; }
[data-theme="dark"] .block-demo-card p { color: var(--text-secondary) !important; }
[data-theme="dark"] .block-demo-card button { color: var(--bg-elevated) !important; background: var(--accent) !important; border-color: var(--accent) !important; }
[data-theme="dark"] .block-demo-card button:hover { background: var(--accent-hover) !important; border-color: var(--accent-hover) !important; }

/* Demo labels and meta */
[data-theme="dark"] .demo-label { color: var(--text-tertiary) !important; }
[data-theme="dark"] .demo-meta { color: var(--text-tertiary) !important; }

/* Capability panel */
[data-theme="dark"] .capability-panel p { color: var(--text-secondary) !important; }
[data-theme="dark"] .capability-chips span { color: var(--text-secondary) !important; background: var(--bg-sidebar) !important; }

/* Input and controls */
[data-theme="dark"] .search-field input { background: var(--bg-elevated) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .random-btn { background: var(--bg-elevated) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .random-btn:hover { background: var(--accent) !important; color: var(--bg-elevated) !important; }
[data-theme="dark"] .fire-button { background: var(--accent) !important; color: var(--bg-elevated) !important; border-color: var(--accent) !important; }
[data-theme="dark"] .fire-button:hover { background: var(--accent-hover) !important; border-color: var(--accent-hover) !important; }

/* Preview body text */
[data-theme="dark"] .preview-body h1,
[data-theme="dark"] .preview-body h2,
[data-theme="dark"] .preview-body h3,
[data-theme="dark"] .preview-body h4,
[data-theme="dark"] .preview-body p,
[data-theme="dark"] .preview-body span,
[data-theme="dark"] .preview-body div { color: var(--text); }
[data-theme="dark"] .preview-body p { color: var(--text-secondary); }

/* Marquee */
[data-theme="dark"] .marquee-prefix { color: var(--text-tertiary) !important; }
[data-theme="dark"] .marquee-item { color: var(--text) !important; }

/* Code blocks */
[data-theme="dark"] .code { background: #0a0a0a !important; color: #a3a3a3 !important; border-color: rgba(255,255,255,0.06) !important; }
[data-theme="dark"] .code-tag { color: #7dd3fc !important; }
[data-theme="dark"] .code-string { color: #fbbf24 !important; }

/* Doc code */
[data-theme="dark"] .doc-code { background: var(--code-bg) !important; }
[data-theme="dark"] .doc-code pre { color: var(--text) !important; }

/* Scroll demo */
[data-theme="dark"] .scroll-intro { color: var(--text-secondary) !important; }
[data-theme="dark"] .scroll-reveal-item p { color: var(--text-secondary) !important; }

/* Nav links */
[data-theme="dark"] .nav-link-item { color: var(--text-secondary) !important; }
[data-theme="dark"] .nav-link-item:hover { color: var(--text) !important; background: rgba(255,255,255,0.05) !important; }

/* Select menu */
[data-theme="dark"] .select-search { background: var(--bg-sidebar) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .select-search:focus { border-color: var(--text-tertiary) !important; box-shadow: 0 0 0 2px rgba(232,232,237,0.06) !important; }

/* View code button */
[data-theme="dark"] .view-code-btn { background: var(--bg-sidebar) !important; color: var(--text-secondary) !important; border-color: var(--border) !important; }
[data-theme="dark"] .view-code-btn:hover { background: var(--bg) !important; color: var(--text) !important; }

/* Replay button */
[data-theme="dark"] .replay-btn { background: var(--bg-sidebar) !important; color: var(--text-secondary) !important; border-color: var(--border) !important; }
[data-theme="dark"] .replay-btn:hover { background: var(--bg) !important; color: var(--text) !important; }

/* Main header */
[data-theme="dark"] .main-header h1 { color: var(--text) !important; }
[data-theme="dark"] .main-desc { color: var(--text-secondary) !important; }
[data-theme="dark"] .badge { background: var(--bg-elevated) !important; color: var(--text-secondary) !important; border-color: var(--border) !important; }

/* Sidebar */
[data-theme="dark"] .sidebar-module-btn { color: var(--text-secondary) !important; }
[data-theme="dark"] .sidebar-module.active .sidebar-module-btn { color: var(--text) !important; }
[data-theme="dark"] .sidebar-trigger { color: var(--text-tertiary) !important; }
[data-theme="dark"] .sidebar-trigger.active { color: var(--text) !important; }
[data-theme="dark"] .sidebar-trigger-count { background: rgba(255,255,255,0.06) !important; color: var(--text-tertiary) !important; }
[data-theme="dark"] .sidebar-trigger.active .sidebar-trigger-count { background: rgba(255,255,255,0.08) !important; color: var(--text-secondary) !important; }
[data-theme="dark"] .sidebar { border: none !important; outline: none !important; box-shadow: none !important; background: var(--bg) !important; }
[data-theme="dark"] .sidebar-scroll { scrollbar-width: none; }
[data-theme="dark"] .sidebar-scroll::-webkit-scrollbar { display: none; }

/* Controls */
[data-theme="dark"] .controls-title { color: var(--text-tertiary) !important; }
[data-theme="dark"] .control-label { color: var(--text-secondary) !important; }
[data-theme="dark"] .control-value { color: var(--text-tertiary) !important; }
[data-theme="dark"] .control-hint { color: var(--text-tertiary) !important; }

/* Window action buttons */
[data-theme="dark"] .window-action-btn { background: var(--bg-elevated) !important; color: var(--text-secondary) !important; border-color: var(--border) !important; }
[data-theme="dark"] .window-action-btn:hover { background: var(--bg-sidebar) !important; color: var(--text) !important; }

/* Cards */
[data-theme="dark"] .card-basic { background: #2a2520 !important; }
[data-theme="dark"] .card-pro { background: #1a2530 !important; }
[data-theme="dark"] .card-features { background: #1a2a1f !important; }
[data-theme="dark"] .card-pricing { background: #2a1a1c !important; }
[data-theme="dark"] .card-faq { background: #1a1a2a !important; }
[data-theme="dark"] .card-welcome { background: #1a2a1f !important; }

/* Parallax demo */
[data-theme="dark"] .parallax-demo .block-demo-card { background: var(--bg-elevated) !important; }

/* Toast / notif */
[data-theme="dark"] .notif-card { background: var(--bg-elevated) !important; border-color: var(--border) !important; }
[data-theme="dark"] .notif-card:hover { background: var(--bg) !important; }
[data-theme="dark"] .notif-body strong { color: var(--text) !important; }
[data-theme="dark"] .notif-body p { color: var(--text-secondary) !important; }
[data-theme="dark"] .notif-dismiss { color: var(--text-tertiary) !important; }
[data-theme="dark"] .notif-dismiss:hover { color: #ef4444 !important; }
[data-theme="dark"] .empty-notifs { color: var(--text-tertiary) !important; }

/* Exit controls */
[data-theme="dark"] .exit-controls .select-menu { color: var(--text) !important; }

/* Article / paragraph display */
[data-theme="dark"] .paragraph-display article h3 { color: var(--text) !important; }
[data-theme="dark"] .paragraph-display article p { color: var(--text-secondary) !important; }

/* Quote display */
[data-theme="dark"] .quote-display { color: var(--text) !important; }
[data-theme="dark"] .quote-display blockquote { color: var(--text) !important; }

/* Manual controls */
[data-theme="dark"] .manual-controls { color: var(--text) !important; }

/* Field row */
[data-theme="dark"] .field-row { color: var(--text) !important; }
[data-theme="dark"] .field-row input { background: var(--bg-elevated) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .field-row button { background: var(--bg-elevated) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .field-row button:hover { background: var(--accent) !important; color: var(--bg-elevated) !important; }

/* Hover grid */
[data-theme="dark"] .block-hover-grid { color: var(--text) !important; }
[data-theme="dark"] .block-hover-item { color: var(--text) !important; }
[data-theme="dark"] .block-hover-item:hover { background: var(--bg-sidebar) !important; }

/* Pressed states */
[data-theme="dark"] .pressed-demo { color: var(--text) !important; }

/* Cursor track */
[data-theme="dark"] .cursor-track-demo { color: var(--text) !important; }

/* Continuous */
[data-theme="dark"] .continuous-demo { color: var(--text) !important; }

/* Overlay */
[data-theme="dark"] .overlay-demo { color: var(--text) !important; }

/* Scroll link */
[data-theme="dark"] .scroll-link-demo { color: var(--text) !important; }

/* 3D */
[data-theme="dark"] .demo-3d { color: var(--text) !important; }

}

html, body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 14px/1.6 var(--font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Topbar ─────────────────────────────── */
.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border-subtle);
  height: 56px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.topbar-inner {
  max-width: 1400px; margin: 0 auto; padding: 0 32px;
  height: 100%; display: flex; align-items: center; justify-content: space-between;
}
.sidebar-toggle {
  display: none;
  width: 36px; height: 36px; border: none; background: transparent;
  color: var(--text); border-radius: var(--radius-sm); cursor: pointer;
  align-items: center; justify-content: center; padding: 0;
}
.sidebar-toggle:hover { background: var(--bg-sidebar); }
.sidebar-toggle svg { display: block; }
.logo { display: flex; align-items: center; }
.logo svg { display: block; }
.topbar-nav { display: flex; align-items: center; gap: 8px; }
.topbar-nav a,
.topbar-nav button {
  color: var(--text-secondary); text-decoration: none;
  font-size: 13px; font-weight: 500; letter-spacing: 0.01em;
  transition: all 0.2s var(--ease);
  border: 0;
  background: transparent;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-family: var(--font);
  cursor: pointer;
}
.topbar-nav a:hover,
.topbar-nav button:hover { color: var(--text); background: var(--bg-sidebar); }

.theme-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: var(--radius-sm);
  transition: all 0.2s var(--ease);
  color: var(--text-secondary);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.theme-toggle:hover { background: var(--bg-sidebar); color: var(--text); }

/* ── Sidebar Overlay (mobile) ───────────── */
.sidebar-overlay {
  display: none;
  position: fixed; inset: 0; z-index: 90;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
}
.layout { display: flex; padding-top: 56px; min-height: 100vh; }

/* ── Sidebar ────────────────────────────── */
.sidebar {
  width: var(--sidebar-width); position: fixed; top: 56px; left: 0; bottom: 0;
  background: var(--bg-sidebar); border-right: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; overflow: hidden;
  z-index: 95;
}
.sidebar-scroll {
  flex: 1; overflow-y: auto; padding: 20px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.sidebar-scroll::-webkit-scrollbar { width: 4px; }
.sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
.sidebar-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.sidebar-category { margin-bottom: 8px; }
.sidebar-category-label {
  font-size: 10px; font-weight: 600; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 8px 20px 6px; font-family: var(--mono);
}
.sidebar-module { margin: 2px 12px; }
.sidebar-module-btn {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 7px 10px; border: none; background: transparent;
  font-size: 13px; font-weight: 500; color: var(--text-secondary);
  border-radius: var(--radius-sm); text-align: left;
  transition: all 0.15s var(--ease); cursor: pointer;
}
.sidebar-module-btn:hover { background: rgba(0,0,0,0.03); color: var(--text); }
.sidebar-module.active .sidebar-module-btn { color: var(--text); font-weight: 600; background: rgba(0,0,0,0.04); }
.sidebar-module-indicator {
  display: block; width: 3px; height: 16px; border-radius: 2px;
  background: transparent; transition: all 0.2s var(--ease);
  flex-shrink: 0;
}
.sidebar-module.active .sidebar-module-indicator {
  background: var(--module-color, var(--accent));
  box-shadow: 0 0 6px var(--module-color, rgba(0,0,0,0.1));
}
.sidebar-module-title { flex: 1; }
.sidebar-triggers { padding: 2px 0 8px 25px; display: flex; flex-direction: column; gap: 1px; }
.sidebar-trigger {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 5px 8px; border: none; background: transparent;
  font-size: 12px; font-weight: 500; color: var(--text-tertiary);
  text-transform: capitalize; text-align: left; border-radius: var(--radius-sm);
  letter-spacing: 0.01em; transition: all 0.15s var(--ease); cursor: pointer;
}
.sidebar-trigger:hover { background: rgba(0,0,0,0.03); color: var(--text-secondary); }
.sidebar-trigger.active { background: rgba(0,0,0,0.05); color: var(--text); font-weight: 600; }
.sidebar-trigger-name { flex: 1; }
.sidebar-trigger-count {
  font-size: 10px; font-weight: 600; color: var(--text-tertiary);
  background: rgba(0,0,0,0.04); padding: 1px 6px; border-radius: 8px;
  font-family: var(--mono);
}
.sidebar-trigger.active .sidebar-trigger-count { color: var(--text-secondary); background: rgba(0,0,0,0.06); }

/* ── Controls ───────────────────────────── */
.controls-section {
  margin: 12px 8px 0; padding: 12px;
  background: var(--bg-elevated); border-radius: var(--radius);
  border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 12px;
}
.controls-header { margin-bottom: 2px; }
.controls-title {
  font-size: 10px; font-weight: 700; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.1em; font-family: var(--mono);
}
.control-group { display: flex; flex-direction: column; gap: 6px; }
.control-label {
  font-size: 11px; font-weight: 600; color: var(--text-secondary);
  letter-spacing: 0.01em;
}
.control-label-sm { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
.control-label-row { display: flex; align-items: center; justify-content: space-between; }
.control-value {
  font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  font-family: var(--mono);
}
.control-hint {
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.4;
}
.select-menu { position: relative; width: 100%; }
.select-trigger {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fcfcfc;
  color: var(--text);
  font: 500 12.5px/1.2 var(--font);
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.select-trigger:hover { border-color: #bdbdbd; }
.select-menu.open .select-trigger { border-color: #9f9f9f; box-shadow: 0 0 0 2px rgba(17,17,17,0.06); }
.select-value { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.select-caret { color: #7a7a7a; font-size: 12px; line-height: 1; }
.select-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 90;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.12);
  padding: 6px;
  max-height: 240px;
  overflow: auto;
}
.select-search-wrap {
  position: sticky;
  top: -6px;
  z-index: 1;
  padding: 0 0 6px;
  background: #fff;
}
.select-search {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f7f7f7;
  color: var(--text);
  font: 500 12.5px/1 var(--font);
}
.select-search:focus {
  outline: none;
  border-color: #9f9f9f;
  box-shadow: 0 0 0 2px rgba(17,17,17,0.06);
}
.select-option {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 7px;
  text-align: left;
  padding: 8px 9px;
  color: #252525;
  font: 500 12.5px/1.25 var(--font);
  cursor: pointer;
}
.select-option:hover { background: #f1f1f1; }
.select-option.active { background: #ebebeb; color: #111; font-weight: 600; }
.select-empty {
  padding: 12px 9px;
  color: var(--text-tertiary);
  font: 500 12px/1.4 var(--font);
  text-align: center;
}
.control-slider {
  width: 100%; height: 4px; -webkit-appearance: none; appearance: none;
  background: var(--border); border-radius: 2px; outline: none; cursor: pointer;
  transition: background 0.15s var(--ease);
}
.control-slider:hover { background: var(--text-tertiary); }
.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: var(--accent); border: 2px solid var(--bg-elevated); cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.15s var(--ease);
}
.control-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.control-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg-elevated); cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }


/* ── Main ───────────────────────────────── */
.main { margin-left: var(--sidebar-width); flex: 1; min-width: 0; padding: 40px 40px 80px; background: var(--bg); }
.main-header { margin: 0 auto 28px; max-width: 1200px; }
.main-header h1 { margin: 0; font-size: clamp(36px, 3.6vw, 48px); font-weight: 700; letter-spacing: -0.04em; line-height: 1.1; }
.badge {
  display: inline-flex; align-items: center; font-size: 11px; font-weight: 600;
  text-transform: capitalize; color: var(--text-secondary); background: var(--bg-elevated);
  border: 1px solid var(--border); padding: 3px 10px; border-radius: 100px;
  vertical-align: middle; letter-spacing: 0.01em; margin-left: 10px; font-family: var(--mono);
}
.main-desc { margin: 10px 0 0; font-size: 14.5px; color: var(--text-secondary); line-height: 1.65; max-width: 760px; }
.main-content { max-width: 1200px; margin: 0 auto; }
.capability-panel {
  max-width: 1200px;
  margin: 0 auto 24px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
}
.capability-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: var(--text-tertiary);
  font: 700 10px/1 var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.capability-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.capability-chips span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  background: var(--bg-sidebar);
  color: var(--text-secondary);
  font: 600 11px/1 var(--mono);
}
.capability-panel p {
  max-width: 360px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.5;
  text-align: right;
}

/* ── Docs ───────────────────────────────── */
.docs-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.docs-hero,
.docs-section {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  padding: clamp(28px, 3vw, 40px);
}
.docs-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  position: relative;
  overflow: hidden;
}
.docs-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%);
  pointer-events: none;
}
.docs-hero-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.docs-kicker {
  color: var(--text-tertiary);
  font: 600 11px/1 var(--mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.docs-hero h2 {
  max-width: 520px;
  margin: 0;
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.docs-hero-subtitle {
  max-width: 480px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.65;
}
.docs-hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.docs-hero-btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font: 500 13px/1 var(--font);
  text-decoration: none;
  transition: all 0.2s var(--ease);
}
.docs-hero-btn:hover {
  border-color: var(--border);
  background: var(--bg-sidebar);
  color: var(--text);
}
.docs-hero-btn-primary {
  background: var(--accent);
  color: var(--bg-elevated);
  border-color: var(--accent);
}
.docs-hero-btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: var(--bg-elevated);
}
.docs-hero-preview {
  min-width: 0;
}
.docs-hero-preview .doc-code {
  margin: 0;
}
.docs-code {
  max-width: 920px;
  border-radius: 12px;
}
.docs-section {
  display: grid;
  gap: 28px;
}
.docs-section-head {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 14px;
  row-gap: 4px;
  align-items: baseline;
}
.docs-section-head span {
  grid-row: span 2;
  color: var(--text-tertiary);
  font: 700 11px/1 var(--mono);
}
.docs-section-head h3 {
  margin: 0;
  font-size: clamp(24px, 2.4vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.04em;
}
.docs-section-head p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.55;
}
.docs-principle-grid,
.docs-module-grid,
.docs-trigger-grid,
.docs-practice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.docs-principle-grid article,
.docs-module-card,
.docs-trigger-grid article,
.docs-practice-grid article {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  background: var(--bg);
  padding: 20px;
  transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
}
.docs-principle-grid article:hover,
.docs-module-card:hover,
.docs-trigger-grid article:hover,
.docs-practice-grid article:hover {
  border-color: var(--border);
  box-shadow: var(--shadow);
}
.docs-principle-grid strong,
.docs-module-card h4,
.docs-trigger-grid h4,
.docs-practice-grid strong {
  margin: 0;
  color: var(--text);
  font-size: 15px;
  letter-spacing: -0.02em;
}
.docs-principle-grid p,
.docs-module-card p,
.docs-trigger-grid p,
.docs-practice-grid p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}
.docs-module-card {
  display: grid;
  gap: 12px;
}
.docs-module-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.docs-module-card code {
  padding: 3px 7px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font: 700 10px/1.2 var(--mono);
}
.docs-module-card small,
.docs-trigger-grid small,
.docs-preset-group small {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}
.docs-module-card > strong {
  color: var(--text);
  font: 700 12px/1 var(--mono);
}
.docs-trigger-grid h4 {
  text-transform: capitalize;
}
.docs-animation-groups {
  display: grid;
  gap: 14px;
}
.docs-animation-module {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  background: var(--bg);
  padding: 20px;
}
.docs-animation-module h4 {
  margin: 0 0 14px;
  font-size: 18px;
  letter-spacing: -0.03em;
}
.docs-preset-groups {
  display: grid;
  gap: 12px;
}
.docs-preset-group {
  display: grid;
  grid-template-columns: minmax(160px, 240px) 1fr;
  gap: 14px;
  align-items: start;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
}
.docs-preset-group strong {
  display: block;
  margin-bottom: 4px;
}
.docs-preset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.docs-preset-pills span {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font: 600 11px/1 var(--mono);
}

/* ── Section ────────────────────────────── */
.section { margin-top: 32px; display: flex; flex-direction: column; gap: 20px; }
.real-demo {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 32px 28px;
  text-align: center;
}
.demo-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
  max-width: 520px;
  line-height: 1.5;
  font-weight: 500;
}
.demo-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--mono);
  letter-spacing: 0.01em;
}

/* ── Code ───────────────────────────────── */
.code-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.view-code-btn {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-sidebar);
  color: var(--text-secondary);
  font: 500 12px/1.2 var(--font);
  padding: 7px 14px;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.view-code-btn:hover {
  color: var(--text);
  background: var(--bg);
  border-color: var(--border-subtle);
}
.code {
  width: 100%;
  margin: 0; padding: 18px 22px; background: #0f0f0f; border-radius: var(--radius);
  color: #a3a3a3; font: 12.5px/1.7 var(--mono); white-space: pre; overflow-x: auto;
  border: 1px solid rgba(255,255,255,0.05); letter-spacing: -0.01em;
  text-align: left;
}
.code-tag { color: #7dd3fc; }
.code-string { color: #fbbf24; }

/* ── Preview Card ───────────────────────── */
.preview-card {
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  background: var(--bg-elevated); box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s var(--ease), border-color 0.3s var(--ease), transform 0.3s var(--ease);
  display: flex; flex-direction: column;
  width: 100%;
  overflow: hidden;
}
.preview-card:hover { box-shadow: var(--shadow-lg); border-color: var(--border); transform: translateY(-1px); }
.preview-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: var(--bg-sidebar); border-bottom: 1px solid var(--border-subtle);
}
.traffic-lights { display: flex; gap: 8px; align-items: center; }
.dot { width: 10px; height: 10px; border-radius: 50%; opacity: 0.9; position: relative; }
.dot::after {
  content: ''; position: absolute; top: 2px; left: 3px; width: 4px; height: 3px;
  background: rgba(255,255,255,0.4); border-radius: 50%;
}
.dot-red { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green { background: #28c840; }
.preview-actions { display: flex; gap: 8px; }
.window-action-btn {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  height: 28px;
  min-width: 28px;
  padding: 0 10px;
  font: 500 11px/1 var(--font);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.window-action-btn:hover { background: var(--bg-sidebar); color: var(--text); }
.view-code-header-btn { min-width: 92px; }
.window-icon-btn { font-size: 14px; padding: 0; width: 32px; }
.replay-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
  font-size: 12px; font-weight: 500; border: 1px solid var(--border);
  background: var(--bg-sidebar); color: var(--text-secondary); border-radius: var(--radius-sm);
  transition: all 0.15s var(--ease); cursor: pointer;
}
.replay-btn:hover { background: var(--bg); color: var(--text); }
.replay-btn:hover { background: #efefef; color: var(--text); }
.replay-btn:active { transform: scale(0.97); }

.preview-toolbar {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 10px 16px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-subtle);
}
.preview-toolbar .field-row { gap: 8px; width: auto; }

.preview-body {
  flex: 1 1 auto;
  height: var(--preview-stage-height);
  max-height: var(--preview-stage-height);
  min-height: var(--preview-stage-height);
  overflow-y: auto;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
}
.preview-body::-webkit-scrollbar {
  width: 8px;
}
.preview-body::-webkit-scrollbar-track {
  background: transparent;
}
.preview-body::-webkit-scrollbar-thumb {
  background: #cfcfcf;
  border-radius: 999px;
}
.preview-body {
  scrollbar-color: #cfcfcf transparent;
  scrollbar-width: thin;
}
.preview-body.preview-open .code-wrap { display: none; }
.preview-body.code-open > :not(.code-wrap):not(:has(.code-wrap)) { display: none !important; }
.preview-body.code-open .real-demo,
.preview-body.code-open .demo-stage,
.preview-body.code-open .list-demo {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-height: 100%;
  padding: 0;
}
.preview-body.code-open .real-demo > :not(.code-wrap),
.preview-body.code-open .demo-stage > :not(.code-wrap),
.preview-body.code-open .list-demo > :not(.code-wrap) { display: none !important; }
.preview-body.code-open .code-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 16px;
}
.preview-body.code-open .code {
  flex: 1;
  min-height: 0;
  margin: 0;
}

/* ── Demo Stage ─────────────────────────── */
.demo-stage {
  width: 100%;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 48px 40px;
  text-align: center;
}

/* ── Search Demo ────────────────────────── */
.search-real-ui {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  overflow: hidden;
}
.search-real-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-tertiary);
}
.search-real-header input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text);
  font: 500 15px/1 var(--font);
  outline: none;
}
.search-real-header input::placeholder { color: var(--text-tertiary); }
.search-commit-btn {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 7px 12px;
  font: 600 12px/1 var(--font);
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.search-commit-btn:hover {
  background: var(--accent);
  color: var(--bg-elevated);
  border-color: var(--accent);
}
.search-real-results { padding: 8px; }
.search-real-result-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: var(--radius-sm);
  transition: background 0.15s var(--ease);
}
.search-real-result-item:hover { background: var(--bg-sidebar); }
.search-real-result-thumb {
  width: 40px; height: 40px; border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #e8e8e8, #d0d0d0);
  flex-shrink: 0;
}
.search-real-result-body { flex: 1; min-width: 0; text-align: left; }
.search-real-result-body h4,
.search-result-title {
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text);
}
.change-demo-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border-subtle);
}
.ghost-button {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 9px 14px;
  font: 600 13px/1 var(--font);
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.ghost-button:hover {
  background: var(--bg-sidebar);
  color: var(--text);
}
.search-real-result-body p {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}
.search-field {
  width: 100%;
  max-width: 420px;
  display: flex;
  gap: 10px;
}
.search-field input {
  flex: 1;
  padding: 12px 18px;
  font-size: 15px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
  font-family: var(--font);
  transition: all 0.15s var(--ease);
}
.search-field input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(23,23,23,0.06);
}
.random-btn {
  padding: 12px 18px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
  cursor: pointer;
  font-family: var(--font);
  white-space: nowrap;
  transition: all 0.12s var(--ease);
}
.random-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.random-btn:active {
  transform: scale(0.96);
}
.search-result-display {
  width: 100%;
  height: clamp(112px, 16vw, 164px);
  min-height: clamp(112px, 16vw, 164px);
  display: grid;
  place-items: center;
  overflow: visible;
}
.search-result-display h2 {
  font-size: clamp(28px, 3.2vw, 44px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.12;
  color: var(--text);
  margin: 0;
}

/* ── Nav Links Demo ─────────────────────── */
.app-header-demo {
  width: 100%;
  max-width: 640px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 24px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.app-header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16px;
  color: var(--text);
}
.app-header-logo-icon {
  width: 28px; height: 28px; border-radius: 7px;
  background: linear-gradient(135deg, #171717, #404040);
}
.app-header-cta {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--bg-elevated);
  font: 600 13px/1 var(--font);
  cursor: pointer;
  transition: all 0.15s var(--ease);
  white-space: nowrap;
}
.app-header-cta:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}
.nav-links-demo {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
}
.nav-link-item {
  all: unset;
  cursor: pointer;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: all 0.15s var(--ease);
}
.nav-link-item:hover {
  background: var(--bg-sidebar);
  color: var(--text);
}

/* ── Landing Hero Demo ──────────────────── */
.landing-hero-demo {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding: 32px;
}
.landing-eyebrow {
  font: 600 11px/1 var(--mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
}
.landing-headline {
  margin: 0;
  font-size: clamp(28px, 3.6vw, 40px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  cursor: pointer;
  color: var(--text);
}
.landing-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 400px;
}
.landing-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.landing-btn {
  padding: 10px 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font: 600 14px/1 var(--font);
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.landing-btn:hover {
  border-color: var(--border);
  background: var(--bg-sidebar);
  color: var(--text);
}
.landing-btn-primary {
  background: var(--accent);
  color: var(--bg-elevated);
  border-color: var(--accent);
}
.landing-btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: var(--bg-elevated);
}

/* ── Testimonial Demo ───────────────────── */
.testimonial-demo {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
  padding: 24px;
}
.testimonial-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #d0d0d0, #a0a0a0);
  flex-shrink: 0;
}
.testimonial-author {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.testimonial-author strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.testimonial-author span {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ── Page Load Demo ─────────────────────── */
.page-load-demo {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.page-load-controls {
  display: flex;
  justify-content: center;
}
.page-load-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
}
.page-load-content h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.page-load-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 360px;
}
.page-load-stats {
  display: flex;
  gap: 32px;
  margin-top: 8px;
}
.page-load-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.page-load-stat strong {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}
.page-load-stat span {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

/* ── CTA Button ─────────────────────────── */
.cta-button {
  all: unset;
  cursor: pointer;
  padding: 16px 40px;
  font-size: 18px;
  font-weight: 600;
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius);
  letter-spacing: -0.01em;
  transition: opacity 0.15s var(--ease);
}
.cta-button:hover { opacity: 0.9; }
.cta-button:active { transform: scale(0.98); }

/* ── Scroll Demos ───────────────────────── */
.scroll-demo {
  min-height: auto !important;
  padding: 0 !important;
  gap: 0 !important;
  align-items: stretch;
  position: relative;
  width: 100%;
}
.scroll-entry-screen {
  width: 100%;
  min-height: var(--preview-stage-height);
  height: var(--preview-stage-height);
  display: grid;
  place-items: center;
}
.scroll-intro {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
  border: none;
  padding: 0;
  border-radius: 0;
  background: transparent;
  text-transform: none;
}
.scroll-hfeed {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 500px;
  align-items: center;
  align-self: center;
  margin-inline: auto;
}
.scroll-reveal-item {
  min-height: var(--preview-stage-height);
  height: var(--preview-stage-height);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}
.scroll-reveal-item h2 {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
  margin: 0;
}

/* ── Quote Demo ─────────────────────────── */
.quote-display {
  max-width: 480px;
}
.quote-display blockquote {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

/* ── Manual Controls ────────────────────── */
.manual-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}
.manual-target {
  font-size: clamp(24px, 2.5vw, 36px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--text);
}

/* ── Buttons ────────────────────────────── */
button {
  cursor: pointer; padding: 7px 16px; font-size: 13px; font-weight: 500;
  border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text);
  border-radius: var(--radius-sm); transition: all 0.15s var(--ease); font-family: var(--font);
}
button:hover { background: var(--bg-sidebar); border-color: #d0cec8; }
button:active { transform: scale(0.97); background: #eeece6; }
button:disabled { cursor: not-allowed; opacity: 0.35; }
button:disabled:hover { background: var(--bg-elevated); border-color: var(--border); transform: none; }
.fire-button { background: var(--accent); color: var(--bg-elevated); border-color: var(--accent); border-radius: var(--radius-sm); padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s var(--ease); border: 1px solid var(--accent); }
.fire-button:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.fire-button:active { transform: scale(0.97); }
.demo-fire-btn { min-width: 180px; }

/* ── Blog Card Demo ─────────────────────── */
.blog-card-demo {
  width: 100%;
  max-width: 440px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  overflow: hidden;
}
.blog-card-image {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #e0e0e0, #c8c8c8);
}
.blog-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.blog-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.blog-card-tag {
  font: 600 11px/1 var(--mono);
  color: var(--accent);
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
}
.blog-card-date {
  font-size: 12px;
  color: var(--text-tertiary);
}
.blog-card-body h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
}
.blog-card-body p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.blog-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
}
.blog-card-author {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.blog-card-author-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c8c8c8, #a0a0a0);
}
.blog-card-read {
  border: none;
  background: transparent;
  color: var(--accent);
  font: 600 13px/1 var(--font);
  cursor: pointer;
  padding: 0;
}
.blog-card-read:hover {
  text-decoration: underline;
}

/* ── Paragraph Display ──────────────────── */
.paragraph-display {
  width: 100%;
  max-width: 520px;
  text-align: left;
}
.paragraph-display article h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--text);
}
.paragraph-display article p {
  font-size: 15px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0;
}

/* ── Story Scroll ───────────────────────── */
.story-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 520px;
  text-align: center;
  align-items: center;
  align-self: center;
  margin-inline: auto;
}
.story-paragraph {
  min-height: var(--preview-stage-height);
  height: var(--preview-stage-height);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.story-paragraph p {
  max-width: 760px;
  font-size: 17px;
  line-height: 1.7;
  color: var(--text);
  margin: 0;
  text-align: center;
}

/* ── Paragraph Hover Demo ────────────────── */
.paragraph-hover-demo {
  width: 100%;
  max-width: 460px;
  margin: 0;
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--text);
  cursor: default;
  text-align: left;
}

/* ── Read More ──────────────────────────── */
.readmore-card {
  width: 100%;
  max-width: 460px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s var(--ease);
}
.readmore-card:hover { background: var(--bg); }
.readmore-card p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
}

/* ── Slide Deck ─────────────────────────── */
.slide-deck {
  width: 100%;
  max-width: 500px;
  min-height: 200px;
}
.slide-deck > div {
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  text-align: left;
}
.slide-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-family: var(--mono);
}
.slide-deck h3 {
  margin: 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}
.slide-deck p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ── List Demo ──────────────────────────── */
.list-demo {
  width: 100%;
  padding: 24px;
}
.list-demo-stagger,
.list-demo-reorder,
.list-demo-presence,
.list-demo-cascade,
.list-demo-slideLeft,
.list-demo-slideRight,
.list-demo-flip,
.list-demo-bounce,
.list-demo-pop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.list-demo-stagger > div,
.list-demo-reorder > div,
.list-demo-presence > div,
.list-demo-cascade > div,
.list-demo-slideLeft > div,
.list-demo-slideRight > div,
.list-demo-flip > div,
.list-demo-bounce > div,
.list-demo-pop > div {
  width: min(100%, 680px);
}
.list-demo-stagger > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.list-demo-cascade > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.list-demo-reorder > div,
.list-demo-presence > div,
.list-demo-flip > div,
.list-demo-pop > div {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.list-demo-slideLeft > div,
.list-demo-slideRight > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.list-demo-bounce > div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 14px;
  color: var(--text);
  gap: 12px;
}
.list-row:last-child { border-bottom: none; }
.list-feature-card {
  min-height: 132px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
}
.list-feature-card:hover {
  border-color: var(--border-subtle);
  box-shadow: var(--shadow-sm);
}
.list-feature-card span {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--bg-sidebar);
  color: var(--text-secondary);
  font: 600 11px/1 var(--mono);
}
.list-feature-card strong,
.list-dashboard-row strong,
.list-notification-row strong {
  color: var(--text);
  font-size: 15px;
  letter-spacing: -0.02em;
}
.list-feature-card p,
.list-dashboard-row p,
.list-notification-row p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}
.list-dashboard-row,
.list-notification-row {
  min-height: 72px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  text-align: left;
  transition: border-color 0.15s var(--ease);
}
.list-notification-row:hover {
  border-color: var(--border-subtle);
}
.list-dashboard-row > span:last-child {
  color: var(--text-secondary);
  font: 600 12px/1 var(--mono);
}
.list-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #bbb;
}
.tone-green { background-color: #b8f4cc; }
.tone-blue { background-color: #cce7ff; }
.tone-amber { background-color: #ffe1a7; }
.tone-pink { background-color: #ffd1dc; }
.tone-violet { background-color: #e0d5ff; }
.list-status-dot.tone-green { background: #31c66d; }
.list-status-dot.tone-blue { background: #4aa3ff; }
.list-status-dot.tone-amber { background: #e8a300; }
.list-status-dot.tone-pink { background: #f06f93; }
.list-status-dot.tone-violet { background: #8d75ff; }
.list-tag-pill {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  font-weight: 650;
  letter-spacing: -0.02em;
}
.list-nav-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  text-align: left;
  transition: box-shadow 0.15s ease;
}
.list-nav-row.side-left { justify-content: flex-start; }
.list-nav-row.side-right { justify-content: flex-end; }
.list-nav-row strong {
  color: var(--text);
  font-size: 14px;
  letter-spacing: -0.01em;
}
.nav-icon {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.nav-meta {
  color: var(--text-tertiary);
  font: 600 11px/1 var(--mono);
  margin-left: auto;
}
.list-nav-row.side-right .nav-meta { margin-left: 0; margin-right: auto; }
.list-flip-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  text-align: left;
  transform-style: preserve-3d;
}
.list-flip-card strong {
  color: var(--text);
  font-size: 14px;
  letter-spacing: -0.01em;
}
.list-flip-card p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.4;
}
.flip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.flip-meta {
  color: var(--text-tertiary);
  font: 600 11px/1 var(--mono);
  margin-left: auto;
}
.list-bounce-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  text-align: left;
}
.list-bounce-item strong {
  color: var(--text);
  font-size: 14px;
  letter-spacing: -0.01em;
}
.bounce-ball {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}
.list-pop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  text-align: left;
}
.list-pop-row strong {
  color: var(--text);
  font-size: 15px;
  letter-spacing: -0.02em;
}
.pop-badge {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(17,17,17,0.06);
  color: var(--text-secondary);
  font: 600 11px/1 var(--mono);
}
.list-scroll-item {
  min-height: var(--preview-stage-height);
  height: var(--preview-stage-height);
  display: grid;
  place-items: center;
  width: 100%;
  padding: 24px;
}
.list-scroll-item > div {
  width: min(100%, 620px);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.list-parallax-demo {
  position: relative;
  background: var(--bg-elevated);
}
.list-parallax-stack {
  position: relative;
  min-height: calc(var(--preview-stage-height) * 3.2);
  width: 100%;
  padding: calc(var(--preview-stage-height) * 0.28) 24px calc(var(--preview-stage-height) * 0.4);
}
.list-parallax-stack > [data-trigr-key] {
  position: sticky;
  top: calc((var(--preview-stage-height) - 240px) / 2);
  width: min(650px, calc(100% - 48px));
  margin-inline: auto;
  display: grid;
  place-items: center;
  transform-origin: center;
}
.list-parallax-stack > [data-trigr-key] + [data-trigr-key] {
  margin-top: -124px;
}
.list-parallax-card {
  width: 100%;
  min-height: 214px;
  padding: 30px 38px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.05);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  text-align: center;
  color: #111;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.list-parallax-card span {
  font: 700 11px/1 var(--mono);
  color: rgba(17,17,17,0.45);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.list-parallax-card strong {
  font-size: clamp(24px, 3vw, 31px);
  letter-spacing: -0.03em;
}
.list-parallax-card p {
  margin: 0;
  max-width: 520px;
  color: rgba(17,17,17,0.7);
  font-size: 15px;
  line-height: 1.45;
}
.list-parallax-card button {
  margin-top: 10px;
  background: #111;
  color: #fff;
  border-color: #111;
}
.list-menu-button {
  width: min(100%, 420px);
  min-height: 54px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  justify-items: start;
  gap: 12px;
  padding: 0 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: left;
  font-weight: 650;
}
.list-remove-btn {
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
  flex-shrink: 0;
}
.list-remove-btn:hover { color: #ef4444; }

/* ── Toolbar ────────────────────────────── */
.toolbar-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-family: var(--mono);
  letter-spacing: 0.01em;
  padding: 3px 10px;
  background: var(--bg-sidebar);
  border-radius: 100px;
}
.field-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.field-row input {
  width: 200px; padding: 8px 12px; font-size: 13px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--text); font-family: var(--font);
  transition: all 0.15s var(--ease);
}
.field-row input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(17,17,17,0.06); }

/* ── Marquee ────────────────────────────── */
.marquee-demo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.marquee-prefix { color: var(--text-tertiary); font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
.marquee-item { display: inline-flex; align-items: center; height: 40px; color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.035em; }

/* ── Mount Demo ─────────────────────────── */
.toast-banner {
  position: fixed;
  top: 72px;
  right: 24px;
  z-index: 1000;
}
.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #1a1a1a;
  color: #fff;
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  font-size: 14px;
}
.toast-dismiss {
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
}
.toast-dismiss:hover { color: #fff; }

/* ── Modal ──────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 0;
  max-width: 420px;
  width: calc(100vw - 48px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.15);
}
.modal-card-inner {
  padding: 32px;
}
.modal-card-inner h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.modal-card-inner p {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Block Demo Card ────────────────────── */
.block-demo-card {
  width: clamp(280px, 50vw, 400px);
  padding: 32px 36px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  text-align: center;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s var(--ease), transform 0.3s var(--ease), border-color 0.3s var(--ease);
}
.block-demo-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); border-color: var(--border); }
.block-card-icon { color: var(--text-tertiary); margin-bottom: 4px; }
.block-demo-card h3 {
  margin: 0;
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text);
}
.block-demo-card p {
  margin: 0;
  max-width: 300px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.block-demo-card button {
  margin-top: 6px;
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-elevated);
  font-weight: 600;
  padding: 10px 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}
.block-demo-card button:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.card-basic { background: #fff8e6; }
.card-pro { background: #e8f4ff; }
.card-features { background: #e8f9ee; }
.card-pricing { background: #ffe8ea; }
.card-faq { background: #f0f0ff; }
.card-welcome { background: #e8f9ee; }

/* ── Block Preview Area ─────────────────── */
.block-preview-area {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Block Scroll ───────────────────────── */
.block-scroll-item {
  min-height: var(--preview-stage-height);
  height: var(--preview-stage-height);
  display: grid;
  place-items: center;
  padding: 24px;
  width: 100%;
  justify-items: center;
}
.block-scroll-item > * {
  justify-self: center;
}
.scroll-demo .block-scroll-item + .block-scroll-item {
  margin-top: 0;
}
.parallax-demo {
  position: relative;
  width: 100%;
  min-height: auto !important;
  padding: 0 !important;
  gap: 0 !important;
  display: block !important;
  background: #fff;
}
.parallax-stack {
  width: 100%;
}
.parallax-demo .trigr-parallax-layer {
  width: 100%;
  display: grid;
  place-items: center;
  padding: 42px 24px;
  transform-origin: center;
}
.parallax-demo .block-demo-card {
  width: min(650px, calc(100% - 48px));
  max-width: 650px;
  min-height: 206px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 36px;
  position: relative;
  isolation: isolate;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  color: #111;
}
.parallax-demo .block-demo-card.card-features {
  background: #b9f5cd;
}
.parallax-demo .block-demo-card.card-pricing {
  background: #ffc8cc;
}
.parallax-demo .block-demo-card.card-basic {
  background: #ffd8a7;
}
.parallax-demo .block-demo-card.card-faq {
  background: #dec8ff;
}
.parallax-demo .block-demo-card h3 {
  font-size: clamp(24px, 3vw, 31px);
  font-weight: 700;
  margin: 0 0 12px;
  letter-spacing: -0.03em;
}
.parallax-demo .block-demo-card p {
  font-size: 16px;
  opacity: 0.74;
  max-width: 520px;
  text-align: center;
  line-height: 1.45;
}
.parallax-demo .block-demo-card button {
  margin-top: 24px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid #000;
  background: #111;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
.parallax-demo .block-demo-card button:hover {
  background: #262626;
}
.parallax-demo .block-card-icon {
  margin-bottom: 16px;
  opacity: 0.6;
}
.parallax-demo .code {
  position: relative;
  z-index: 100;
}
.block-parallax-demo {
  position: relative;
  background: #fff;
}
.block-parallax-element {
  display: grid;
  place-items: center;
}
.block-parallax-visual {
  width: min(680px, calc(100% - 48px));
  min-height: 260px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  background:
    linear-gradient(135deg, rgba(255,200,204,0.9), rgba(184,244,204,0.9)),
    #f7f7f7;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  padding: 34px;
  text-align: center;
  color: #111;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.block-parallax-visual span {
  font: 700 11px/1 var(--mono);
  color: rgba(17,17,17,0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.block-parallax-visual strong {
  font-size: clamp(24px, 3vw, 34px);
  letter-spacing: -0.04em;
}
.block-parallax-visual p {
  margin: 0;
  max-width: 460px;
  color: rgba(17,17,17,0.68);
  line-height: 1.5;
}

/* ── Block Hover Grid ───────────────────── */
.block-hover-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ── Exit / Notification Stack ──────────── */
.exit-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 360px;
}
.exit-controls .select-menu { flex: 1; }
.notif-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 480px;
  text-align: left;
}
.notif-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 18px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  cursor: pointer;
  transition: all 0.15s var(--ease);
  gap: 12px;
}
.notif-card:hover { border-color: var(--border); background: var(--bg); }
.notif-body { flex: 1; }
.notif-body strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}
.notif-body p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.notif-dismiss {
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
  flex-shrink: 0;
}
.notif-dismiss:hover { color: #ef4444; }
.empty-notifs {
  padding: 24px;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* ── Docs API Grid ───────────────────────── */
.docs-api-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.docs-api-grid article {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  background: var(--bg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
}
.docs-api-grid article:hover {
  border-color: var(--border);
  box-shadow: var(--shadow);
}
.docs-api-grid article h4 {
  margin: 0;
  font-size: 15px;
  letter-spacing: -0.02em;
  color: var(--text);
  font-family: var(--mono);
}
.docs-api-grid article p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.docs-api-grid article p code {
  font-size: 12px;
  background: var(--bg-sidebar);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text);
}
.docs-api-grid article .docs-code {
  margin: 0;
  font-size: 11px;
  border-radius: var(--radius-sm);
}
.docs-api-grid .docs-preset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.docs-api-grid .docs-preset-pills span {
  padding: 3px 8px;
  border-radius: 999px;
  background: #f5f5f5;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font: 700 11px/1 var(--mono);
}

/* ── Composed Demos ──────────────────────── */
.control-chip {
  padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-tertiary); font-size: 11px;
  font-weight: 600; cursor: pointer; transition: all 0.15s var(--ease);
  font-family: var(--font);
}
.control-chip:hover { background: var(--bg-elevated); color: var(--text); border-color: var(--text-tertiary); }
.control-chip.active { background: var(--accent); color: var(--bg-elevated); border-color: var(--accent); }
[data-theme="dark"] .control-chip { background: var(--bg); border-color: var(--border); color: var(--text-tertiary); }
[data-theme="dark"] .control-chip:hover { background: var(--bg-elevated); color: var(--text); }
[data-theme="dark"] .control-chip.active { background: var(--accent); color: var(--bg-elevated); border-color: var(--accent); }

/* ── Properties Editor ──────────────────── */
.properties-toggle {
  display: flex; align-items: center; gap: 8px;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-secondary); font-size: 13px; font-weight: 500;
  padding: 0; width: 100%; text-align: left; font-family: var(--font);
}
.properties-toggle:hover { color: var(--text); }
.properties-toggle-icon { font-size: 10px; color: var(--text-tertiary); }
.properties-count {
  margin-left: auto; font-size: 11px; font-weight: 600;
  background: var(--accent); color: var(--bg-elevated); padding: 1px 7px; border-radius: 999px; min-width: 18px; text-align: center;
}
.properties-panel {
  padding: 8px 0; display: flex; flex-direction: column;
}
.property-row {
  flex-wrap: wrap;
}
.property-input {
  padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); font-size: 12px; font-family: var(--mono);
}
.property-input:focus { outline: none; border-color: var(--accent); }
.property-input::placeholder { color: var(--text-tertiary); }

[data-theme="dark"] .property-input { background: var(--bg-elevated); border-color: var(--border); color: var(--text); }
[data-theme="dark"] .property-input::placeholder { color: var(--text-tertiary); }
.demo-actions { display: flex; gap: 10px; margin-bottom: 16px; }
.demo-nav button { font-family: var(--font); }

/* ── Responsive ─────────────────────────── */
@media (max-width: 900px) {
  .sidebar-toggle { display: flex; }
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s var(--ease);
    width: 280px;
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar-overlay { display: block; }
  .main { margin-left: 0; padding: 24px 20px 56px; }
  .main-header h1 { font-size: 28px; }
  .main-desc { font-size: 14px; }
  .preview-body { min-height: 280px; }
  .real-demo { padding: 24px 20px; }
  .field-row input { width: 100%; }
  .docs-hero { grid-template-columns: 1fr; gap: 32px; }
  .docs-hero h2 { max-width: 100%; }
  .docs-hero-subtitle { max-width: 100%; }
  .docs-preset-group { grid-template-columns: 1fr; }
  .docs-section-head { grid-template-columns: 1fr; }
  .docs-section-head span { grid-row: auto; }
  .docs-api-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .topbar-inner { padding: 0 16px; }
  .topbar-nav a,
  .topbar-nav button { font-size: 12px; }
  .main { padding: 20px 16px 48px; }
  .main-header h1 { font-size: 22px; }
  .main-desc { font-size: 13.5px; }
  .docs-hero,
  .docs-section { padding: 18px; }
  .docs-hero h2 { font-size: 30px; }
  .docs-module-card div { align-items: flex-start; flex-direction: column; }
  .code { padding: 12px 14px; font-size: 11px; }
  .preview-header { padding: 8px 14px; }
  .preview-toolbar { padding: 8px 14px; }
  .real-demo { padding: 20px 14px; }
  .field-row { flex-direction: column; align-items: stretch; }
  .field-row button { width: 100%; }
  .block-hover-grid { flex-direction: column; align-items: center; }
  .exit-controls { flex-direction: column; align-items: stretch; }
  .controls-section { padding: 12px; gap: 12px; }
}
`
