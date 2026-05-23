import { useRef, useEffect, useLayoutEffect, createElement, forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react"
import type { MouseEvent } from "react"
import type { AnimationPreset, AnimateTextHandle, AnimateTextProps, AnimationProperties } from "./types"
import { EASE_IN, EASE_OUT, EASE_IN_OUT, SMOOTH, SPRING, presets } from "./animations"
import { useValueChange } from "./useValueChange"

const warned = new Set<string>()
let _measureProbe: HTMLSpanElement | null = null

type TriggerSource = "change" | "scroll" | "hover" | "click" | "manual" | "mount"
type QueuedRun = { id: number; source: TriggerSource }

function getMeasureProbe(): HTMLSpanElement {
  if (!_measureProbe) {
    _measureProbe = document.createElement("span")
    _measureProbe.style.position = "absolute"
    _measureProbe.style.visibility = "hidden"
    _measureProbe.style.pointerEvents = "none"
    _measureProbe.style.whiteSpace = "pre"
    _measureProbe.style.display = "inline-block"
  }
  return _measureProbe
}

function validDuration(value: unknown, fallback = 300): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function colorWithAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`
  return `rgba(0, 0, 0, ${alpha})`
}

function applyInitialState(el: HTMLElement, keyframes: Keyframe[]) {
  const first = keyframes[0]
  if (!first) return
  if ((first as any).opacity !== undefined) el.style.opacity = String((first as any).opacity)
  if ((first as any).transform !== undefined) el.style.transform = String((first as any).transform)
}

function applyFinalState(el: HTMLElement, keyframes: Keyframe[]) {
  const last = keyframes[keyframes.length - 1]
  if (!last) return
  if ((last as any).opacity !== undefined) el.style.opacity = String((last as any).opacity)
  if ((last as any).transform !== undefined) el.style.transform = String((last as any).transform)
}

function runAnimation(
  el: HTMLElement,
  preset: AnimationPreset,
  options: KeyframeAnimationOptions,
  mode: "change" | "single" = "single",
  oldText?: string | number | undefined,
  newText?: string | number | undefined,
  highlightColor?: string,
): Animation {
  const hlRunId = beginAnimationRun(el)
  el.style.willChange = "transform, opacity"

  const def = presets[preset]
  if (!def) {
    if (process.env.NODE_ENV === "development" && !warned.has(preset)) {
      warned.add(preset)
      console.warn(
        `[trigr] Unknown animation preset "${preset}". Expected one of: ${Object.keys(presets).join(", ")}`
      )
    }
    const anim = el.animate([], options)
    anim.addEventListener("finish", () => { el.style.willChange = "auto" })
    anim.addEventListener("cancel", () => { el.style.willChange = "auto" })
    return anim
  }
  const baseFrames = mode === "change"
    ? [...def.out, ...def.in]
    : (def.in.length ? [...def.in] : [...def.out])
  const keyframes = prefersReducedMotion() ? reducedKeyframes(baseFrames) : baseFrames
  applyInitialState(el, keyframes)
  const anim = el.animate(keyframes, { ...options, fill: "forwards" })
  anim.addEventListener("finish", () => {
    applyFinalState(el, keyframes)
    if (isActiveAnimationRun(el, hlRunId)) el.style.willChange = "auto"
  })
  anim.addEventListener("cancel", () => {
    if (isActiveAnimationRun(el, hlRunId)) el.style.willChange = "auto"
  })
  return anim
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

function reducedKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return keyframes.map(({ opacity }) => ({ opacity: opacity ?? 1 }))
}

function runPropertyAnimation(
  el: HTMLElement,
  properties: AnimationProperties | undefined,
  options: KeyframeAnimationOptions,
): Animation | null {
  if (!properties || Object.keys(properties).length === 0) return null
  const from: Keyframe = {}
  const to: Keyframe = {}
  for (const [property, pair] of Object.entries(properties)) {
    from[property as keyof Keyframe] = pair[0] as any
    to[property as keyof Keyframe] = pair[1] as any
  }
  // Apply initial from-styles inline to prevent flash on cancel/restart
  for (const [property, value] of Object.entries(from)) {
    ;(el.style as any)[property] = value
  }
  const anim = el.animate([from, to], { ...options, fill: "forwards" })
  anim.addEventListener("finish", () => {
    for (const [property, pair] of Object.entries(properties)) {
      ;(el.style as any)[property] = String(pair[1])
    }
  })
  return anim
}

function finishWillChange(el: HTMLElement) {
  el.style.willChange = "auto"
}

function cancelElementAnimations(el: HTMLElement) {
  el.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())
}

function beginAnimationRun(el: HTMLElement): string {
  const next = String((Number.parseInt(el.dataset.trigrRunId ?? "0", 10) || 0) + 1)
  el.dataset.trigrRunId = next
  return next
}

function isActiveAnimationRun(el: HTMLElement, runId: string): boolean {
  return el.dataset.trigrRunId === runId
}

function getScrollRoot(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = getComputedStyle(parent)
    if (/(auto|scroll|overlay)/.test(`${style.overflowY}${style.overflow}`) && parent.scrollHeight > parent.clientHeight) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

function scrollObserverOptions(el: HTMLElement, threshold: number): IntersectionObserverInit {
  const root = getScrollRoot(el)
  const rootHeight = root?.clientHeight ?? window.innerHeight
  const clamped = Math.min(0.95, Math.max(0.05, threshold))
  const inset = Math.round(rootHeight * Math.min(0.48, clamped / 2))
  return {
    root,
    rootMargin: `-${inset}px 0px -${inset}px 0px`,
    threshold: 0,
  }
}

function resolveInlineJustify(textAlign: string): "flex-start" | "center" | "flex-end" {
  if (textAlign === "center") return "center"
  if (textAlign === "right" || textAlign === "end") return "flex-end"
  return "flex-start"
}

function measureInlineText(el: HTMLElement, text: string): { width: number; height: number } {
  const probe = getMeasureProbe()
  probe.textContent = text || "\u00A0"
  probe.style.whiteSpace = getComputedStyle(el).whiteSpace === "normal" ? "pre" : getComputedStyle(el).whiteSpace
  el.appendChild(probe)
  const rect = probe.getBoundingClientRect()
  probe.remove()
  return { width: rect.width, height: rect.height }
}

function prepareStableTextSwap(el: HTMLElement, oldText: string, newText: string, runId?: string) {
  const computed = getComputedStyle(el)
  const oldSize = measureInlineText(el, oldText)
  const newSize = measureInlineText(el, newText)
  const width = Math.max(oldSize.width, newSize.width, el.getBoundingClientRect().width)
  const height = Math.max(oldSize.height, newSize.height, el.getBoundingClientRect().height)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const previous = {
    position: el.style.position,
    overflow: el.style.overflow,
    display: el.style.display,
    width: el.style.width,
    minWidth: el.style.minWidth,
    height: el.style.height,
    verticalAlign: el.style.verticalAlign,
    willChange: el.style.willChange,
  }

  el.style.position = "relative"
  el.style.overflow = "hidden"
  el.style.display = "inline-block"
  el.style.verticalAlign = previous.verticalAlign || "baseline"
  el.style.width = `${width}px`
  el.style.minWidth = `${width}px`
  if (height > 0) el.style.height = `${height}px`
  el.innerHTML = ""

  const oldEl = document.createElement("span")
  oldEl.textContent = oldText
  oldEl.style.display = "flex"
  oldEl.style.alignItems = "center"
  oldEl.style.justifyContent = justifyContent
  oldEl.style.whiteSpace = "pre"
  oldEl.style.position = "absolute"
  oldEl.style.left = "0"
  oldEl.style.top = "0"
  oldEl.style.width = "100%"
  oldEl.style.height = "100%"
  oldEl.style.lineHeight = computed.lineHeight

  const newEl = document.createElement("span")
  newEl.textContent = newText
  newEl.style.display = "flex"
  newEl.style.alignItems = "center"
  newEl.style.justifyContent = justifyContent
  newEl.style.whiteSpace = "pre"
  newEl.style.position = "absolute"
  newEl.style.left = "0"
  newEl.style.top = "0"
  newEl.style.width = "100%"
  newEl.style.height = "100%"
  newEl.style.lineHeight = computed.lineHeight

  el.appendChild(oldEl)
  el.appendChild(newEl)

  function cleanup() {
    if (runId && !isActiveAnimationRun(el, runId)) return
    el.textContent = newText
    Object.assign(el.style, previous)
  }

  return { oldEl, newEl, cleanup }
}

function reserveStableTextSize(el: HTMLElement, oldText: string, newText: string) {
  const oldSize = measureInlineText(el, oldText)
  const newSize = measureInlineText(el, newText)
  const currentWidth = el.getBoundingClientRect().width
  const storedWidth = Number.parseFloat(el.dataset.trigrStableWidth ?? "0")
  const width = Math.ceil(Math.max(oldSize.width, newSize.width, currentWidth, storedWidth))
  if (width > 0) {
    el.dataset.trigrStableWidth = String(width)
    el.style.minWidth = `${width}px`
    el.style.overflow = "visible"
    if (getComputedStyle(el).display === "inline") el.style.display = "inline-block"
  }
}

function stableTextStageSize(el: HTMLElement, text: string, sideEm = 0.8, verticalEm = 0.9) {
  const computed = getComputedStyle(el)
  const fontSize = Number.parseFloat(computed.fontSize) || 16
  const currentRect = el.getBoundingClientRect()
  const measured = measureInlineText(el, text)
  const sideSafe = Math.ceil(fontSize * sideEm)
  const verticalSafe = Math.ceil(fontSize * verticalEm)
  const previousMinWidth = Number.parseFloat(el.style.minWidth || "0")
  const width = Math.ceil(Math.max(currentRect.width, measured.width, previousMinWidth)) + sideSafe * 2
  const height = Math.ceil(Math.max(currentRect.height, measured.height)) + verticalSafe * 2
  const innerHeight = Math.max(measured.height, currentRect.height, fontSize)
  return { width, height, sideSafe, verticalSafe, innerHeight }
}

function splitGraphemes(text: string) {
  type SegmenterCtor = new (locale: string, options: { granularity: "grapheme" }) => {
    segment: (value: string) => Iterable<{ segment: string }>
  }
  const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterCtor }).Segmenter
  if (Segmenter) {
    const segmenter = new Segmenter("en", { granularity: "grapheme" })
    return Array.from(segmenter.segment(text), ({ segment }) => segment)
  }
  return Array.from(text)
}

function restoreSplitRevealState(el: HTMLElement) {
  const previous = el.dataset.trigrSplitRevealPrevious
  if (!previous) return
  try {
    Object.assign(el.style, JSON.parse(previous))
  } catch {
    el.style.color = ""
    el.style.textShadow = ""
    el.style.overflow = ""
  }
  delete el.dataset.trigrSplitRevealPrevious
}

function textFromNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join("")
  if (typeof node === "object" && "props" in node) {
    const props = (node as React.ReactElement<{ children?: React.ReactNode }>).props
    return textFromNode(props.children)
  }
  return ""
}

function appendRollingCharSlots(el: HTMLElement, text: string, slotHeightEm = 1.35): HTMLElement[] {
  const inners: HTMLElement[] = []
  el.textContent = ""
  const fragment = document.createDocumentFragment()
  const chars = splitGraphemes(text)
  for (const char of chars) {
    if (char === " ") {
      fragment.appendChild(document.createTextNode(" "))
    } else {
      const outer = document.createElement("span")
      outer.style.display = "inline-flex"
      outer.style.alignItems = "flex-start"
      outer.style.overflow = "hidden"
      outer.style.height = `${slotHeightEm}em`
      outer.style.lineHeight = `${slotHeightEm}`
      outer.style.verticalAlign = "baseline"
      const inner = document.createElement("span")
      inner.textContent = char
      inner.style.display = "block"
      inner.style.lineHeight = "1.35"
      inner.style.willChange = "transform, opacity"
      outer.appendChild(inner)
      fragment.appendChild(outer)
      inners.push(inner)
    }
  }
  el.appendChild(fragment)
  return inners
}

function appendCharSpans(
  el: HTMLElement,
  text: string,
  initStyle?: (span: HTMLElement, char: string, index: number) => void,
): HTMLElement[] {
  const spans: HTMLElement[] = []
  el.textContent = ""
  const fragment = document.createDocumentFragment()
  const chars = splitGraphemes(text)
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char === " ") {
      fragment.appendChild(document.createTextNode(" "))
    } else {
      const span = document.createElement("span")
      span.textContent = char
      span.style.display = "inline-block"
      initStyle?.(span, char, i)
      fragment.appendChild(span)
      spans.push(span)
    }
  }
  el.appendChild(fragment)
  return spans
}

function animateSplitReveal(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  restoreSplitRevealState(el)
  el.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())

  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return

  const runId = beginAnimationRun(el)

  const reduced = prefersReducedMotion()
  if (reduced) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: SPRING, fill: "forwards" },
    )
    anim.onfinish = () => {
      if (!isActiveAnimationRun(el, runId)) return
      onAnimationEnd?.()
    }
    anim.oncancel = () => {}
    return anim
  }

  const computed = getComputedStyle(el)
  const visibleColor = computed.color || "#111"
  const fontSize = Number.parseFloat(computed.fontSize) || 16
  const lineHeight = Number.parseFloat(computed.lineHeight) || fontSize * 1.2 || 64
  const halfShift = lineHeight / 2
  const textSize = measureInlineText(el, text)
  const lineW = Math.ceil(textSize.width * 0.75)
  const lineH = Math.max(3, Math.round(fontSize * 0.08))

  const previous = {
    position: el.style.position,
    display: el.style.display,
    overflow: el.style.overflow,
    color: el.style.color,
    textShadow: el.style.textShadow,
    minWidth: el.style.minWidth,
    willChange: el.style.willChange,
  }
  el.dataset.trigrSplitRevealPrevious = JSON.stringify(previous)

  el.style.position = "relative"
  el.style.display = "inline-block"
  el.style.overflow = "hidden"
  el.style.color = "transparent"
  el.style.textShadow = `0 0 0 ${visibleColor}`
  el.style.minWidth = `${Math.ceil(el.getBoundingClientRect().width)}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const shadow = document.createElement("span")
  shadow.textContent = text
  shadow.style.visibility = "hidden"
  shadow.style.display = "block"

  const line = document.createElement("span")
  Object.assign(line.style, {
    position: "absolute",
    width: `${lineW}px`,
    height: `${lineH}px`,
    left: "0",
    top: `${Math.round((lineHeight - lineH) / 2)}px`,
    background: visibleColor,
    borderRadius: "999px",
    pointerEvents: "none",
    willChange: "transform",
  })

  function makeHalf(placement: "top" | "bottom") {
    const half = document.createElement("span")
    const inner = document.createElement("span")
    inner.textContent = text
    Object.assign(half.style, {
      position: "absolute",
      left: "0",
      width: "100%",
      height: "50%",
      overflow: "hidden",
      pointerEvents: "none",
      willChange: "transform, opacity",
      top: placement === "top" ? "0" : "",
      bottom: placement === "bottom" ? "0" : "",
    })
    Object.assign(inner.style, {
      display: "block",
      color: visibleColor,
      willChange: "transform, opacity",
      transform: placement === "top" ? `translateY(${halfShift}px)` : `translateY(${-halfShift}px)`,
    })
    half.appendChild(inner)
    return { half, inner }
  }

  const top = makeHalf("top")
  const bottom = makeHalf("bottom")
  el.append(shadow, line, top.half, bottom.half)

  const childAnimations: Animation[] = []

  childAnimations.push(line.animate(
    [{ transform: `translateX(-${lineW}px)` }, { transform: `translateX(${textSize.width}px)` }],
    { duration: duration * 0.58, easing: EASE_IN_OUT, fill: "forwards" },
  ))

  childAnimations.push(top.inner.animate(
    [
      { transform: `translateY(${halfShift}px)` },
      { transform: "translateY(0)" },
    ],
    { duration: duration * 0.42, delay: duration * 0.38, easing: EASE_OUT, fill: "forwards" },
  ))

  const anim = bottom.inner.animate(
    [
      { transform: `translateY(${-halfShift}px)` },
      { transform: `translateY(${-halfShift}px)` },
    ],
    { duration: duration * 0.42, delay: duration * 0.38, easing: EASE_OUT, fill: "forwards" },
  )
  childAnimations.push(anim)

  let finished = false

  function cleanup() {
    if (finished) return
    finished = true
    childAnimations.forEach((animation) => {
      if (animation.playState !== "idle") animation.cancel()
    })
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = text
    Object.assign(el.style, previous)
    delete el.dataset.trigrSplitRevealPrevious
  }

  anim.onfinish = () => {
    cleanup()
    onAnimationEnd?.()
  }
  anim.oncancel = cleanup

  return anim
}

