import { useRef, useEffect, useLayoutEffect, useState, createElement, forwardRef, useCallback, useImperativeHandle, useMemo } from "react"
import type { MouseEvent } from "react"
import type { AnimateBlockHandle, AnimateBlockProps, AnimationProperties, AnimationTrigger } from "./types"
import { SMOOTH, SNAPPY, SPRING, presetCategory, presets } from "./animations"
import { Parallax } from "./parallax"

const warned = new Set<string>()

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

function finishWillChange(el: HTMLElement) {
  el.style.willChange = "auto"
}

function validDuration(value: unknown, fallback = 300): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function effectiveDuration(duration: number): number {
  const d = validDuration(duration, 300)
  return prefersReducedMotion() ? d / 2 : d
}

function cancelElementAnimations(el: HTMLElement) {
  el.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())
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

function scrollCenterOffset(el: HTMLElement, root: HTMLElement | null): number {
  const rect = el.getBoundingClientRect()
  const rootRect = root?.getBoundingClientRect()
  const viewTop = rootRect?.top ?? 0
  const viewHeight = rootRect?.height ?? window.innerHeight
  const viewCenter = viewTop + viewHeight / 2
  const elCenter = rect.top + rect.height / 2
  return (elCenter - viewCenter) / Math.max(viewHeight, 1)
}

const HOVER_STATE_CSS: Record<string, Record<string, string>> = {
  lift: { transform: "translateY(-4px)" },
  sink: { transform: "translateY(4px)" },
  grow: { transform: "scale(1.03)" },
  glow: { filter: "brightness(1.15)" },
  shadow: { boxShadow: "0 8px 24px currentColor" },
  borderPop: { borderColor: "currentColor", borderWidth: "2px" },
}

const CONTINUOUS_KEYFRAMES: Record<string, { keyframes: Keyframe[]; duration: number; easing: string }> = {
  pulse: {
    keyframes: [
      { transform: "scale(1)" },
      { transform: "scale(1.05)", offset: 0.5 },
      { transform: "scale(1)" },
    ],
    duration: 2000,
    easing: SMOOTH,
  },
  float: {
    keyframes: [
      { transform: "translateY(0)" },
      { transform: "translateY(-5px)", offset: 0.5 },
      { transform: "translateY(0)" },
    ],
    duration: 1500,
    easing: SMOOTH,
  },
  spin: {
    keyframes: [
      { transform: "rotate(0deg)" },
      { transform: "rotate(360deg)" },
    ],
    duration: 2000,
    easing: "linear",
  },
  ping: {
    keyframes: [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.15)", opacity: 0 },
    ],
    duration: 1500,
    easing: SMOOTH,
  },
  shimmer: {
    keyframes: [
      { backgroundPosition: "-200% 0" },
      { backgroundPosition: "200% 0" },
    ],
    duration: 2500,
    easing: "linear",
  },
}