function animateSplitSlide(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return

  const runId = beginAnimationRun(el)

  const reduced = prefersReducedMotion()
  if (reduced) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => {
      if (!isActiveAnimationRun(el, runId)) return
      onAnimationEnd?.()
    }
    anim.oncancel = () => {}
    return anim
  }

  const splitAt = Math.ceil(text.length / 2)
  const leftText = text.slice(0, splitAt)
  const rightText = text.slice(splitAt)
  const previous = {
    display: el.style.display,
    overflow: el.style.overflow,
    whiteSpace: el.style.whiteSpace,
    minWidth: el.style.minWidth,
    willChange: el.style.willChange,
  }

  el.style.display = "inline-flex"
  el.style.overflow = "hidden"
  el.style.whiteSpace = "pre"
  el.style.minWidth = `${Math.ceil(el.getBoundingClientRect().width)}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const left = document.createElement("span")
  const right = document.createElement("span")
  left.textContent = leftText
  right.textContent = rightText
  Object.assign(left.style, { display: "inline-block", willChange: "transform, opacity" })
  Object.assign(right.style, { display: "inline-block", willChange: "transform, opacity" })
  el.append(left, right)

  left.animate(
    [
      { opacity: 0, transform: "translateX(-120%)" },
      { opacity: 1, transform: "translateX(0)" },
    ],
    { duration, easing: SPRING, fill: "forwards" },
  )

  const anim = right.animate(
    [
      { opacity: 0, transform: "translateX(120%)" },
      { opacity: 1, transform: "translateX(0)" },
    ],
    { duration, easing: SPRING, fill: "forwards" },
  )

  anim.onfinish = () => {
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = text
    Object.assign(el.style, previous)
    onAnimationEnd?.()
  }
  anim.oncancel = () => {
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = text
    Object.assign(el.style, previous)
  }

  return anim
}

function animateBigBang(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const runId = beginAnimationRun(el)
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  el.style.color = ""
  const computed = getComputedStyle(el)
  const textSize = measureInlineText(el, text)
  const fontSize = Number.parseFloat(computed.fontSize) || 48
  const canvasW = Math.max(180, Math.ceil(textSize.width + fontSize * 1.4))
  const canvasH = Math.max(fontSize * 1.7, Math.ceil(textSize.height + fontSize * 1.2))
  const color = computed.color || "rgb(232, 234, 240)"
  const previous = {
    position: el.style.position,
    display: el.style.display,
    overflow: el.style.overflow,
    color: el.style.color,
    willChange: el.style.willChange,
  }

  el.style.position = "relative"
  el.style.display = "inline-block"
  el.style.overflow = "visible"
  el.style.color = "transparent"
  el.style.willChange = "transform, opacity"

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(canvasW * dpr)
  canvas.height = Math.round(canvasH * dpr)
  canvas.style.position = "absolute"
  canvas.style.left = "50%"
  canvas.style.top = "50%"
  canvas.style.transform = "translate(-50%, -50%)"
  canvas.style.width = `${canvasW}px`
  canvas.style.height = `${canvasH}px`
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = "1"
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    el.textContent = text
    return
  }
  const drawCtx = ctx
  drawCtx.scale(dpr, dpr)
  el.appendChild(canvas)

  const off = document.createElement("canvas")
  off.width = canvasW
  off.height = canvasH
  const octx = off.getContext("2d")
  if (!octx) {
    el.textContent = text
    return
  }
  octx.font = computed.font || `700 ${fontSize}px sans-serif`
  octx.textAlign = "center"
  octx.textBaseline = "middle"
  octx.fillStyle = "#fff"
  octx.fillText(text, canvasW / 2, canvasH / 2)

  const { data } = octx.getImageData(0, 0, canvasW, canvasH)
  const density = Math.max(3, Math.round(fontSize / 18))
  const points: { x: number; y: number }[] = []
  for (let y = 0; y < canvasH; y += density) {
    for (let x = 0; x < canvasW; x += density) {
      if (data[(y * canvasW + x) * 4 + 3] > 128) points.push({ x, y })
    }
  }
  if (points.length === 0) {
    el.textContent = text
    return
  }

  const maxParticles = 900
  const step = Math.max(1, Math.ceil(points.length / maxParticles))
  const sampled = points.filter((_, i) => i % step === 0)
  const cx = canvasW / 2
  const cy = canvasH / 2
  const particles = sampled.map((point) => {
    const angle = Math.random() * Math.PI * 2
    const speed = 6 + Math.random() * 10
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ox: point.x,
      oy: point.y,
    }
  })

  let frameId = 0
  let finished = false
  const total = Math.max(1200, duration)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (finished) return
    finished = true
    cancelAnimationFrame(frameId)
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function frame(now: number) {
    if (finished || !isActiveAnimationRun(el, runId)) return
    const elapsed = now - start
    drawCtx.clearRect(0, 0, canvasW, canvasH)
    particles.forEach((particle) => {
      particle.vx += (particle.ox - particle.x) * 0.045
      particle.vx *= 0.88
      particle.x += particle.vx
      particle.vy += (particle.oy - particle.y) * 0.045
      particle.vy *= 0.88
      particle.y += particle.vy
      const dist = Math.hypot(particle.x - particle.ox, particle.y - particle.oy)
      const alpha = Math.min(0.92, 0.28 + (1 - Math.min(1, dist / 160)) * 0.64)
      drawCtx.globalAlpha = alpha
      drawCtx.fillStyle = color
      drawCtx.beginPath()
      drawCtx.arc(particle.x, particle.y, Math.max(1, density * 0.34), 0, Math.PI * 2)
      drawCtx.fill()
    })
    drawCtx.globalAlpha = 1
    if (!finished && isActiveAnimationRun(el, runId) && elapsed < total) frameId = requestAnimationFrame(frame)
  }

  frame(start)
  anim.onfinish = () => {
    cleanup()
    onAnimationEnd?.()
  }
  anim.oncancel = cleanup
  return anim
}

function animateScatterAssemble(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const runId = beginAnimationRun(el)
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  el.style.color = ""
  const computed = getComputedStyle(el)
  const textSize = measureInlineText(el, text)
  const fontSize = Number.parseFloat(computed.fontSize) || 48
  const canvasW = Math.max(180, Math.ceil(textSize.width + fontSize * 1.4))
  const canvasH = Math.max(fontSize * 1.7, Math.ceil(textSize.height + fontSize * 1.2))
  const color = computed.color || "rgb(232, 234, 240)"
  const previous = {
    position: el.style.position,
    display: el.style.display,
    overflow: el.style.overflow,
    color: el.style.color,
    willChange: el.style.willChange,
  }

  el.style.position = "relative"
  el.style.display = "inline-block"
  el.style.overflow = "visible"
  el.style.color = "transparent"
  el.style.willChange = "transform, opacity"

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(canvasW * dpr)
  canvas.height = Math.round(canvasH * dpr)
  canvas.style.position = "absolute"
  canvas.style.left = "50%"
  canvas.style.top = "50%"
  canvas.style.transform = "translate(-50%, -50%)"
  canvas.style.width = `${canvasW}px`
  canvas.style.height = `${canvasH}px`
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = "1"
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    el.textContent = text
    return
  }
  const drawCtx = ctx
  drawCtx.scale(dpr, dpr)
  el.appendChild(canvas)

  const off = document.createElement("canvas")
  off.width = canvasW
  off.height = canvasH
  const octx = off.getContext("2d")
  if (!octx) {
    el.textContent = text
    return
  }
  octx.font = computed.font || `700 ${fontSize}px sans-serif`
  octx.textAlign = "center"
  octx.textBaseline = "middle"
  octx.fillStyle = "#fff"
  octx.fillText(text, canvasW / 2, canvasH / 2)

  const { data } = octx.getImageData(0, 0, canvasW, canvasH)
  const density = Math.max(3, Math.round(fontSize / 18))
  const points: { x: number; y: number }[] = []
  for (let y = 0; y < canvasH; y += density) {
    for (let x = 0; x < canvasW; x += density) {
      if (data[(y * canvasW + x) * 4 + 3] > 128) points.push({ x, y })
    }
  }
  if (points.length === 0) {
    el.textContent = text
    return
  }

  const maxParticles = 900
  const step = Math.max(1, Math.ceil(points.length / maxParticles))
  const sampled = points.filter((_, i) => i % step === 0)
  const particles = sampled.map((point) => ({
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    vx: 0,
    vy: 0,
    ox: point.x,
    oy: point.y,
    delay: Math.random() * Math.min(160, duration * 0.18),
  }))

  let frameId = 0
  let finished = false
  const total = Math.max(1200, duration)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (finished) return
    finished = true
    cancelAnimationFrame(frameId)
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function frame(now: number) {
    if (finished || !isActiveAnimationRun(el, runId)) return
    const elapsed = now - start
    const progress = Math.min(1, elapsed / total)
    drawCtx.clearRect(0, 0, canvasW, canvasH)
    particles.forEach((particle) => {
      if (elapsed < particle.delay) return
      particle.vx += (particle.ox - particle.x) * 0.055
      particle.vx *= 0.8
      particle.x += particle.vx
      particle.vy += (particle.oy - particle.y) * 0.055
      particle.vy *= 0.8
      particle.y += particle.vy
      const dist = Math.hypot(particle.x - particle.ox, particle.y - particle.oy)
      const settle = 1 - Math.min(1, dist / 180)
      drawCtx.globalAlpha = Math.min(0.92, 0.38 + progress * 0.28 + settle * 0.34)
      drawCtx.fillStyle = color
      drawCtx.beginPath()
      drawCtx.arc(particle.x, particle.y, Math.max(1.2, density * 0.36), 0, Math.PI * 2)
      drawCtx.fill()
    })
    drawCtx.globalAlpha = 1
    if (!finished && isActiveAnimationRun(el, runId) && elapsed < total) frameId = requestAnimationFrame(frame)
  }

  frame(start)
  anim.onfinish = () => {
    cleanup()
    onAnimationEnd?.()
  }
  anim.oncancel = cleanup
  return anim
}

function animatePixelRain(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const runId = beginAnimationRun(el)
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  el.style.color = ""
  const computed = getComputedStyle(el)
  const textSize = measureInlineText(el, text)
  const fontSize = Number.parseFloat(computed.fontSize) || 48
  const canvasW = Math.max(180, Math.ceil(textSize.width + fontSize * 1.4))
  const canvasH = Math.max(fontSize * 1.7, Math.ceil(textSize.height + fontSize * 1.2))
  const color = computed.color || "rgb(232, 234, 240)"
  const previous = {
    position: el.style.position,
    display: el.style.display,
    overflow: el.style.overflow,
    color: el.style.color,
    willChange: el.style.willChange,
  }

  el.style.position = "relative"
  el.style.display = "inline-block"
  el.style.overflow = "visible"
  el.style.color = "transparent"
  el.style.willChange = "transform, opacity"

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(canvasW * dpr)
  canvas.height = Math.round(canvasH * dpr)
  canvas.style.position = "absolute"
  canvas.style.left = "50%"
  canvas.style.top = "50%"
  canvas.style.transform = "translate(-50%, -50%)"
  canvas.style.width = `${canvasW}px`
  canvas.style.height = `${canvasH}px`
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = "1"
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    el.textContent = text
    return
  }
  const drawCtx = ctx
  drawCtx.scale(dpr, dpr)
  el.appendChild(canvas)

  const off = document.createElement("canvas")
  off.width = canvasW
  off.height = canvasH
  const octx = off.getContext("2d")
  if (!octx) {
    el.textContent = text
    return
  }
  octx.font = computed.font || `700 ${fontSize}px sans-serif`
  octx.textAlign = "center"
  octx.textBaseline = "middle"
  octx.fillStyle = "#fff"
  octx.fillText(text, canvasW / 2, canvasH / 2)

  const { data } = octx.getImageData(0, 0, canvasW, canvasH)
  const density = Math.max(3, Math.round(fontSize / 18))
  const points: { x: number; y: number }[] = []
  for (let y = 0; y < canvasH; y += density) {
    for (let x = 0; x < canvasW; x += density) {
      if (data[(y * canvasW + x) * 4 + 3] > 128) points.push({ x, y })
    }
  }
  if (points.length === 0) {
    el.textContent = text
    return
  }

  const maxParticles = 900
  const step = Math.max(1, Math.ceil(points.length / maxParticles))
  const sampled = points.filter((_, i) => i % step === 0)
  const particles = sampled.map((point) => ({
    x: point.x + (Math.random() - 0.5) * fontSize * 0.8,
    y: Math.max(0, point.y - fontSize * (0.8 + Math.random() * 1.3)),
    vx: (Math.random() - 0.5) * 2.2,
    vy: 1.4 + Math.random() * 2.2,
    ox: point.x,
    oy: point.y,
  }))

  let frameId = 0
  let finished = false
  const total = Math.max(1200, duration)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (finished) return
    finished = true
    cancelAnimationFrame(frameId)
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function frame(now: number) {
    if (finished || !isActiveAnimationRun(el, runId)) return
    const elapsed = now - start
    const progress = Math.min(1, elapsed / total)
    drawCtx.clearRect(0, 0, canvasW, canvasH)
    particles.forEach((particle) => {
      particle.vy += 0.12 * (1 - progress)
      particle.vx += (particle.ox - particle.x) * 0.045
      particle.vx *= 0.84
      particle.x += particle.vx
      particle.vy += (particle.oy - particle.y) * 0.045
      particle.vy *= 0.84
      particle.y += particle.vy
      const dist = Math.hypot(particle.x - particle.ox, particle.y - particle.oy)
      const alpha = Math.min(0.94, 0.32 + progress * 0.22 + (1 - Math.min(1, dist / 170)) * 0.4)
      drawCtx.globalAlpha = alpha
      drawCtx.fillStyle = color
      drawCtx.beginPath()
      drawCtx.arc(particle.x, particle.y, Math.max(1.2, density * 0.34), 0, Math.PI * 2)
      drawCtx.fill()
    })
    drawCtx.globalAlpha = 1
    if (!finished && isActiveAnimationRun(el, runId) && elapsed < total) frameId = requestAnimationFrame(frame)
  }

  frame(start)
  anim.onfinish = () => {
    cleanup()
    onAnimationEnd?.()
  }
  anim.oncancel = cleanup
  return anim
}

function animateVortex(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const runId = beginAnimationRun(el)
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  el.style.color = ""
  const computed = getComputedStyle(el)
  const textSize = measureInlineText(el, text)
  const fontSize = Number.parseFloat(computed.fontSize) || 48
  const canvasW = Math.max(180, Math.ceil(textSize.width + fontSize * 1.4))
  const canvasH = Math.max(fontSize * 1.7, Math.ceil(textSize.height + fontSize * 1.2))
  const color = computed.color || "rgb(232, 234, 240)"
  const previous = {
    position: el.style.position,
    display: el.style.display,
    overflow: el.style.overflow,
    color: el.style.color,
    willChange: el.style.willChange,
  }

  el.style.position = "relative"
  el.style.display = "inline-block"
  el.style.overflow = "visible"
  el.style.color = "transparent"
  el.style.willChange = "transform, opacity"

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(canvasW * dpr)
  canvas.height = Math.round(canvasH * dpr)
  canvas.style.position = "absolute"
  canvas.style.left = "50%"
  canvas.style.top = "50%"
  canvas.style.transform = "translate(-50%, -50%)"
  canvas.style.width = `${canvasW}px`
  canvas.style.height = `${canvasH}px`
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = "1"
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    el.textContent = text
    return
  }
  const drawCtx = ctx
  drawCtx.scale(dpr, dpr)
  el.appendChild(canvas)

  const off = document.createElement("canvas")
  off.width = canvasW
  off.height = canvasH
  const octx = off.getContext("2d")
  if (!octx) {
    el.textContent = text
    return
  }
  octx.font = computed.font || `700 ${fontSize}px sans-serif`
  octx.textAlign = "center"
  octx.textBaseline = "middle"
  octx.fillStyle = "#fff"
  octx.fillText(text, canvasW / 2, canvasH / 2)

  const { data } = octx.getImageData(0, 0, canvasW, canvasH)
  const density = Math.max(3, Math.round(fontSize / 18))
  const points: { x: number; y: number }[] = []
  for (let y = 0; y < canvasH; y += density) {
    for (let x = 0; x < canvasW; x += density) {
      if (data[(y * canvasW + x) * 4 + 3] > 128) points.push({ x, y })
    }
  }
  if (points.length === 0) {
    el.textContent = text
    return
  }

  const maxParticles = 900
  const step = Math.max(1, Math.ceil(points.length / maxParticles))
  const sampled = points.filter((_, i) => i % step === 0)
  const cx = canvasW / 2
  const cy = canvasH / 2
  const radiusBase = Math.min(canvasW, canvasH) * 0.45
  const particles = sampled.map((point) => {
    const angle = Math.random() * Math.PI * 2
    const radius = radiusBase * (0.62 + Math.random() * 0.42)
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: -Math.sin(angle) * 3.5,
      vy: Math.cos(angle) * 3.5,
      ox: point.x,
      oy: point.y,
    }
  })

  let frameId = 0
  let finished = false
  const total = Math.max(1200, duration)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (finished) return
    finished = true
    cancelAnimationFrame(frameId)
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function frame(now: number) {
    if (finished || !isActiveAnimationRun(el, runId)) return
    const elapsed = now - start
    const timeProgress = Math.min(1, elapsed / total)
    drawCtx.clearRect(0, 0, canvasW, canvasH)
    particles.forEach((particle) => {
      const spin = (1 - timeProgress) * 0.18
      const dx = particle.x - cx
      const dy = particle.y - cy
      particle.vx += -dy * spin * 0.01
      particle.vy += dx * spin * 0.01
      particle.vx += (particle.ox - particle.x) * 0.045
      particle.vx *= 0.88
      particle.x += particle.vx
      particle.vy += (particle.oy - particle.y) * 0.045
      particle.vy *= 0.88
      particle.y += particle.vy
      const progress = 1 - Math.min(1, Math.hypot(particle.x - particle.ox, particle.y - particle.oy) / 180)
      drawCtx.globalAlpha = Math.min(0.94, 0.36 + timeProgress * 0.18 + progress * 0.42)
      drawCtx.fillStyle = color
      drawCtx.beginPath()
      drawCtx.arc(particle.x, particle.y, Math.max(1.2, density * 0.36), 0, Math.PI * 2)
      drawCtx.fill()
    })
    drawCtx.globalAlpha = 1
    if (!finished && isActiveAnimationRun(el, runId) && elapsed < total) frameId = requestAnimationFrame(frame)
  }

  frame(start)
  anim.onfinish = () => {
    cleanup()
    onAnimationEnd?.()
  }
  anim.oncancel = cleanup
  return anim
}

function animateDominoFall(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    position: el.style.position,
    flexWrap: el.style.flexWrap,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    height: el.style.height,
    minHeight: el.style.minHeight,
    overflow: el.style.overflow,
    boxSizing: el.style.boxSizing,
    willChange: el.style.willChange,
  }
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const stage = stableTextStageSize(el, text, 1.2, 1.15)

  el.style.display = "inline-block"
  el.style.position = "relative"
  el.style.whiteSpace = "pre-wrap"
  el.style.overflow = "visible"
  el.style.boxSizing = "border-box"
  el.style.width = `${stage.width}px`
  el.style.minWidth = `${stage.width}px`
  el.style.height = `${stage.height}px`
  el.style.minHeight = `${stage.height}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const row = document.createElement("span")
  row.style.display = "flex"
  row.style.width = "100%"
  row.style.height = `${stage.innerHeight}px`
  row.style.justifyContent = justifyContent
  row.style.whiteSpace = "pre"
  row.style.textAlign = computed.textAlign
  row.style.alignItems = "baseline"
  row.style.position = "absolute"
  row.style.left = "0"
  row.style.top = `${stage.verticalSafe}px`
  row.style.paddingLeft = `${stage.sideSafe}px`
  row.style.paddingRight = `${stage.sideSafe}px`
  row.style.boxSizing = "border-box"
  el.appendChild(row)

  const chars = Array.from(text).map((char) => {
    const span = document.createElement("span")
    span.textContent = char
    span.style.display = "inline-block"
    span.style.whiteSpace = "pre"
    span.style.transformOrigin = "50% 100%"
    span.style.willChange = "transform"
    row.appendChild(span)
    return span
  })

  const states = chars.map(() => ({ angle: 0, velocity: 0, active: false, done: false }))
  if (states[0]) states[0].active = true

  let frameId = 0
  let finished = false
  let reported = false
  const total = Math.max(duration, chars.length * 90 + 360)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    cancelAnimationFrame(frameId)
    if (finished) return
    finished = true
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function complete() {
    cleanup()
    if (reported) return
    reported = true
    onAnimationEnd?.()
  }

  function frame(now: number) {
    let allDone = true
    const elapsed = now - start
    chars.forEach((char, index) => {
      const state = states[index]
      if (!state.active || state.done) {
        if (!state.done) allDone = false
        return
      }

      state.velocity += (90 - state.angle) * 0.035
      state.velocity *= 0.94
      state.angle += state.velocity

      if (state.angle > 50 && states[index + 1] && !states[index + 1].active) {
        states[index + 1].active = true
      }

      if (state.angle >= 90) {
        state.angle = 90
        state.velocity = 0
        state.done = true
      } else {
        allDone = false
      }

      char.style.transform = `rotateZ(${state.angle}deg)`
    })

    if (!allDone && elapsed < total) {
      frameId = requestAnimationFrame(frame)
    } else {
      complete()
    }
  }

  frameId = requestAnimationFrame(frame)
  anim.onfinish = complete
  anim.oncancel = cleanup
  return anim
}

function animatePendulum(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    position: el.style.position,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    height: el.style.height,
    minHeight: el.style.minHeight,
    overflow: el.style.overflow,
    boxSizing: el.style.boxSizing,
    willChange: el.style.willChange,
  }
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const stage = stableTextStageSize(el, text, 1.25, 1.05)

  el.style.display = "inline-block"
  el.style.position = "relative"
  el.style.whiteSpace = "pre-wrap"
  el.style.overflow = "visible"
  el.style.boxSizing = "border-box"
  el.style.width = `${stage.width}px`
  el.style.minWidth = `${stage.width}px`
  el.style.height = `${stage.height}px`
  el.style.minHeight = `${stage.height}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const row = document.createElement("span")
  row.style.display = "flex"
  row.style.width = "100%"
  row.style.height = `${stage.innerHeight}px`
  row.style.justifyContent = justifyContent
  row.style.whiteSpace = "pre"
  row.style.textAlign = computed.textAlign
  row.style.alignItems = "baseline"
  row.style.position = "absolute"
  row.style.left = "0"
  row.style.top = `${stage.verticalSafe}px`
  row.style.paddingLeft = `${stage.sideSafe}px`
  row.style.paddingRight = `${stage.sideSafe}px`
  row.style.boxSizing = "border-box"
  el.appendChild(row)

  const chars = Array.from(text).map((char) => {
    const span = document.createElement("span")
    span.textContent = char
    span.style.display = "inline-block"
    span.style.whiteSpace = "pre"
    span.style.transformOrigin = "50% 100%"
    span.style.willChange = "transform"
    row.appendChild(span)
    return span
  })

  const states = chars.map((_, index) => ({
    position: (index % 2 === 0 ? 1 : -1) * (14 + index * 1.8),
    velocity: 0,
  }))

  let frameId = 0
  let finished = false
  let reported = false
  const total = Math.max(duration, chars.length * 80 + 600)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    cancelAnimationFrame(frameId)
    if (finished) return
    finished = true
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function complete() {
    cleanup()
    if (reported) return
    reported = true
    onAnimationEnd?.()
  }

  function frame(now: number) {
    const elapsed = now - start
    let allDone = true
    chars.forEach((char, index) => {
      if (elapsed < index * 90) {
        allDone = false
        return
      }
      const state = states[index]
      state.velocity += (0 - state.position) * 0.016
      state.velocity *= 0.986
      state.position += state.velocity
      char.style.transform = `rotateZ(${state.position}deg)`
      if (Math.abs(state.velocity) + Math.abs(state.position) >= 0.05) allDone = false
    })

    if (!allDone && elapsed < total) {
      frameId = requestAnimationFrame(frame)
    } else {
      complete()
    }
  }

  frameId = requestAnimationFrame(frame)
  anim.onfinish = complete
  anim.oncancel = cleanup
  return anim
}

function animateCenterBurst(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    position: el.style.position,
    alignItems: el.style.alignItems,
    justifyContent: el.style.justifyContent,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    height: el.style.height,
    minHeight: el.style.minHeight,
    overflow: el.style.overflow,
    boxSizing: el.style.boxSizing,
    willChange: el.style.willChange,
  }
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const stage = stableTextStageSize(el, text, 1.15, 0.75)

  el.style.display = "inline-block"
  el.style.position = "relative"
  el.style.whiteSpace = "pre-wrap"
  el.style.overflow = "visible"
  el.style.boxSizing = "border-box"
  el.style.width = `${stage.width}px`
  el.style.minWidth = `${stage.width}px`
  el.style.height = `${stage.height}px`
  el.style.minHeight = `${stage.height}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const row = document.createElement("span")
  row.style.display = "flex"
  row.style.width = "100%"
  row.style.height = `${stage.innerHeight}px`
  row.style.justifyContent = justifyContent
  row.style.whiteSpace = "pre"
  row.style.textAlign = computed.textAlign
  row.style.alignItems = "baseline"
  row.style.position = "absolute"
  row.style.left = "0"
  row.style.top = `${stage.verticalSafe}px`
  row.style.paddingLeft = `${stage.sideSafe}px`
  row.style.paddingRight = `${stage.sideSafe}px`
  row.style.boxSizing = "border-box"
  el.appendChild(row)

  const chars = Array.from(text).map((char) => {
    const span = document.createElement("span")
    span.textContent = char
    span.style.display = "inline-block"
    span.style.whiteSpace = "pre"
    span.style.opacity = "0"
    span.style.willChange = "transform, opacity"
    row.appendChild(span)
    return span
  })

  const textRect = el.getBoundingClientRect()
  const centerX = textRect.left + textRect.width / 2
  const offsets = chars.map((char) => {
    const rect = char.getBoundingClientRect()
    return rect.left + rect.width / 2 - centerX
  })
  const xStates = chars.map((_, index) => ({ position: -offsets[index], velocity: 0 }))
  const yStates = chars.map(() => ({ position: (Math.random() - 0.5) * 40, velocity: 0 }))
  const opacityStates = chars.map(() => ({ position: 0, velocity: 0 }))

  let frameId = 0
  let finished = false
  let reported = false
  const total = Math.max(duration, 900)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    cancelAnimationFrame(frameId)
    if (finished) return
    finished = true
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function complete() {
    cleanup()
    if (reported) return
    reported = true
    onAnimationEnd?.()
  }

  function spring(state: { position: number; velocity: number }, target: number, k: number, damping: number) {
    state.velocity += (target - state.position) * k
    state.velocity *= damping
    state.position += state.velocity
    return Math.abs(state.velocity) + Math.abs(target - state.position) < 0.05
  }

  function frame(now: number) {
    const elapsed = now - start
    let allDone = true
    chars.forEach((char, index) => {
      const xDone = spring(xStates[index], 0, 0.07, 0.7)
      const yDone = spring(yStates[index], 0, 0.09, 0.68)
      spring(opacityStates[index], 1, 0.08, 0.74)
      char.style.transform = `translate(${xStates[index].position}px, ${yStates[index].position}px)`
      char.style.opacity = String(Math.max(0, Math.min(1, opacityStates[index].position)))
      if (!xDone || !yDone) allDone = false
    })

    if (!allDone && elapsed < total) {
      frameId = requestAnimationFrame(frame)
    } else {
      complete()
    }
  }

  frameId = requestAnimationFrame(frame)
  anim.onfinish = complete
  anim.oncancel = cleanup
  return anim
}