function hasScale(kf: Keyframe[]): boolean {
  return kf.some((k) => {
    const t = (k as any).transform as string | undefined
    return t ? /\bscalef?[a-zA-Z]*\(/.test(t) : false
  })
}

// Apply first keyframe as inline styles to prevent flash during cancel→restart transitions
function applyInitialState(el: HTMLElement, keyframes: Keyframe[]) {
  const first = keyframes[0]
  if (!first) return
  if ((first as any).opacity !== undefined) el.style.opacity = String((first as any).opacity)
  if ((first as any).transform !== undefined) el.style.transform = String((first as any).transform)
}

// Apply last keyframe as inline styles to capture final state after animation finishes
function applyFinalState(el: HTMLElement, keyframes: Keyframe[]) {
  const last = keyframes[keyframes.length - 1]
  if (!last) return
  if ((last as any).opacity !== undefined) el.style.opacity = String((last as any).opacity)
  if ((last as any).transform !== undefined) el.style.transform = String((last as any).transform)
}

function runAnimation(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  onEnd?: () => void,
): Animation {
  el.style.willChange = "transform, opacity"
  const prevTransition = el.style.transition
  el.style.transition = "none"
  const usesScale = hasScale(keyframes)
  const prevOrigin = el.style.transformOrigin
  if (usesScale) el.style.transformOrigin = "center"

  // Always set initial state inline — prevents flash when animations are cancelled/restarted
  applyInitialState(el, keyframes)

  const kf = prefersReducedMotion()
    ? keyframes.map(({ opacity }) => ({ opacity: opacity ?? 1 }))
    : keyframes
  const anim = el.animate(kf, { ...options, fill: "forwards" })
  const cleanup = () => {
    el.style.transition = prevTransition
    if (usesScale) el.style.transformOrigin = prevOrigin
  }
  anim.addEventListener("finish", () => {
    applyFinalState(el, keyframes)
    finishWillChange(el)
    cleanup()
    onEnd?.()
  })
  anim.addEventListener("cancel", () => {
    cleanup()
  })
  return anim
}

function setStyles(el: HTMLElement, styles: Record<string, string>) {
  for (const key in styles) {
    (el.style as any)[key] = styles[key]
  }
}

function clearStyles(el: HTMLElement, styles: Record<string, string>) {
  for (const key in styles) {
    (el.style as any)[key] = ""
  }
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

function spawnOverlay(el: HTMLElement, preset: string, x: number, y: number) {
  const rect = el.getBoundingClientRect()
  const px = x - rect.left
  const py = y - rect.top
  const prevPosition = el.style.position
  const prevOverflow = el.style.overflow

  el.style.position = "relative"
  el.style.overflow = "hidden"

  const overlayColor = getComputedStyle(el).getPropertyValue("--trigr-overlay-color") || "currentColor"

  let pending = 0
  function done() {
    pending -= 1
    if (pending <= 0) {
      el.style.position = prevPosition
      el.style.overflow = prevOverflow
    }
  }

  if (preset === "ripple") {
    pending = 1
    const size = Math.max(rect.width, rect.height) * 2.5
    const dot = document.createElement("span")
    dot.style.cssText = `
      position: absolute; left: ${px}px; top: ${py}px; width: 0; height: 0;
      border-radius: 50%; background: ${overlayColor};
      transform: translate(-50%, -50%); pointer-events: none;
      opacity: 1;
    `
    el.appendChild(dot)
    dot.animate(
      [{ width: "0", height: "0", opacity: 1 }, { width: `${size}px`, height: `${size}px`, opacity: 0 }],
      { duration: 400, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", fill: "forwards" },
    ).onfinish = () => { dot.remove(); done() }
  }

  if (preset === "burst") {
    pending = 8
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const particle = document.createElement("span")
      particle.style.cssText = `
        position: absolute; left: ${px}px; top: ${py}px; width: 6px; height: 6px;
        border-radius: 50%; background: ${overlayColor};
        pointer-events: none; transform: translate(-50%, -50%);
      `
      el.appendChild(particle)
      const dx = Math.cos(angle) * 60
      const dy = Math.sin(angle) * 60
      particle.animate(
        [
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 },
        ],
        { duration: 360, easing: "cubic-bezier(0.4, 0.0, 1, 1)", fill: "forwards" },
      ).onfinish = () => { particle.remove(); done() }
    }
  }
}

const AnimateBlock = forwardRef<AnimateBlockHandle, AnimateBlockProps>(function AnimateBlock({
  value,
  triggers: triggersProp,
  trigger = "change",
  animation: baseAnimation,
  scrollAnimation,
  properties,
  exitAnimation,
  show,
  unmountOnExit = true,
  duration = 400,
  easing = SPRING,
  delay = 0,
  speed = 0.5,
  threshold = 0.4,
  repeat = false,
  once,
  as = "div",
  className,
  style,
  onClick,
  onEnter,
  onExit,
  onHoverStart,
  onHoverEnd,
  onAnimationEnd: onAnimationEndProp,
  children,
}: AnimateBlockProps, forwardedRef) {
  const ref = useRef<HTMLElement>(null)
  const animRef = useRef<Animation | null>(null)
  const propertyAnimRef = useRef<Animation | null>(null)
  const rafRef = useRef<number | null>(null)
  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevValueRef = useRef<string | number | undefined>(value)
  const hoverApplied = useRef(false)
  const runningRef = useRef(false)
  const queueRef = useRef<AnimationTrigger[]>([])
  const runIdRef = useRef(0)
  const [currentRun, setCurrentRun] = useState<{ id: number; source: AnimationTrigger } | null>(null)
  const [phase, setPhase] = useState<"entered" | "exiting" | "exited">(
    show !== false ? "entered" : "exited"
  )
  const exitAnimRef = useRef<Animation | null>(null)
  const exitKeyRef = useRef(0)
  const mountPlayedRef = useRef(false)
  const scrollTriggeredRef = useRef(false)
  const shouldObserveOnce = once ?? !repeat
  const triggerConfigs = useMemo(() => {
    if (triggersProp) {
      return triggersProp.map(tc => ({
        trigger: tc.trigger as AnimationTrigger,
        animation: tc.animation,
        threshold: tc.threshold ?? threshold,
      }))
    }
    const sources = (Array.isArray(trigger) ? trigger.slice(0, 2) : [trigger]) as AnimationTrigger[]
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

  const hasTrigger = useCallback((source: AnimationTrigger) => triggerSources.includes(source), [triggerSources])
  const activeTrigger = currentRun?.source ?? triggerSources[0] ?? "change"
  const activeConfig = triggerConfigs.find(tc => tc.trigger === activeTrigger)
  const animation = activeConfig?.animation ?? baseAnimation
  const cat = presetCategory[animation] ?? "oneshot"
  const scrollConfig = triggerConfigs.find(tc => tc.trigger === "scroll")
  const scrollThreshold = scrollConfig?.threshold ?? threshold

  const getAnimationFor = useCallback(
    (source: AnimationTrigger) => {
      const cfg = triggerConfigs.find(tc => tc.trigger === source)
      return cfg?.animation ?? baseAnimation
    },
    [triggerConfigs, baseAnimation],
  )

  const finishRun = useCallback(() => {
    if (runTimerRef.current !== null) {
      clearTimeout(runTimerRef.current)
      runTimerRef.current = null
    }
    runningRef.current = false
    onAnimationEndProp?.()
    const next = queueRef.current.shift()
    if (next) {
      runningRef.current = true
      setCurrentRun({ id: ++runIdRef.current, source: next })
    } else {
      setCurrentRun(null)
    }
  }, [onAnimationEndProp])

  const requestRun = useCallback((source: AnimationTrigger) => {
    if (runningRef.current) {
      if (source !== "scroll") queueRef.current = [...queueRef.current, source].slice(-2)
      return
    }
    runningRef.current = true
    setCurrentRun({ id: ++runIdRef.current, source })
  }, [])

  const play = useCallback((source: AnimationTrigger = activeTrigger, presetName?: string) => {
    const el = ref.current
    if (!el) {
      finishRun()
      return
    }
    const name = presetName ?? getAnimationFor(source)

    cancelElementAnimations(el)
    animRef.current = null
    propertyAnimRef.current = null
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    if (runTimerRef.current !== null) {
      clearTimeout(runTimerRef.current)
      runTimerRef.current = null
    }

    const motionDuration = effectiveDuration(duration)
    const category = presetCategory[name] ?? "oneshot"
    propertyAnimRef.current = runPropertyAnimation(el, properties, {
      duration: motionDuration,
      easing,
      delay,
    })

    // Save and clear hoverState inline styles so the animation starts from a clean position
    const savedHoverStyles: Record<string, string> = {}
    if (hoverApplied.current) {
      const hoverStyleDef = HOVER_STATE_CSS[name]
      if (hoverStyleDef) {
        for (const key in hoverStyleDef) {
          savedHoverStyles[key] = (el.style as any)[key]
          ;(el.style as any)[key] = ""
        }
      }
    }

    function restoreHover() {
      if (hoverApplied.current) {
        for (const key in savedHoverStyles) {
          (el!.style as any)[key] = savedHoverStyles[key]
        }
      }
    }

    if (category === "overlay" || category === "hoverState" || category === "cursorTrack") {
      finishRun()
      return
    }

    if (category === "continuous") {
      const cfg = CONTINUOUS_KEYFRAMES[name]
      if (!cfg || prefersReducedMotion()) {
        finishRun()
        return
      }
      const loopDuration = Math.max(360, cfg.duration)
      animRef.current = runAnimation(
        el,
        cfg.keyframes,
        { duration: loopDuration, easing: cfg.easing, delay, iterations: 1, fill: "forwards" },
        finishRun,
      )
      if (Object.keys(savedHoverStyles).length) {
        animRef.current.addEventListener("finish", restoreHover, { once: true })
        animRef.current.addEventListener("cancel", restoreHover, { once: true })
      }
      runTimerRef.current = setTimeout(finishRun, loopDuration + delay + 80)
      return
    }

    const def = presets[name]
    if (!def) {
      if (!warned.has(name)) {
        warned.add(name)
        if (process.env.NODE_ENV === "development") {
          console.warn(`[trigr] Unknown block animation preset "${name}". Expected one of: ${Object.keys(presets).join(", ")}`)
        }
      }
      finishRun()
      return
    }

    const animationEasing = name === "press" ? SNAPPY : easing
    runTimerRef.current = setTimeout(finishRun, Math.max(500, motionDuration + delay + 300))
    animRef.current = runAnimation(el, def.in, { duration: motionDuration, easing: animationEasing, delay }, finishRun)

    if (Object.keys(savedHoverStyles).length) {
      animRef.current.addEventListener("finish", restoreHover, { once: true })
      animRef.current.addEventListener("cancel", restoreHover, { once: true })
    }

    // press: reset transform after quick scale down
    if (name === "press") {
      animRef.current.addEventListener("finish", () => {
        el.animate([{ transform: "scale(1)" }, { transform: "scale(1)" }], { duration: 80, fill: "forwards" })
      }, { once: true })
    }
  }, [activeTrigger, delay, duration, easing, finishRun, getAnimationFor, properties])

  const animate = useCallback(() => {
    requestRun("manual")
  }, [requestRun])

  useImperativeHandle(forwardedRef, () => ({
    animate,
    get element() {
      return ref.current
    },
  }), [animate])

  // scroll trigger (IntersectionObserver)
  useEffect(() => {
    const scrollName = getAnimationFor("scroll")
    const scrollCat = presetCategory[scrollName] ?? "oneshot"
    if (!hasTrigger("scroll") || scrollCat !== "oneshot") return
    const el = ref.current
    if (!el) return

    scrollTriggeredRef.current = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          scrollTriggeredRef.current = false
          if (repeat) onExit?.()
          return
        }
        if (scrollTriggeredRef.current) return
        scrollTriggeredRef.current = true
        onEnter?.()
        requestRun("scroll")
        if (shouldObserveOnce) observer.disconnect()
      },
      scrollObserverOptions(el, scrollThreshold),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [getAnimationFor, hasTrigger, onEnter, onExit, repeat, requestRun, shouldObserveOnce, scrollThreshold])

  useEffect(() => {
    const previous = prevValueRef.current
    if (!hasTrigger("change") || cat !== "oneshot") {
      prevValueRef.current = value
      return
    }
    prevValueRef.current = value
    if (previous === undefined || Object.is(previous, value) || !ref.current) return
    requestRun("change")
  }, [cat, hasTrigger, value, requestRun])

  // continuous animations
  useEffect(() => {
    if (cat !== "continuous" || hasTrigger("hover") || hasTrigger("click") || hasTrigger("manual") || hasTrigger("mount")) return
    const el = ref.current
    if (!el) return
    const cfg = CONTINUOUS_KEYFRAMES[animation]
    if (!cfg || prefersReducedMotion()) return

    if (animation === "shimmer") {
      const color = getComputedStyle(el).color
      el.style.background = `linear-gradient(90deg, transparent 0%, ${color}33 50%, transparent 100%)`
      el.style.backgroundSize = "200% 100%"
    }

    el.style.willChange = "transform, opacity"
    animRef.current = el.animate(cfg.keyframes, {
      duration: cfg.duration,
      iterations: Infinity,
      easing: cfg.easing,
    })
    animRef.current.addEventListener("cancel", () => finishWillChange(el))
    return () => {
      if (animRef.current) {
        animRef.current.cancel()
        animRef.current = null
      }
      if (animation === "shimmer") {
        el.style.background = ""
        el.style.backgroundSize = ""
      }
    }
  }, [animation, cat, hasTrigger])

  // mount trigger — animate on mount or when show transitions false → true
  useEffect(() => {
    if (!hasTrigger("mount")) return
    if (phase !== "entered") return
    if (mountPlayedRef.current) return
    const isShown = show ?? true
    if (!isShown) return

    mountPlayedRef.current = true
    const el = ref.current
    if (!el) return

    if (cat === "continuous") {
      const cfg = CONTINUOUS_KEYFRAMES[animation]
      if (!cfg || prefersReducedMotion()) return
      el.style.willChange = "transform, opacity"
      animRef.current = el.animate(cfg.keyframes, {
        duration: cfg.duration,
        iterations: Infinity,
        easing: cfg.easing,
      })
      animRef.current.addEventListener("cancel", () => finishWillChange(el))
      return () => {
        animRef.current?.cancel()
        animRef.current = null
      }
    }

    if (cat === "oneshot") {
      const motionDuration = effectiveDuration(duration)
      const def = presets[animation]
      if (!def) return
      propertyAnimRef.current = runPropertyAnimation(el, properties, {
        duration: motionDuration,
        easing,
        delay,
      })
      runTimerRef.current = setTimeout(finishRun, Math.max(600, motionDuration + delay + 300))
      animRef.current = runAnimation(el, def.in, { duration: motionDuration, easing, delay }, finishRun)
    }
  }, [hasTrigger, phase, show, animation, cat, duration, easing, delay, finishRun, properties])

  // reset mountPlayedRef when exiting
  useEffect(() => {
    if (phase === "exiting" || phase === "exited") {
      mountPlayedRef.current = false
    }
  }, [phase])

  useLayoutEffect(() => {
    if (!currentRun) return
    play(currentRun.source)
  }, [currentRun, play])

  // exit lifecycle — play exit animation when show transitions true → false
  useEffect(() => {
    if (show === undefined) return

    if (show) {
      exitAnimRef.current?.cancel()
      exitAnimRef.current = null
      setPhase("entered")
      return
    }

    // show === false
    const key = ++exitKeyRef.current

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

    const motionDuration = effectiveDuration(duration)
    const exitCat = presetCategory[exitAnimation] ?? "oneshot"

    const onExitEnd = () => {
      if (exitKeyRef.current === key) {
        setPhase("exited")
        exitAnimRef.current = null
      }
    }

    setPhase("exiting")

    if (exitCat === "continuous") {
      const cfg = CONTINUOUS_KEYFRAMES[exitAnimation]
      if (cfg && !prefersReducedMotion()) {
        exitAnimRef.current = runAnimation(el, cfg.keyframes, {
          duration: motionDuration || cfg.duration,
          easing: cfg.easing,
          fill: "forwards",
        }, onExitEnd)
      } else {
        setPhase("exited")
      }
    } else {
      const def = presets[exitAnimation]
      if (!def) {
        if (process.env.NODE_ENV === "development") {
          if (!warned.has(`exit:${exitAnimation}`)) {
            warned.add(`exit:${exitAnimation}`)
            console.warn(`[trigr] Unknown exit animation preset "${exitAnimation}". Expected one of: ${Object.keys(presets).join(", ")}`)
          }
        }
        setPhase("exited")
        return
      }
      exitAnimRef.current = runAnimation(el, def.out, {
        duration: motionDuration,
        easing,
        fill: "forwards",
      }, onExitEnd)
    }

    return () => {
      if (exitKeyRef.current === key) {
        exitAnimRef.current?.cancel()
        exitAnimRef.current = null
      }
    }
  }, [show, exitAnimation, duration, easing])

  // cursor tracking
  useEffect(() => {
    const hoverName = getAnimationFor("hover")
    const hoverCat = presetCategory[hoverName] ?? "oneshot"
    if (hoverCat !== "cursorTrack" || !hasTrigger("hover")) return
    const el = ref.current
    if (!el) return
    const previousTransform = el.style.transform
    const previousTransition = el.style.transition

    function onMove(e: globalThis.MouseEvent) {
      const rect = el!.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      switch (hoverName) {
        case "tilt":
          el!.style.transform = `perspective(400px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg)`
          break
        case "tilt3D":
          el!.style.transform = `perspective(600px) rotateY(${x * 20}deg) rotateX(${-y * 15}deg) rotateZ(${x * y * 5}deg)`
          break
        case "rotate3D":
          el!.style.transform = `perspective(800px) rotateX(${-y * 30}deg) rotateY(${x * 30}deg)`
          break
        case "depth":
          el!.style.transform = `perspective(600px) translateZ(${(1 - Math.abs(x) - Math.abs(y)) * 40}px)`
          break
      }
      el!.style.transition = "none"
    }

    function onLeave() {
      if (!el) return
      el!.style.transition = `transform 220ms ${SMOOTH}`
      el!.style.transform = previousTransform
    }

    el.addEventListener("mousemove", onMove)
    el.addEventListener("mouseleave", onLeave)
    return () => {
      el.removeEventListener("mousemove", onMove)
      el.removeEventListener("mouseleave", onLeave)
      el.style.transform = previousTransform
      el.style.transition = previousTransition
    }
  }, [getAnimationFor, hasTrigger])

  // scroll-linked (parallax)
  useEffect(() => {
    const scrollName = getAnimationFor("scroll")
    const scrollCat = presetCategory[scrollName] ?? "oneshot"
    if (scrollCat !== "scrollLink" || !hasTrigger("scroll")) return
    const el = ref.current
    if (!el) return
    const previousTransform = el.style.transform
    const previousTransformOrigin = el.style.transformOrigin
    const root = getScrollRoot(el)
    const scrollTarget: HTMLElement | Window = root ?? window

    let ticking = false
    let idleTimer: ReturnType<typeof setTimeout>

    function clearIdleTimer() {
      clearTimeout(idleTimer)
    }

    function resetWillChange() {
      if (el) finishWillChange(el)
    }

    function onScroll() {
      if (!ticking) {
        rafRef.current = requestAnimationFrame(update)
        ticking = true
      }
    }

    function update() {
      ticking = false
      if (!el) return
      clearIdleTimer()
      el.style.willChange = "transform"
      idleTimer = setTimeout(resetWillChange, 300)
      const offset = Math.max(-1.25, Math.min(1.25, scrollCenterOffset(el, root)))
      const intensity = Number.isFinite(speed) ? Math.min(1.5, Math.max(0.05, speed)) : 0.5
      const distance = 80 * intensity

      switch (scrollName) {
        case "parallax":
          el.style.transform = `translateY(${offset * distance}px)`
          break
        case "parallaxFast":
          el.style.transform = `translateY(${offset * distance * 1.45}px)`
          break
        case "parallaxReverse":
          el.style.transform = `translateY(${-offset * distance}px)`
          break
        case "tiltScroll":
          el.style.transform = `perspective(400px) rotateX(${-offset * 30 * intensity}deg)`
          break
        case "scaleScroll":
          {
            const focus = 1 - Math.min(1, Math.abs(offset))
            const scale = Math.min(1.12, Math.max(0.9, 0.9 + focus * (0.18 + intensity * 0.08)))
            el.style.transformOrigin = "center"
            el.style.transform = `scale(${scale.toFixed(3)})`
          }
          break
      }
    }

    scrollTarget.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    onScroll()
    return () => {
      scrollTarget.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      clearIdleTimer()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      finishWillChange(el)
      el.style.transform = previousTransform
      el.style.transformOrigin = previousTransformOrigin
    }
  }, [getAnimationFor, hasTrigger, speed])

  const handleClick = useCallback((event: MouseEvent<HTMLElement>) => {
    onClick?.(event)
    const el = ref.current
    if (!el) return
    const clickAnimation = getAnimationFor("click")
    const c = presetCategory[clickAnimation] ?? "oneshot"
    if (c === "overlay") {
      spawnOverlay(el, clickAnimation, event.clientX, event.clientY)
    }
    if (hasTrigger("click") && c === "continuous") {
      requestRun("click")
    }
    if (hasTrigger("click") && c === "oneshot") {
      requestRun("click")
    }
  }, [getAnimationFor, hasTrigger, onClick, requestRun])

  const handleMouseEnter = useCallback(() => {
    onHoverStart?.()
    const el = ref.current
    if (!el) return
    const hoverAnimation = getAnimationFor("hover")
    const c = presetCategory[hoverAnimation] ?? "oneshot"

    if (c === "hoverState") {
      const styles = HOVER_STATE_CSS[hoverAnimation]
      if (styles && !prefersReducedMotion()) {
        const transitionDuration = `${effectiveDuration(duration)}ms`
        el.style.transition = `transform ${transitionDuration} ${easing}, filter ${transitionDuration} ${easing}, box-shadow ${transitionDuration} ${easing}, border-color ${transitionDuration} ${easing}, border-width ${transitionDuration} ${easing}`
        setStyles(el, styles)
        hoverApplied.current = true
      }
    }

    if (hasTrigger("hover") && c === "continuous") {
      const cfg = CONTINUOUS_KEYFRAMES[hoverAnimation]
      if (cfg && !prefersReducedMotion()) {
        animRef.current?.cancel()
        el.style.willChange = "transform, opacity"
        animRef.current = el.animate(cfg.keyframes, {
          duration: cfg.duration,
          iterations: Infinity,
          easing: cfg.easing,
        })
        animRef.current.addEventListener("cancel", () => finishWillChange(el))
      }
    }

    if (hasTrigger("hover") && c === "oneshot") {
      requestRun("hover")
    }
  }, [getAnimationFor, hasTrigger, onHoverStart, requestRun, duration, easing])

  const handleMouseLeave = useCallback(() => {
    onHoverEnd?.()
    const el = ref.current
    if (!el) return
    const hoverAnimation = getAnimationFor("hover")
    const c = presetCategory[hoverAnimation] ?? "oneshot"

    if (c === "hoverState") {
      const styles = HOVER_STATE_CSS[hoverAnimation]
      if (styles) {
        const transitionDuration = `${effectiveDuration(duration)}ms`
        el.style.transition = `transform ${transitionDuration} ${easing}, filter ${transitionDuration} ${easing}, box-shadow ${transitionDuration} ${easing}, border-color ${transitionDuration} ${easing}, border-width ${transitionDuration} ${easing}`
        clearStyles(el, styles)
        hoverApplied.current = false
      }
    }
    if (hasTrigger("hover") && c === "continuous" && animRef.current) {
      animRef.current.cancel()
      animRef.current = null
      finishWillChange(el)
    }
  }, [getAnimationFor, onHoverEnd, duration, easing, hasTrigger])

  // Cleanup hover styles on unmount (if still applied)
  useEffect(() => {
    return () => {
      animRef.current?.cancel()
      propertyAnimRef.current?.cancel()
      exitAnimRef.current?.cancel()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (runTimerRef.current !== null) clearTimeout(runTimerRef.current)
      queueRef.current = []
      if (hoverApplied.current && ref.current) {
        const styles = HOVER_STATE_CSS[animation]
        if (styles) clearStyles(ref.current, styles)
      }
    }
  }, [])

  if (phase === "exited" && unmountOnExit !== false) {
    return null
  }

  const clickCategory = presetCategory[getAnimationFor("click")] ?? "oneshot"
  const hoverCategory = presetCategory[getAnimationFor("hover")] ?? "oneshot"

  return createElement(
    as,
    {
      ref,
      className,
      style: phase === "exited" ? { ...style, visibility: "hidden", pointerEvents: "none" } : style,
      onClick: hasTrigger("click") || onClick || clickCategory === "overlay" ? handleClick : undefined,
      onMouseEnter: hasTrigger("hover") || onHoverStart || hoverCategory === "hoverState" ? handleMouseEnter : undefined,
      onMouseLeave: onHoverEnd || hoverCategory === "hoverState" ? handleMouseLeave : undefined,
    },
    children,
  )
})

export { Parallax }
export { AnimateBlock }
export const Animate = { Block: AnimateBlock, Parallax }
export default Animate