function animateGravityBounce(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    position: el.style.position,
    alignItems: el.style.alignItems,
    justifyContent: el.style.justifyContent,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    height: el.style.height,
    minHeight: el.style.minHeight,
    overflow: el.style.overflow,
    boxSizing: el.style.boxSizing,
    willChange: el.style.willChange,
  }
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const stage = stableTextStageSize(el, text, 1.05, 1.45)

  el.style.display = "inline-block"
  el.style.position = "relative"
  el.style.whiteSpace = "pre-wrap"
  el.style.overflow = "visible"
  el.style.boxSizing = "border-box"
  el.style.width = `${stage.width}px`
  el.style.minWidth = `${stage.width}px`
  el.style.height = `${stage.height}px`
  el.style.minHeight = `${stage.height}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const row = document.createElement("span")
  row.style.display = "flex"
  row.style.width = "100%"
  row.style.height = `${stage.innerHeight}px`
  row.style.justifyContent = justifyContent
  row.style.whiteSpace = "pre"
  row.style.textAlign = computed.textAlign
  row.style.alignItems = "baseline"
  row.style.position = "absolute"
  row.style.left = "0"
  row.style.top = `${stage.verticalSafe}px`
  row.style.paddingLeft = `${stage.sideSafe}px`
  row.style.paddingRight = `${stage.sideSafe}px`
  row.style.boxSizing = "border-box"
  el.appendChild(row)

  const chars = Array.from(text).map((char) => {
    const span = document.createElement("span")
    span.textContent = char
    span.style.display = "inline-block"
    span.style.whiteSpace = "pre"
    span.style.opacity = "0"
    span.style.willChange = "transform, opacity"
    row.appendChild(span)
    return span
  })

  const states = chars.map((_, index) => ({
    position: -(60 + index * 12),
    velocity: 0,
    settled: false,
    opacity: 0,
    opacityVelocity: 0,
  }))

  let frameId = 0
  let finished = false
  let reported = false
  const total = Math.max(duration, chars.length * 90 + 900)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    cancelAnimationFrame(frameId)
    if (finished) return
    finished = true
    el.textContent = text
    Object.assign(el.style, previous)
  }

  function complete() {
    cleanup()
    if (reported) return
    reported = true
    onAnimationEnd?.()
  }

  function frame(now: number) {
    const elapsed = now - start
    let done = true
    chars.forEach((char, index) => {
      if (elapsed < index * 64) {
        done = false
        return
      }

      const state = states[index]
      if (!state.settled) {
        state.velocity += 0.9
        state.position += state.velocity
        if (state.position >= 0) {
          state.position = 0
          state.velocity *= -0.42
          if (Math.abs(state.velocity) < 1) {
            state.velocity = 0
            state.settled = true
          } else {
            done = false
          }
        } else {
          done = false
        }
      }

      state.opacityVelocity += (1 - state.opacity) * 0.07
      state.opacityVelocity *= 0.78
      state.opacity += state.opacityVelocity
      char.style.transform = `translateY(${state.position}px)`
      char.style.opacity = String(Math.max(0, Math.min(1, state.opacity)))
    })

    if (!done && elapsed < total) {
      frameId = requestAnimationFrame(frame)
    } else {
      complete()
    }
  }

  frameId = requestAnimationFrame(frame)
  anim.onfinish = complete
  anim.oncancel = cleanup
  return anim
}

function animateScrollFanIn(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    whiteSpace: el.style.whiteSpace,
    perspective: el.style.perspective,
    width: el.style.width,
    minWidth: el.style.minWidth,
    willChange: el.style.willChange,
  }
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const currentRect = el.getBoundingClientRect()
  const nextWidth = Math.ceil(measureInlineText(el, text).width)
  const prevMinWidthPx = Number.parseFloat(previous.minWidth || "0")
  const settledMinWidth = Math.ceil(Math.max(prevMinWidthPx, currentRect.width, nextWidth))

  el.style.display = "inline-block"
  el.style.whiteSpace = "pre-wrap"
  el.style.perspective = "500px"
  el.style.width = `${Math.ceil(Math.max(currentRect.width, nextWidth))}px`
  el.style.minWidth = `${settledMinWidth}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const chars = Array.from(text)
  const row = document.createElement("span")
  row.style.display = "flex"
  row.style.width = "100%"
  row.style.justifyContent = justifyContent
  row.style.whiteSpace = "pre"
  row.style.textAlign = computed.textAlign
  el.appendChild(row)
  const center = Math.floor(chars.length / 2)
  const spans = chars.map((char, index) => {
    const span = document.createElement("span")
    const distance = index - center
    const x = Math.max(-260, Math.min(260, distance * 50))
    const rotateX = Math.max(-70, Math.min(70, distance * 50))
    span.textContent = char
    span.style.display = "inline-block"
    span.style.whiteSpace = "pre"
    span.style.color = "currentColor"
    span.style.willChange = "transform, opacity"
    span.style.transformOrigin = "center"
    span.style.transform = `translateX(${x}px) rotateX(${rotateX}deg)`
    span.style.opacity = "0"
    row.appendChild(span)
    return { span, x, rotateX }
  })

  const childDuration = Math.max(420, duration * 0.75)
  let remaining = spans.length
  let finished = false
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: childDuration + 120, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    if (finished) return
    finished = true
    el.textContent = text
    Object.assign(el.style, previous)
  }

  spans.forEach(({ span, x, rotateX }) => {
    const child = span.animate(
      [
        { opacity: 0, transform: `translateX(${x}px) rotateX(${rotateX}deg) scale(0.96)` },
        { opacity: 1, transform: "translateX(0) rotateX(0deg) scale(1)" },
      ],
      { duration: childDuration, easing: EASE_IN_OUT, fill: "forwards" },
    )
    child.onfinish = () => {
      remaining -= 1
      if (remaining === 0) {
        cleanup()
        onAnimationEnd?.()
      }
    }
  })

  anim.oncancel = cleanup
  return anim
}

function animateTextRotate(
  el: HTMLElement,
  prevValue: string | number | undefined,
  nextValue: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const oldText = prevValue === undefined ? el.textContent ?? "" : String(prevValue)
  const newText = nextValue === undefined ? el.textContent ?? "" : String(nextValue)
  if (!newText) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const oldSize = measureInlineText(el, oldText)
  const newSize = measureInlineText(el, newText)
  const currentRect = el.getBoundingClientRect()
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const fontSize = Number.parseFloat(computed.fontSize) || 16
  const buffer = Math.ceil(fontSize * 0.3) * 2
  const stableWidth = Math.ceil(Math.max(oldSize.width, newSize.width, currentRect.width)) + buffer
  const stableHeight = Math.ceil(Math.max(oldSize.height, newSize.height, currentRect.height))
  const previous = {
    position: el.style.position,
    display: el.style.display,
    overflow: el.style.overflow,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    height: el.style.height,
    minHeight: el.style.minHeight,
    perspective: el.style.perspective,
    willChange: el.style.willChange,
  }

  el.style.position = "relative"
  el.style.display = "inline-block"
  el.style.overflow = "hidden"
  el.style.whiteSpace = "pre-wrap"
  el.style.width = `${stableWidth}px`
  el.style.minWidth = `${stableWidth}px`
  el.style.height = `${stableHeight}px`
  el.style.minHeight = `${stableHeight}px`
  el.style.perspective = "600px"
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  function makeRow(text: string) {
    const row = document.createElement("span")
    row.style.display = "flex"
    row.style.alignItems = "center"
    row.style.justifyContent = justifyContent
    row.style.flexWrap = "wrap"
    row.style.whiteSpace = "pre-wrap"
    row.style.textAlign = computed.textAlign
    row.style.width = "100%"
    row.style.height = "100%"
    splitGraphemes(text).forEach((char) => {
      const span = document.createElement("span")
      span.textContent = char
      span.style.display = "inline-block"
      span.style.whiteSpace = "pre"
      span.style.willChange = "transform, opacity"
      row.appendChild(span)
    })
    return row
  }

  const oldRow = makeRow(oldText)
  const newRow = makeRow(newText)
  oldRow.style.position = "absolute"
  oldRow.style.left = "0"
  oldRow.style.top = "0"
  newRow.style.position = "absolute"
  newRow.style.left = "0"
  newRow.style.top = "0"
  el.append(oldRow, newRow)

  const oldChars = Array.from(oldRow.children) as HTMLElement[]
  const newChars = Array.from(newRow.children) as HTMLElement[]

  const exitDuration = Math.max(180, duration * 0.35)
  const entryStagger = Math.min(30, Math.max(10, duration * 0.03))
  const entryDuration = Math.max(300, duration * 0.55)
  const entryStart = exitDuration + 20

  const totalDuration = entryStart + entryDuration + Math.max(0, newChars.length - 1) * entryStagger + 50

  let remaining = oldChars.length + newChars.length
  let reported = false
  let finished = false
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: totalDuration, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    if (finished) return
    finished = true
    el.textContent = newText
    Object.assign(el.style, previous)
  }

  function doneOne() {
    remaining -= 1
    if (remaining > 0 || reported) return
    reported = true
    cleanup()
    onAnimationEnd?.()
  }

  if (remaining === 0) {
    cleanup()
    onAnimationEnd?.()
    return anim
  }

  oldChars.forEach((char) => {
    char.style.transformOrigin = "50% 0%"
    const child = char.animate(
      [
        { opacity: 1, transform: "rotateX(0deg)" },
        { opacity: 0, transform: "rotateX(-90deg)" },
      ],
      { duration: exitDuration, easing: EASE_IN, fill: "forwards" },
    )
    child.onfinish = doneOne
  })

  if (oldChars.length > 0) {
    setTimeout(() => { oldRow.style.display = "none" }, exitDuration + 10)
  }

  newChars.forEach((char, index) => {
    char.style.transformOrigin = "50% 100%"
    const child = char.animate(
      [
        { opacity: 0, transform: "rotateX(90deg)" },
        { opacity: 1, transform: "rotateX(0deg)" },
      ],
      { duration: entryDuration, delay: entryStart + index * entryStagger, easing: SPRING, fill: "forwards" },
    )
    child.onfinish = doneOne
  })

  anim.oncancel = cleanup
  return anim
}

function animateGooeyMorph(
  el: HTMLElement,
  prevValue: string | number | undefined,
  nextValue: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const oldText = prevValue === undefined ? el.textContent ?? "" : String(prevValue)
  const newText = nextValue === undefined ? el.textContent ?? "" : String(nextValue)
  if (!newText) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const uid = Math.random().toString(36).slice(2)
  const oldSize = measureInlineText(el, oldText)
  const newSize = measureInlineText(el, newText)
  const currentRect = el.getBoundingClientRect()
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const justifyItems =
    justifyContent === "center" ? "center"
    : justifyContent === "flex-end" ? "end"
    : "start"
  const fontSize = Number.parseFloat(computed.fontSize) || 16
  const buffer = Math.ceil(fontSize * 0.3) * 2
  const stableWidth = Math.ceil(Math.max(oldSize.width, newSize.width, currentRect.width)) + buffer
  const stableHeight = Math.ceil(Math.max(oldSize.height, newSize.height, currentRect.height))
  const previous = {
    position: el.style.position,
    display: el.style.display,
    overflow: el.style.overflow,
    width: el.style.width,
    minWidth: el.style.minWidth,
    height: el.style.height,
    minHeight: el.style.minHeight,
    willChange: el.style.willChange,
  }

  el.style.position = "relative"
  el.style.display = "inline-block"
  el.style.overflow = "visible"
  el.style.width = `${stableWidth}px`
  el.style.minWidth = `${stableWidth}px`
  el.style.height = `${stableHeight}px`
  el.style.minHeight = `${stableHeight}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")
  svg.style.position = "absolute"
  svg.style.width = "0"
  svg.style.height = "0"

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter")
  filter.setAttribute("id", `trigr-gooey-${uid}`)
  const cm = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix")
  cm.setAttribute("in", "SourceGraphic")
  cm.setAttribute("type", "matrix")
  cm.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8")
  filter.append(cm)
  defs.appendChild(filter)
  svg.appendChild(defs)

  const wrap = document.createElement("span")
  wrap.style.display = "grid"
  wrap.style.alignItems = "center"
  wrap.style.justifyItems = justifyItems
  wrap.style.width = "100%"
  wrap.style.height = "100%"
  wrap.style.textAlign = computed.textAlign
  wrap.style.filter = `url(#trigr-gooey-${uid})`

  const oldSpan = document.createElement("span")
  const newSpan = document.createElement("span")
  oldSpan.textContent = oldText
  newSpan.textContent = newText
  ;[oldSpan, newSpan].forEach((span) => {
    span.style.gridArea = "1 / 1"
    span.style.display = "inline-block"
    span.style.textAlign = computed.textAlign
    span.style.justifySelf = justifyItems
    span.style.userSelect = "none"
    span.style.willChange = "filter, opacity"
  })
  oldSpan.style.opacity = "1"
  newSpan.style.opacity = "0"

  wrap.append(oldSpan, newSpan)
  el.append(svg, wrap)

  let frameId = 0
  let finished = false
  const total = Math.max(650, duration)
  const start = performance.now()
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    cancelAnimationFrame(frameId)
    if (finished) return
    finished = true
    el.textContent = newText
    Object.assign(el.style, previous)
  }

  function setMorph(fraction: number) {
    const f = Math.max(0, Math.min(1, fraction))
    const g = 1 - f
    const newBlur = (1 - f) * 4
    const oldBlur = f * 4
    newSpan.style.filter = `blur(${newBlur.toFixed(2)}px)`
    newSpan.style.opacity = `${Math.pow(f, 0.65)}`
    oldSpan.style.filter = `blur(${oldBlur.toFixed(2)}px)`
    oldSpan.style.opacity = `${Math.pow(g, 0.65)}`
  }

  function frame(now: number) {
    const fraction = Math.min(1, (now - start) / total)
    setMorph(fraction)
    if (fraction < 1) frameId = requestAnimationFrame(frame)
  }

  frameId = requestAnimationFrame(frame)
  anim.onfinish = () => {
    cleanup()
    onAnimationEnd?.()
  }
  anim.oncancel = cleanup
  return anim
}

function animateRandomLetterSwap(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    alignItems: el.style.alignItems,
    justifyContent: el.style.justifyContent,
    overflow: el.style.overflow,
    whiteSpace: el.style.whiteSpace,
    willChange: el.style.willChange,
  }

  el.style.display = "inline-block"
  el.style.overflow = "hidden"
  el.style.whiteSpace = "pre"
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const chars = splitGraphemes(text)
  const order = chars.map((_, index) => index).sort(() => Math.random() - 0.5)
  const slots = chars.map((char) => {
    const slot = document.createElement("span")
    const primary = document.createElement("span")
    const secondary = document.createElement("span")
    slot.style.display = "inline-flex"
    slot.style.position = "relative"
    slot.style.alignItems = "flex-end"
    slot.style.overflow = "hidden"
    slot.style.height = "1.22em"
    slot.style.lineHeight = "1.22"
    slot.style.verticalAlign = "baseline"
    slot.style.whiteSpace = "pre"
    primary.textContent = char
    secondary.textContent = char
    primary.style.display = "inline-block"
    primary.style.position = "relative"
    primary.style.willChange = "transform"
    secondary.style.display = "inline-block"
    secondary.style.position = "absolute"
    secondary.style.left = "0"
    secondary.style.top = "-100%"
    secondary.style.willChange = "transform"
    slot.append(primary, secondary)
    el.appendChild(slot)
    return { primary, secondary }
  })

  const stagger = Math.max(14, Math.min(36, duration * 0.04))
  const childDuration = Math.max(220, duration * 0.62)
  let remaining = slots.length * 2
  let finished = false
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: childDuration + slots.length * stagger + 40, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    if (finished) return
    finished = true
    // Use stored slot references instead of querySelectorAll
    slots.forEach(({ primary, secondary }) => {
      secondary.remove()
      primary.style.position = ""
      primary.style.willChange = ""
      primary.style.display = ""
    })
    // Unwrap slot spans: replace each slot with its primary child
    slots.forEach(({ primary }) => {
      const slot = primary.parentElement
      if (slot) slot.replaceWith(primary)
    })
    Object.assign(el.style, previous)
  }

  function doneOne() {
    remaining -= 1
    if (remaining > 0) return
    cleanup()
    onAnimationEnd?.()
  }

  if (remaining === 0) {
    cleanup()
    onAnimationEnd?.()
    return anim
  }

  order.forEach((charIndex, orderIndex) => {
    const slot = slots[charIndex]
    const delay = orderIndex * stagger
    const primary = slot.primary.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(100%)" },
      ],
      { duration: childDuration, delay, easing: SPRING, fill: "forwards" },
    )
    const secondary = slot.secondary.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(100%)" },
      ],
      { duration: childDuration, delay, easing: SPRING, fill: "forwards" },
    )
    primary.onfinish = doneOne
    secondary.onfinish = doneOne
  })

  anim.oncancel = cleanup
  return anim
}

function animateTextEffect(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    willChange: el.style.willChange,
  }
  const currentRect = el.getBoundingClientRect()
  const nextWidth = Math.ceil(measureInlineText(el, text).width)
  const prevMinWidthPx = Number.parseFloat(previous.minWidth || "0")
  const settledMinWidth = Math.ceil(Math.max(prevMinWidthPx, currentRect.width, nextWidth))

  el.style.display = "inline-block"
  el.style.whiteSpace = "pre-wrap"
  el.style.width = `${Math.ceil(Math.max(currentRect.width, nextWidth))}px`
  el.style.minWidth = `${settledMinWidth}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const segments = text.split(/(\s+)/)
  const words = segments.map((segment) => {
    const span = document.createElement("span")
    span.textContent = segment
    span.style.display = /^\s+$/.test(segment) ? "inline" : "inline-block"
    span.style.whiteSpace = "pre"
    span.style.willChange = "transform, opacity, filter"
    span.style.opacity = /^\s+$/.test(segment) ? "1" : "0"
    el.appendChild(span)
    return span
  }).filter((span) => !/^\s+$/.test(span.textContent ?? ""))

  const stagger = Math.max(24, Math.min(60, duration * 0.08))
  const childDuration = Math.max(320, duration * 0.72)
  let remaining = words.length
  let finished = false
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: childDuration + words.length * stagger, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    if (finished) return
    finished = true
    el.textContent = text
    Object.assign(el.style, previous)
    el.style.minWidth = `${settledMinWidth}px`
  }

  function doneOne() {
    remaining -= 1
    if (remaining > 0) return
    cleanup()
    onAnimationEnd?.()
  }

  if (remaining === 0) {
    cleanup()
    onAnimationEnd?.()
    return anim
  }

  words.forEach((word, index) => {
    const child = word.animate(
      [
        { opacity: 0, filter: "blur(12px)", transform: "translateY(20px)" },
        { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
      ],
      { duration: childDuration, delay: index * stagger, easing: SMOOTH, fill: "forwards" },
    )
    child.onfinish = doneOne
  })

  anim.oncancel = cleanup
  return anim
}

function animateStaggerText(
  el: HTMLElement,
  value: string | number | undefined,
  duration: number,
  onAnimationEnd?: () => void,
) {
  const text = value === undefined ? el.textContent ?? "" : String(value)
  if (!text) return
  const runId = beginAnimationRun(el)

  if (prefersReducedMotion()) {
    const anim = el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: duration / 2, easing: EASE_IN, fill: "forwards" },
    )
    anim.onfinish = () => onAnimationEnd?.()
    return anim
  }

  const previous = {
    display: el.style.display,
    flexWrap: el.style.flexWrap,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    willChange: el.style.willChange,
  }
  const currentRect = el.getBoundingClientRect()
  const nextWidth = Math.ceil(measureInlineText(el, text).width)
  const prevMinWidthPx = Number.parseFloat(previous.minWidth || "0")
  const settledMinWidth = Math.ceil(Math.max(prevMinWidthPx, currentRect.width, nextWidth))

  el.style.display = "inline-block"
  el.style.flexWrap = "wrap"
  el.style.whiteSpace = "pre-wrap"
  el.style.width = `${Math.ceil(Math.max(currentRect.width, nextWidth))}px`
  el.style.minWidth = `${settledMinWidth}px`
  el.style.willChange = "transform, opacity"
  el.innerHTML = ""

  const chars: HTMLElement[] = []
  text.split(" ").forEach((word, wordIndex, words) => {
    const wordEl = document.createElement("span")
    wordEl.style.display = "inline-block"
    wordEl.style.whiteSpace = "nowrap"
    splitGraphemes(word).forEach((char) => {
      const clip = document.createElement("span")
      const inner = document.createElement("span")
      clip.style.display = "inline-block"
      clip.style.overflow = "hidden"
      inner.textContent = char
      inner.style.display = "inline-block"
      inner.style.opacity = "0"
      inner.style.transform = "translateY(100%)"
      inner.style.willChange = "transform, opacity"
      clip.appendChild(inner)
      wordEl.appendChild(clip)
      chars.push(inner)
    })
    el.appendChild(wordEl)
    if (wordIndex < words.length - 1) el.appendChild(document.createTextNode(" "))
  })

  const stagger = Math.max(18, Math.min(50, duration * 0.06))
  const childDuration = Math.max(280, duration * 0.68)
  let remaining = chars.length
  let finished = false
  const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: childDuration + chars.length * stagger, fill: "forwards" })

  function cleanup() {
    if (!isActiveAnimationRun(el, runId)) return
    if (finished) return
    finished = true
    el.textContent = text
    Object.assign(el.style, previous)
    el.style.minWidth = `${settledMinWidth}px`
  }

  function doneOne() {
    remaining -= 1
    if (remaining > 0) return
    cleanup()
    onAnimationEnd?.()
  }

  if (remaining === 0) {
    cleanup()
    onAnimationEnd?.()
    return anim
  }

  chars.forEach((char, index) => {
    const child = char.animate(
      [
        { opacity: 0, transform: "translateY(100%)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: childDuration, delay: index * stagger, easing: SPRING, fill: "forwards" },
    )
    child.onfinish = doneOne
  })

  anim.oncancel = cleanup
  return anim
}

function animateTextMorph(
  el: HTMLElement,
  prevValue: string | number | undefined,
  nextValue: string | number | undefined,
  baseDuration: number,
  onAnimationEnd?: () => void,
) {
  const oldText = prevValue === undefined ? "" : String(prevValue)
  const newText = nextValue === undefined ? el.textContent ?? "" : String(nextValue)
  const runId = beginAnimationRun(el)
  if (prefersReducedMotion()) {
    const { oldEl, newEl, cleanup } = prepareStableTextSwap(el, oldText, newText, runId)
    oldEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: baseDuration / 2, easing: EASE_IN, fill: "forwards" })
    const anim = newEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: baseDuration / 2, easing: SPRING, fill: "forwards" })
    anim.onfinish = () => {
      cleanup()
      onAnimationEnd?.()
    }
    anim.oncancel = cleanup
    return anim
  }

  const chars = Array.from(newText.length > oldText.length ? newText : oldText)
  const oldSize = measureInlineText(el, oldText)
  const newSize = measureInlineText(el, newText)
  const currentRect = el.getBoundingClientRect()
  const computed = getComputedStyle(el)
  const justifyContent = resolveInlineJustify(computed.textAlign)
  const fontSize = Number.parseFloat(computed.fontSize) || 16
  const buffer = Math.ceil(fontSize * 0.3) * 2
  const stableWidth = Math.ceil(Math.max(oldSize.width, newSize.width, currentRect.width)) + buffer
  const previous = {
    display: el.style.display,
    whiteSpace: el.style.whiteSpace,
    width: el.style.width,
    minWidth: el.style.minWidth,
    willChange: el.style.willChange,
  }
  const prevMinWidthPx = Number.parseFloat(previous.minWidth || "0")
  const settledMinWidth = Math.ceil(Math.max(prevMinWidthPx, stableWidth))
  el.style.willChange = "transform, opacity"
  el.style.display = "inline-block"
  el.style.whiteSpace = "pre"
  el.style.width = `${stableWidth}px`
  el.style.minWidth = `${settledMinWidth}px`
  el.innerHTML = ""

  const duration = Math.max(400, baseDuration + Math.max(0, chars.length - 5) * 15)
  const row = document.createElement("span")
  row.style.display = "flex"
  row.style.alignItems = "baseline"
  row.style.justifyContent = justifyContent
  row.style.whiteSpace = "pre"
  row.style.width = "100%"
  row.style.textAlign = computed.textAlign
  el.appendChild(row)

  chars.forEach((_, i) => {
    const oldChar = oldText[i]
    const newChar = newText[i]
    const same = oldChar !== undefined && oldChar === newChar
    const slot = document.createElement("span")
    slot.style.display = "inline-grid"
    slot.style.placeItems = "center"
    slot.style.position = "relative"
    slot.style.minWidth = same || newChar === undefined ? "auto" : "0.55em"
    row.appendChild(slot)

    if (same) {
      slot.textContent = newChar
      slot.animate(
        [{ opacity: 1, transform: "scale(1)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: duration * 0.55, delay: i * 15, easing: SMOOTH, fill: "forwards" },
      )
      return
    }

    if (oldChar !== undefined) {
      const oldSpan = document.createElement("span")
      oldSpan.textContent = oldChar
      oldSpan.style.gridArea = "1 / 1"
      slot.appendChild(oldSpan)
      oldSpan.animate(
        [{ opacity: 1, transform: "translateY(0) scale(1)" }, { opacity: 0, transform: "translateY(-4px) scale(0.5)" }],
        { duration: duration * 0.45, delay: i * 15, easing: EASE_IN, fill: "forwards" },
      )
    }

    if (newChar !== undefined) {
      const newSpan = document.createElement("span")
      newSpan.textContent = newChar
      newSpan.style.gridArea = "1 / 1"
      slot.appendChild(newSpan)
      newSpan.animate(
        [{ opacity: 0, transform: "translateY(4px) scale(0.5)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: duration * 0.65, delay: i * 15 + 55, easing: SPRING, fill: "forwards" },
      )
    }
  })

  const widthAnim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration, fill: "forwards" })
  widthAnim.onfinish = () => {
    el.textContent = newText
    Object.assign(el.style, previous)
    el.style.minWidth = `${settledMinWidth}px`
    onAnimationEnd?.()
  }
  widthAnim.oncancel = () => {
    if (!isActiveAnimationRun(el, runId)) return
    el.textContent = newText
    Object.assign(el.style, previous)
    el.style.minWidth = `${settledMinWidth}px`
  }
  return widthAnim
}

type SingleAnimationFn = (el: HTMLElement, value: string | number | undefined, duration: number, onAnimationEnd?: () => void) => Animation | undefined
type ChangeAnimationFn = (el: HTMLElement, prevValue: string | number | undefined, nextValue: string | number | undefined, duration: number, onAnimationEnd?: () => void) => Animation | undefined

const singleAnimations: Record<string, SingleAnimationFn> = {
  splitReveal: animateSplitReveal,
  splitSlide: animateSplitSlide,
  bigBang: animateBigBang,
  scatterAssemble: animateScatterAssemble,
  pixelRain: animatePixelRain,
  vortex: animateVortex,
  dominoFall: animateDominoFall,
  pendulum: animatePendulum,
  centerBurst: animateCenterBurst,
  gravityBounce: animateGravityBounce,
  scrollFanIn: animateScrollFanIn,
  randomLetterSwap: animateRandomLetterSwap,
  textEffect: animateTextEffect,
  staggerText: animateStaggerText,
}

const changeAnimations: Record<string, ChangeAnimationFn> = {
  morph: animateTextMorph,
  textRotate: animateTextRotate,
  gooeyMorph: animateGooeyMorph,
}

const AnimateText = forwardRef<AnimateTextHandle, AnimateTextProps>(function AnimateText({
  value,
  triggers: triggersProp,
  trigger = "change",
  animation: baseAnimation,
  scrollAnimation,
  highlightColor: highlightColorProp,
  properties,
  exitAnimation,
  show,
  unmountOnExit = true,
  duration = 300,
  easing = SPRING,
  delay = 0,
  threshold = 0.4,
  repeat = false,
  once,
  as = "span",
  className,
  style,
  onClick,
  onEnter,
  onExit,
  onHoverStart,
  onHoverEnd,
  onAnimationEnd: onAnimationEndProp,
  children,
}: AnimateTextProps, forwardedRef) {
  const ref = useRef<HTMLElement>(null)
  const animRef = useRef<Animation | null>(null)
  const propertyAnimRef = useRef<Animation | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runIdRef = useRef(0)
  const runningRef = useRef(false)
  const queueRef = useRef<TriggerSource[]>([])
  const [currentRun, setCurrentRun] = useState<QueuedRun | null>(null)
  const [phase, setPhase] = useState<"entered" | "exiting" | "exited">(
    show !== false ? "entered" : "exited"
  )
  const exitAnimRef = useRef<Animation | null>(null)
  const exitKeyRef = useRef(0)
  const watchedValue = useMemo(() => value ?? textFromNode(children), [children, value])
  const { changed, prev, current: watchedCurrent } = useValueChange(watchedValue)
  const capturedPrevRef = useRef(prev)
  if (changed) capturedPrevRef.current = prev
  const shouldObserveOnce = once ?? !repeat
  const triggerConfigs = useMemo(() => {
    if (triggersProp) {
      return triggersProp.map(tc => ({
        trigger: tc.trigger as TriggerSource,
        animation: tc.animation,
        threshold: tc.threshold ?? threshold,
      }))
    }
    const sources = (Array.isArray(trigger) ? trigger.slice(0, 2) : [trigger]) as TriggerSource[]
    return sources.map(s => ({
      trigger: s,
      animation: s === "scroll" && scrollAnimation ? scrollAnimation : baseAnimation,
      threshold,
    }))
  }, [triggersProp, trigger, baseAnimation, scrollAnimation, threshold])

  const triggerSources = useMemo(
    () => triggerConfigs.map(tc => tc.trigger),
    [triggerConfigs]
  )

  const hasTrigger = useCallback((source: TriggerSource) => triggerSources.includes(source), [triggerSources])
  const activeTrigger = currentRun?.source ?? triggerSources[0] ?? "change"
  const activeConfig = triggerConfigs.find(tc => tc.trigger === activeTrigger)
  const animation = activeConfig?.animation ?? baseAnimation
  const scrollConfig = triggerConfigs.find(tc => tc.trigger === "scroll")
  const scrollThreshold = scrollConfig?.threshold ?? threshold

  const startRun = useCallback((source: TriggerSource) => {
    runningRef.current = true
    runIdRef.current += 1
    setCurrentRun({ id: runIdRef.current, source })
  }, [])

  const requestRun = useCallback((source: TriggerSource) => {
    if (runningRef.current) {
      if (source !== "scroll" && queueRef.current.length < 2) queueRef.current.push(source)
      return
    }
    startRun(source)
  }, [startRun])

  const finishRun = useCallback(() => {
    if (runFallbackRef.current !== null) {
      clearTimeout(runFallbackRef.current)
      runFallbackRef.current = null
    }
    onAnimationEndProp?.()
    runningRef.current = false
    animRef.current = null
    const next = queueRef.current.shift()
    if (next) {
      startRun(next)
    } else {
      setCurrentRun(null)
    }
  }, [onAnimationEndProp, startRun])
  const onAnimationEnd = finishRun

  const animate = useCallback(() => {
    requestRun("manual")
  }, [requestRun])

  useImperativeHandle(forwardedRef, () => ({
    animate,
    get element() {
      return ref.current
    },
  }), [animate])

  const scrollTriggeredRef = useRef(false)

  useEffect(() => {
    if (!hasTrigger("scroll")) return
    const el = ref.current
    if (!el) return

    scrollTriggeredRef.current = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (scrollTriggeredRef.current) return
          scrollTriggeredRef.current = true
          onEnter?.()
          requestRun("scroll")
          if (shouldObserveOnce) observer.disconnect()
        } else {
          scrollTriggeredRef.current = false
          if (repeat) onExit?.()
        }
      },
      scrollObserverOptions(el, scrollThreshold),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasTrigger, onEnter, onExit, repeat, requestRun, shouldObserveOnce, scrollThreshold])

  useEffect(() => {
    if (!hasTrigger("change") || !changed) return
    requestRun("change")
  }, [changed, hasTrigger, requestRun])

  useEffect(() => {
    if (!hasTrigger("mount")) return
    requestRun("mount")
  }, [hasTrigger, requestRun])

  useEffect(() => {
    if (show === undefined) return

    if (show) {
      exitAnimRef.current?.cancel()
      exitAnimRef.current = null
      setPhase("entered")
      return
    }

    const key = ++exitKeyRef.current
    const exitPreset = exitAnimation ?? ("fadeOut" as AnimationPreset)

    if (!exitAnimation) {
      setPhase("exited")
      return
    }

    const el = ref.current
    if (!el) {
      setPhase("exited")
      return
    }

    animRef.current?.cancel()

    const motionDuration = validDuration(duration, 300)
    const def = presets[exitPreset]
    if (!def) {
      setPhase("exited")
      return
    }

    const onExitEnd = () => {
      if (exitKeyRef.current === key) {
        setPhase("exited")
        exitAnimRef.current = null
      }
    }

    setPhase("exiting")

    const exitFrames = def.out.length ? def.out : def.in.length ? def.in : [{ opacity: 0 }]
    el.style.willChange = "transform, opacity"
    applyInitialState(el, exitFrames)
    const kf = prefersReducedMotion() ? reducedKeyframes(exitFrames) : exitFrames
    exitAnimRef.current = el.animate(kf, {
      duration: motionDuration,
      easing,
      fill: "forwards",
    })
    exitAnimRef.current.addEventListener("finish", () => {
      applyFinalState(el, exitFrames)
      el.style.willChange = "auto"
      onExitEnd()
    })
    exitAnimRef.current.addEventListener("cancel", () => {
      el.style.willChange = "auto"
    })

    return () => {
      if (exitKeyRef.current === key) {
        exitAnimRef.current?.cancel()
        exitAnimRef.current = null
      }
    }
  }, [show, exitAnimation, duration, easing])

  const handleClick = useCallback((event: MouseEvent<HTMLElement>) => {
    onClick?.(event)
    if (hasTrigger("click")) requestRun("click")
  }, [hasTrigger, onClick, requestRun])

  const handleMouseEnter = useCallback(() => {
    onHoverStart?.()
    if (hasTrigger("hover")) requestRun("hover")
  }, [hasTrigger, onHoverStart, requestRun])

  const handleMouseLeave = useCallback(() => {
    onHoverEnd?.()
  }, [onHoverEnd])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      if (runFallbackRef.current !== null) clearTimeout(runFallbackRef.current)
      animRef.current?.cancel()
      propertyAnimRef.current?.cancel()
      exitAnimRef.current?.cancel()
    }
  }, [])

  useLayoutEffect(() => {
    if (!currentRun || !ref.current) return

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    if (runFallbackRef.current !== null) {
      clearTimeout(runFallbackRef.current)
      runFallbackRef.current = null
    }
    cancelElementAnimations(ref.current)
    animRef.current = null
    propertyAnimRef.current = null

    const current = activeTrigger === "change"
      ? watchedCurrent
      : value ?? ref.current.textContent ?? ""
    const reduced = prefersReducedMotion()
    const safeDuration = validDuration(duration, 300)
    const motionDuration = reduced ? safeDuration / 2 : safeDuration
    runFallbackRef.current = setTimeout(() => {
      runFallbackRef.current = null
      finishRun()
    }, Math.max(900, motionDuration * 2 + 600))
    // For non-change triggers, capture visible text before animation clears it
    const effectivePrev = activeTrigger === "change" ? capturedPrevRef.current : ref.current.textContent ?? ""
    if (activeTrigger === "change" && effectivePrev !== undefined && animation !== "highlight") {
      reserveStableTextSize(ref.current, String(effectivePrev), String(current))
    }
    propertyAnimRef.current = runPropertyAnimation(ref.current, properties, {
      duration: motionDuration,
      easing,
      delay,
    })

    const changeFn = changeAnimations[animation as string]
    if (changeFn) {
      animRef.current = changeFn(ref.current, effectivePrev, current, motionDuration, onAnimationEnd) ?? null
      return
    }

    const singleFn = singleAnimations[animation as string]
    if (singleFn) {
      animRef.current = singleFn(ref.current, current, motionDuration, onAnimationEnd) ?? null
      return
    }

    if (animation === "decoder") {
      const target = String(current)
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()"
      const n = target.length
      const charDur = motionDuration * 0.7
      const staggerGap = n > 1 ? (motionDuration * 0.3) / (n - 1) : 0
      const startTime = performance.now()

      function tick(now: number) {
        const elapsed = now - startTime
        let result = ""
        let done = true

        for (let i = 0; i < n; i++) {
          if (target[i] === " ") {
            result += " "
            continue
          }
          const t = elapsed - i * staggerGap
          if (t >= charDur) {
            result += target[i]
          } else {
            result += chars[Math.floor(Math.random() * chars.length)]
            done = false
          }
        }

        if (ref.current) ref.current.textContent = result

        if (!done) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          rafRef.current = null
          onAnimationEnd?.()
        }
      }

      rafRef.current = requestAnimationFrame(tick)
      return
    }

    if (animation === "fadeAway") {
      const text = capturedPrevRef.current !== undefined ? String(capturedPrevRef.current) : null
      if (!text) return
      const finalText = String(current)
      const el = ref.current
      const runId = beginAnimationRun(el)
      const spans = appendCharSpans(el, text)
      const stagger = 40
      const totalDuration = motionDuration + (spans.length - 1) * stagger + 50

      spans.forEach((span, i) => {
        span.animate(
          [
            { opacity: 1, filter: "blur(0px)" },
            { opacity: 0, filter: "blur(2px)" },
          ],
          { duration: motionDuration, delay: i * stagger, fill: "forwards", easing: EASE_OUT },
        )
      })

      const trackAnim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: totalDuration, fill: "forwards" })
      const cleanup = () => {
        if (!isActiveAnimationRun(el, runId)) return
        el.textContent = finalText
      }
      trackAnim.onfinish = () => { cleanup(); onAnimationEnd?.() }
      trackAnim.oncancel = cleanup
      animRef.current = trackAnim
      return
    }

    if (animation === "fadeIn") {
      const text = String(current)
      if (!text) return
      const el = ref.current
      const runId = beginAnimationRun(el)
      const spans = appendCharSpans(el, text, (span) => {
        span.style.opacity = "0"
        span.style.filter = "blur(2px)"
      })
      const stagger = 40
      const totalDuration = motionDuration + (spans.length - 1) * stagger + 50

      spans.forEach((span, i) => {
        span.animate(
          [
            { opacity: 0, filter: "blur(2px)" },
            { opacity: 1, filter: "blur(0px)" },
          ],
          { duration: motionDuration, delay: (spans.length - 1 - i) * stagger, fill: "forwards", easing: SPRING },
        )
      })

      const trackAnim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: totalDuration, fill: "forwards" })
      const cleanup = () => {
        if (!isActiveAnimationRun(el, runId)) return
        el.textContent = text
      }
      trackAnim.onfinish = () => { cleanup(); onAnimationEnd?.() }
      trackAnim.oncancel = cleanup
      animRef.current = trackAnim
      return
    }

    if (animation === "slideReplace") {
      const old = capturedPrevRef.current !== undefined ? String(capturedPrevRef.current) : null
      const next = String(current)
      if (!old || !next) return

      const el = ref.current
      const runId = beginAnimationRun(el)
      const { oldEl, newEl, cleanup } = prepareStableTextSwap(el, old, next, runId)
      newEl.style.transform = "translateX(100%)"

      const line = document.createElement("span")
      line.style.position = "absolute"
      line.style.bottom = "0"
      line.style.left = "0"
      line.style.width = "100%"
      line.style.height = "2px"
      line.style.background = "currentColor"
      line.style.transform = "scaleX(0)"
      line.style.transformOrigin = "0% 50%"

      el.appendChild(line)

      const outDuration = motionDuration * 0.45
      const inDuration = motionDuration * 0.55
      const lineDuration = motionDuration * 0.65

      oldEl.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-100%)" }],
        { duration: outDuration, easing: EASE_IN, fill: "forwards" },
      )

      const anim = newEl.animate(
        [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }],
        { duration: inDuration, easing: SPRING, fill: "forwards" },
      )

      line.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: lineDuration, easing: EASE_IN_OUT, fill: "forwards" },
      )

      animRef.current = anim
      anim.onfinish = () => {
        animRef.current = null
        if (el) {
          const line = el.querySelector("span:last-child")
          if (line) line.remove()
          cleanup()
        }
        onAnimationEnd?.()
      }
      anim.oncancel = cleanup

      return
    }

    if (animation === "letterDrop") {
      const text = String(current)
      if (!text) return

      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)
      const spans = appendCharSpans(el, text, (span) => {
        span.style.willChange = "transform, opacity"
      })
      const stagger = Math.max(18, Math.min(45, motionDuration * 0.08))
      const last = spans.length > 0 ? spans.length - 1 : 0

      spans.forEach((span, i) => {
        const anim = span.animate(
          [
            { transform: "translateY(-24px)", opacity: 0 },
            { transform: "translateY(2px)", opacity: 1, offset: 0.78 },
            { transform: "translateY(0)" },
          ],
          { duration: motionDuration, delay: i * stagger, fill: "forwards", easing: SPRING },
        )
        anim.oncancel = () => {
          if (!isActiveAnimationRun(el, runId)) return
          spans.forEach((item) => { item.style.willChange = "auto" })
          el.textContent = text
        }
        if (i === last) {
          anim.onfinish = () => {
            if (!isActiveAnimationRun(el, runId)) return
            spans.forEach((item) => { item.style.willChange = "auto" })
            el.textContent = text
            onAnimationEnd?.()
          }
        }
      })

      return
    }

    if (animation === "glitch") {
      const text = String(current)
      if (!text) return

      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)

      const glitched = [1, 2, 3, 4, 5].map((i) => `${i}px ${i}px`).join(", ")
      const clean = [0, 0, 0, 0, 0].map(() => "0px 0px").join(", ")

      const anim = el.animate(
        [
          { textShadow: glitched, transform: "translate(-6px, -6px) skewX(-2deg)" },
          { textShadow: clean, transform: "translate(0, 0) skewX(0deg)" },
        ],
        { duration: motionDuration, easing: EASE_IN_OUT, fill: "forwards" },
      )

      animRef.current = anim
      const cleanup = () => {
        if (!isActiveAnimationRun(el, runId)) return
        el.style.textShadow = ""
        el.style.transform = ""
        animRef.current = null
      }
      anim.onfinish = () => {
        cleanup()
        onAnimationEnd?.()
      }
      anim.oncancel = cleanup

      return
    }

    if (animation === "textReveal") {
      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)
      const previousPosition = el.style.position
      const previousOverflow = el.style.overflow

      const curtainColor = getComputedStyle(el).backgroundColor
      const curtain = document.createElement("div")
      curtain.style.position = "absolute"
      curtain.style.top = "0"
      curtain.style.left = "0"
      curtain.style.width = "100%"
      curtain.style.height = "100%"
      curtain.style.background = curtainColor !== "rgba(0, 0, 0, 0)" && curtainColor !== "transparent" ? curtainColor : "currentColor"
      curtain.style.transform = "translateX(-100%)"
      curtain.style.pointerEvents = "none"

      el.style.position = "relative"
      el.style.overflow = "hidden"
      el.appendChild(curtain)

      const anim = curtain.animate(
        [{ transform: "translateX(-100%)" }, { transform: "translateX(100%)" }],
        { duration: motionDuration, easing: EASE_IN_OUT, fill: "forwards" },
      )

      const cleanup = () => {
        if (!isActiveAnimationRun(el, runId)) return
        curtain.remove()
        el.style.position = previousPosition
        el.style.overflow = previousOverflow
        animRef.current = null
      }

      animRef.current = anim
      anim.onfinish = () => {
        cleanup()
        onAnimationEnd?.()
      }
      anim.oncancel = cleanup

      return
    }

    if (animation === "liftReveal") {
      const oldText = capturedPrevRef.current !== undefined ? String(capturedPrevRef.current) : null
      const newText = String(current)
      if (!oldText) return

      const el = ref.current
      const runId = beginAnimationRun(el)
      const { oldEl: top, newEl: bottom, cleanup } = prepareStableTextSwap(el, oldText, newText, runId)
      bottom.style.transform = "translateY(100%)"
      top.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }],
        { duration: motionDuration, easing, fill: "forwards" },
      )

      const anim = bottom.animate(
        [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
        { duration: motionDuration, easing, fill: "forwards" },
      )

      animRef.current = anim
      anim.onfinish = () => {
        animRef.current = null
        cleanup()
        onAnimationEnd?.()
      }
      anim.oncancel = cleanup

      return
    }

    if (animation === "scatter") {
      const text = String(current)
      if (!text) return

      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)
      const spans = appendCharSpans(el, text)
      const order = spans.map((_, i) => i).sort(() => Math.random() - 0.5)
      const staggerGap = motionDuration / spans.length
      let remaining = spans.length

      if (remaining === 0) {
        onAnimationEnd?.()
        return
      }

      spans.forEach((span, i) => {
        const anim = span.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: motionDuration, delay: order[i] * staggerGap, fill: "forwards" },
        )
        anim.oncancel = () => {
          if (!isActiveAnimationRun(el, runId)) return
          el.textContent = text
        }
        anim.onfinish = () => {
          remaining -= 1
          if (remaining === 0) {
            if (!isActiveAnimationRun(el, runId)) return
            el.textContent = text
            onAnimationEnd?.()
          }
        }
      })

      return
    }

    if (animation === "typewriter") {
      const text = String(current)
      if (!text) return

      const numChars = text.length || 1
      const el = ref.current
      const runId = beginAnimationRun(el)
      const measure = measureInlineText(el, text)
      const origDisplay = el.style.display

      el.style.display = "inline-flex"
      el.textContent = ""

      const textSpan = document.createElement("span")
      textSpan.textContent = text
      textSpan.style.overflow = "hidden"
      textSpan.style.whiteSpace = "nowrap"
      textSpan.style.width = "0"
      textSpan.style.willChange = "width"

      const cursor = document.createElement("span")
      cursor.textContent = "|"
      cursor.style.display = "inline-block"
      cursor.style.fontWeight = "100"
      cursor.style.marginLeft = "1px"
      cursor.style.opacity = "0"

      el.appendChild(textSpan)
      el.appendChild(cursor)

      const revealAnim = textSpan.animate(
        [{ width: "0" }, { width: `${measure.width}px` }],
        { duration: motionDuration, easing: `steps(${numChars}, end)`, fill: "forwards" },
      )

      const showCursor = () => { cursor.style.opacity = "1" }
      const firstCharTime = Math.max(1, motionDuration / numChars)
      const showTimer = setTimeout(showCursor, firstCharTime)

      const cursorBlink = cursor.animate(
        [
          { opacity: 1, offset: 0 },
          { opacity: 0.3, offset: 0.5 },
          { opacity: 1, offset: 1 },
        ],
        { duration: 500, iterations: Infinity },
      )

      const finish = () => {
        clearTimeout(showTimer)
        cursorBlink.cancel()
        cursor.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" })
      }

      const cleanup = () => {
        if (!isActiveAnimationRun(el, runId)) return
        finish()
        el.textContent = text
        el.style.display = origDisplay
      }

      animRef.current = revealAnim
      revealAnim.onfinish = () => {
        animRef.current = null
        finish()
        setTimeout(() => {
          if (animRef.current) return
          el.textContent = text
          el.style.display = origDisplay
          onAnimationEnd?.()
        }, 150)
      }
      revealAnim.oncancel = cleanup

      return
    }

    if (animation === "splash") {
      const text = String(current)
      if (!text) return

      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)
      const spans = appendCharSpans(el, text)
      let remaining = spans.length

      if (remaining === 0) {
        onAnimationEnd?.()
        return
      }

      spans.forEach((span, i) => {
        const x = (Math.random() - 0.5) * 32
        const y = (Math.random() - 0.5) * 32
        const r = (Math.random() - 0.5) * 8

        const anim = span.animate(
          [
            { transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, opacity: 0 },
            { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          ],
          {
            duration: motionDuration * 0.8,
            delay: Math.random() * motionDuration * 0.3,
            fill: "forwards",
            easing: EASE_IN,
          },
        )
        anim.oncancel = () => {
          if (!isActiveAnimationRun(el, runId)) return
          el.textContent = text
        }
        anim.onfinish = () => {
          remaining -= 1
          if (remaining === 0) {
            if (!isActiveAnimationRun(el, runId)) return
            el.textContent = text
            onAnimationEnd?.()
          }
        }
      })

      return
    }

    if (animation === "jitter") {
      const text = String(current)
      if (!text) return

      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)
      const spans = appendCharSpans(el, text)
      let remaining = spans.length

      if (remaining === 0) {
        onAnimationEnd?.()
        return
      }

      spans.forEach((span, i) => {
        const x = (Math.random() - 0.5) * 8
        const y = (Math.random() - 0.5) * 8
        const r = (Math.random() - 0.5) * 12

        const anim = span.animate(
          [
            { transform: "translate(0, 0) rotate(0deg)" },
            { transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, offset: 0.15 },
            { transform: `translate(${-x * 0.6}px, ${-y * 0.6}px) rotate(${-r * 0.6}deg)`, offset: 0.35 },
            { transform: `translate(${x * 0.3}px, ${y * 0.3}px) rotate(${r * 0.3}deg)`, offset: 0.55 },
            { transform: `translate(${-x * 0.1}px, ${-y * 0.1}px) rotate(${-r * 0.1}deg)`, offset: 0.75 },
            { transform: "translate(0, 0) rotate(0deg)" },
          ],
          {
            duration: motionDuration * 0.6,
            delay: Math.random() * motionDuration * 0.2,
            fill: "forwards",
            easing: EASE_IN_OUT,
          },
        )
        anim.oncancel = () => {
          if (!isActiveAnimationRun(el, runId)) return
          el.textContent = text
        }
        anim.onfinish = () => {
          remaining -= 1
          if (remaining === 0) {
            if (!isActiveAnimationRun(el, runId)) return
            el.textContent = text
            onAnimationEnd?.()
          }
        }
      })

      return
    }

    if (animation === "popUp") {
      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)
      const computedColor = getComputedStyle(el).color
      const shadows = Array.from({ length: 9 }, (_, i) => `0 ${i + 1}px 0 ${computedColor}`).join(", ")
      const anim = el.animate(
        [
          { transform: "translateY(0)", textShadow: "none" },
          { transform: "translateY(-14px)", textShadow: `${shadows}, 0 14px 16px rgba(0,0,0,0.2)`, offset: 0.55 },
          { transform: "translateY(0)", textShadow: "none" },
        ],
        { duration: motionDuration, easing: SPRING },
      )
      const cleanup = () => {
        if (!isActiveAnimationRun(el, runId)) return
        el.style.textShadow = ""
        el.style.willChange = ""
        animRef.current = null
      }
      animRef.current = anim
      anim.onfinish = () => { cleanup(); onAnimationEnd?.() }
      anim.oncancel = cleanup
      return
    }

    if (animation === "jello") {
      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const el = ref.current
      const runId = beginAnimationRun(el)
      const anim = el.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.08, 0.94)", offset: 0.167 },
          { transform: "scale(0.96, 1.06)", offset: 0.333 },
          { transform: "scale(1.04, 0.97)", offset: 0.5 },
          { transform: "scale(0.98, 1.02)", offset: 0.667 },
          { transform: "scale(1.02, 0.99)", offset: 0.833 },
          { transform: "scale(1, 1)" },
        ],
        { duration: motionDuration, easing: SPRING },
      )
      const cleanup = () => {
        if (!isActiveAnimationRun(el, runId)) return
        el.style.willChange = ""
        animRef.current = null
      }
      animRef.current = anim
      anim.onfinish = () => { cleanup(); onAnimationEnd?.() }
      anim.oncancel = cleanup
      return
    }

    if (animation === "scramble") {
      const text = String(current)
      if (!text) return

      if (prefersReducedMotion()) {
        const el = ref.current!
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" })
        anim.onfinish = () => onAnimationEnd?.()
        return
      }

      const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`¡™£¢∞§¶•ªº–≠åß∂ƒ©˙∆˚¬…æ≈ç√∫˜µ≤≥÷/░▒▓<>"
      const el = ref.current
      const runId = beginAnimationRun(el)

      const finalChars: string[] = []
      const spans = appendCharSpans(el, text, (span, char) => {
        finalChars.push(char)
        span.style.willChange = "transform, opacity"
      })
      const stepMs = 42
      const totalMs = Math.max(280, Math.min(motionDuration + spans.length * 20, stepMs * Math.max(7, spans.length)))
      const startTime = performance.now()

      function tick(now: number) {
        if (!isActiveAnimationRun(el, runId)) return
        const elapsed = now - startTime
        if (elapsed >= totalMs) {
          spans.forEach((span, i) => {
            span.textContent = finalChars[i]
            span.style.willChange = "auto"
          })
          el.textContent = text
          rafRef.current = null
          onAnimationEnd?.()
          return
        }
        const progress = elapsed / totalMs
        const randomizeThisFrame = Math.floor(elapsed / stepMs) % 2 === 0
        spans.forEach((span, i) => {
          const resolveAt = (i / Math.max(1, spans.length)) * 0.72
          if (progress >= resolveAt) {
            span.textContent = finalChars[i]
          } else if (randomizeThisFrame) {
            span.textContent = chars[Math.floor(Math.random() * chars.length)]
          }
        })
        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
      return
    }

    if (animation === "wave") {
      const text = String(current)
      if (!text) return
      if (prefersReducedMotion()) {
    const anim = ref.current.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: motionDuration / 2, easing: SPRING, fill: "forwards" },
    )
  animRef.current = anim
  anim.onfinish = () => { ref.current!.style.textShadow = ""; animRef.current = null; onAnimationEnd?.() }
        return
      }

      const spans = appendCharSpans(ref.current, text)
      const stagger = Math.max(45, Math.min(90, motionDuration * 0.08))
      const last = spans.length > 0 ? spans.length - 1 : 0
      spans.forEach((span, i) => {
        const anim = span.animate(
          [
            { transform: "translateY(0)", opacity: 1 },
            { transform: "translateY(-10px)", opacity: 1, offset: 0.5 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: Math.max(520, motionDuration), delay: i * stagger, iterations: 1, easing: SMOOTH },
        )
        if (i === 0) animRef.current = anim
        if (i === last) anim.onfinish = () => {
          ref.current!.textContent = text
          onAnimationEnd?.()
        }
      })
      return
    }

    if (animation === "strikeThrough") {
      const oldText = capturedPrevRef.current !== undefined ? String(capturedPrevRef.current) : null
      const newText = String(current)
      if (!oldText || !newText) return
      const el = ref.current
      const runId = beginAnimationRun(el)
      reserveStableTextSize(el, oldText, newText)

      const fontSize = Number.parseFloat(getComputedStyle(el).fontSize) || 16
      const lineThickness = Math.max(3, Math.round(fontSize * 0.12))

      const oldSpan = document.createElement("span")
      oldSpan.textContent = oldText
      oldSpan.style.display = "inline-block"
      oldSpan.style.position = "relative"
      oldSpan.style.whiteSpace = "pre"

      const line = document.createElement("span")
      line.style.position = "absolute"
      line.style.left = "0"
      line.style.top = "50%"
      line.style.width = "100%"
      line.style.height = `${lineThickness}px`
      line.style.marginTop = `${-Math.round(lineThickness / 2)}px`
      line.style.background = "currentColor"
      line.style.borderRadius = "2px"
      line.style.transform = "scaleX(0)"
      line.style.transformOrigin = "0% 50%"

      oldSpan.appendChild(line)
      el.textContent = ""
      el.appendChild(oldSpan)

      const drawTime = motionDuration * 0.35
      const crossfadeTime = motionDuration * 0.65

      line.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: drawTime, easing: SMOOTH, fill: "forwards" },
      )

      const newSpan = document.createElement("span")
      newSpan.textContent = newText
      newSpan.style.display = "inline-block"
      newSpan.style.whiteSpace = "pre"
      newSpan.style.position = "absolute"
      newSpan.style.left = "0"
      newSpan.style.top = "0"
      newSpan.style.opacity = "0"
      el.appendChild(newSpan)

      oldSpan.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: crossfadeTime, delay: drawTime, easing: EASE_IN, fill: "forwards" },
      )

      const fadeIn = newSpan.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: crossfadeTime, delay: drawTime, easing: SPRING, fill: "forwards" },
      )

      const trackAnim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: drawTime + crossfadeTime + 50, fill: "forwards" })
      animRef.current = trackAnim

      fadeIn.onfinish = () => {
        el.textContent = newText
        animRef.current = null
        onAnimationEnd?.()
      }
      trackAnim.oncancel = () => {
        if (!isActiveAnimationRun(el, runId)) return
        el.textContent = newText
      }

      return
    }

    if (animation === "odometer") {
      const text = String(current)
      if (!text) return
      const inners = appendRollingCharSlots(ref.current, text)
      const stagger = 40
      inners.forEach((s, i) => {
        s.animate(
          [
            { transform: "translateY(-100%)", opacity: 0 },
            { transform: "translateY(4px)", opacity: 1, offset: 0.7 },
            { transform: "translateY(0)" },
          ],
          { duration: motionDuration * 0.5, delay: i * stagger, fill: "forwards", easing: SPRING },
        )
      })
      const t = setTimeout(() => {
        ref.current!.textContent = text
        onAnimationEnd?.()
      }, motionDuration * 0.5 + inners.length * stagger + 50)
      timerRef.current = t
      return
    }

    if (animation === "ticker") {
      const text = String(current)
      if (!text) return
      const inners = appendRollingCharSlots(ref.current, text)
      const stagger = 30
      inners.forEach((s, i) => {
        s.animate(
          [{ transform: "translateY(100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
          { duration: motionDuration * 0.6, delay: i * stagger, fill: "forwards", easing: SPRING },
        )
      })
      const t = setTimeout(() => {
        ref.current!.textContent = text
        onAnimationEnd?.()
      }, motionDuration * 0.6 + inners.length * stagger + 50)
      timerRef.current = t
      return
    }

    if (animation === "fadeSwap") {
      const oldText = effectivePrev !== undefined ? String(effectivePrev) : ""
      const newText = String(current)
      if (!oldText && !newText) return

      const el = ref.current
      const runId = beginAnimationRun(el)
      const { oldEl, newEl, cleanup } = prepareStableTextSwap(el, oldText, newText, runId)
      oldEl.style.opacity = "1"
      oldEl.style.transform = "translateY(0)"
      oldEl.style.filter = "blur(0px)"
      oldEl.style.willChange = "transform, opacity, filter"
      newEl.style.opacity = "0"
      newEl.style.transform = "translateY(0.16em)"
      newEl.style.filter = "blur(1.8px)"
      newEl.style.willChange = "transform, opacity, filter"

      const outDuration = motionDuration * 0.42
      const inDelay = Math.min(80, Math.max(30, motionDuration * 0.12))
      const inDuration = motionDuration * 0.62
      const totalDuration = Math.max(outDuration, inDelay + inDuration)

      oldEl.animate(
        [
          { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" },
          { opacity: 0.72, transform: "translateY(-0.04em)", filter: "blur(0.35px)", offset: 0.58 },
          { opacity: 0, transform: "translateY(-0.14em)", filter: "blur(1.5px)" },
        ],
        { duration: outDuration, easing: SMOOTH, fill: "forwards" },
      )

      newEl.animate(
        [
          { opacity: 0, transform: "translateY(0.16em)", filter: "blur(1.8px)" },
          { opacity: 0.78, transform: "translateY(0.025em)", filter: "blur(0.35px)", offset: 0.55 },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" },
        ],
        { duration: inDuration, delay: inDelay, easing: SMOOTH, fill: "forwards" },
      )

      const anim = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: totalDuration, fill: "forwards" })
      animRef.current = anim
      anim.onfinish = () => {
        animRef.current = null
        cleanup()
        onAnimationEnd?.()
      }
      anim.oncancel = cleanup

      return
    }

    if (animation === "highlight") {
      const hlEl = ref.current
      const hlRunId = beginAnimationRun(hlEl)
      const hlColor = highlightColorProp ?? colorWithAlpha(getComputedStyle(hlEl).color, 0.55)
      const hlDuration = motionDuration

      hlEl.style.background = `linear-gradient(120deg, ${hlColor} 50%, transparent 50%)`
      hlEl.style.backgroundSize = "200% 100%"
      hlEl.style.backgroundRepeat = "no-repeat"
      hlEl.style.backgroundPosition = "100% 0"
      hlEl.style.willChange = "transform, opacity"

      const anim = hlEl.animate(
        [
          { backgroundPosition: "100% 0" },
          { backgroundPosition: "0% 0" },
        ],
        { duration: hlDuration, easing: SMOOTH, fill: "forwards", delay },
      )

      animRef.current = anim
      anim.onfinish = () => {
        if (!isActiveAnimationRun(hlEl, hlRunId)) return
        animRef.current = null
        hlEl.style.background = ""
        hlEl.style.backgroundSize = ""
        hlEl.style.backgroundRepeat = ""
        hlEl.style.backgroundPosition = ""
        hlEl.style.willChange = "auto"
        onAnimationEnd?.()
      }
      anim.oncancel = () => {
        hlEl.style.willChange = "auto"
      }
      return
    }

    const iterations = undefined
    const anim = runAnimation(
      ref.current,
      animation,
      {
        duration: motionDuration,
        easing,
        delay,
        iterations,
      },
      activeTrigger === "change" ? "change" : "single",
      effectivePrev,
      current,
      highlightColorProp,
    )
    animRef.current = anim
    anim.onfinish = () => {
      animRef.current = null
      onAnimationEnd?.()
    }
  }, [activeTrigger, animation, currentRun, delay, duration, easing, finishRun, properties, value, watchedCurrent])

  if (phase === "exited" && unmountOnExit !== false) {
    return null
  }

  return createElement(
    as,
    {
      ref,
      className,
      style,
      onClick: hasTrigger("click") || onClick ? handleClick : undefined,
      onMouseEnter: hasTrigger("hover") || onHoverStart ? handleMouseEnter : undefined,
      onMouseLeave: onHoverEnd ? handleMouseLeave : undefined,
    },
    children,
  )
})

export { AnimateText }
export const Animate = { Text: AnimateText }
export default Animate
