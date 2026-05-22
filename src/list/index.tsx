import React, { createElement, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type { AnimateListHandle, AnimateListProps, AnimationDefinition, AnimationProperties, GhostEntry, ListAnimationPreset, ListTrigger } from "./types"
import { EASE_IN, EASE_IN_OUT, EASE_OUT, presets, SPRING } from "./animations"
import { useListDiff } from "./useListDiff"
import { usePositionTracker } from "./usePositionTracker"

const warned = new Set<string>()

function validDuration(value: unknown, fallback = 300): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function resolveDef(name: ListAnimationPreset, type: "enter" | "exit", custom?: AnimateListProps["customAnimation"]): AnimationDefinition {
  if (type === "enter" && custom?.enter) return custom.enter
  if (type === "exit" && custom?.exit) return custom.exit
  const def = presets[name]
  if (!def) {
    if (!warned.has(name)) {
      warned.add(name)
      const fallback = type === "enter" ? "staggerFadeIn" : "itemFadeOut"
      console.warn(`[trigr/list] Unknown animation "${name}", falling back to "${fallback}"`)
    }
    return type === "enter" ? presets.staggerFadeIn : presets.itemFadeOut
  }
  return def
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

function runAnimation(el: HTMLElement, def: AnimationDefinition, opts: globalThis.KeyframeAnimationOptions): Animation {
  el.style.willChange = "transform, opacity"
  const keyframes = reducedMotion()
    ? def.keyframes.map(({ opacity }) => ({ opacity: opacity ?? 1 }))
    : def.keyframes
  applyInitialState(el, keyframes)
  const anim = el.animate(keyframes, { ...def.options, ...opts, fill: "forwards" })
  anim.addEventListener("finish", () => {
    applyFinalState(el, keyframes)
    el.style.willChange = "auto"
  })
  anim.addEventListener("cancel", () => { el.style.willChange = "auto" })
  return anim
}

function cancelElementAnimations(el: HTMLElement) {
  el.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())
}

function reducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
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

function getKeys(children: React.ReactNode): (string | number)[] {
  const keys: (string | number)[] = []
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.key != null) keys.push(child.key)
  })
  return keys
}

function isMarqueeAnimation(name: ListAnimationPreset): boolean {
  return name === "marquee" || name === "marqueeReverse" || name === "marqueeFade"
}

function isParallaxAnimation(name: ListAnimationPreset): boolean {
  return name === "parallax"
    || name === "parallaxFast"
    || name === "parallaxReverse"
    || name === "tiltScroll"
    || name === "scaleScroll"
    || name === "parallaxStagger"
}

function normalizeParallaxSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 0.5
  return Math.min(1.5, Math.max(0.05, speed))
}

function closestItem(el: HTMLElement, root: HTMLElement): HTMLElement | null {
  return el.closest("[data-trigr-key]") as HTMLElement | null
}

function getItemKey(el: HTMLElement): string | null {
  return el.getAttribute("data-trigr-key")
}

const AnimateList = forwardRef<AnimateListHandle, AnimateListProps>(function AnimateList({
  triggers: triggersProp,
  animation = "staggerFadeIn",
  scrollAnimation,
  properties,
  exitAnimation = "itemFadeOut",
  reorderAnimation = "flip",
  reorder = "flip",
  duration = 300,
  reorderDuration = 250,
  stagger = 60,
  exitStagger = 0,
  speed = 50,
  trigger = "mount",
  threshold = 0.4,
  easing = EASE_IN,
  reorderEasing = EASE_IN_OUT,
  as = "div",
  className,
  style,
  onItemEnter,
  onItemExit,
  onReorder,
  children,
  customAnimation,
}, ref) {
  const rootRef = useRef<HTMLElement>(null)
  const currentKeys = getKeys(children)
  const diff = useListDiff(currentKeys)
  const { snapshot, getPositions } = usePositionTracker(rootRef)
  const prevChildrenRef = useRef<React.ReactNode>(children)
  const [ghosts, setGhosts] = useState<Map<string | number, GhostEntry>>(new Map())
  const ghostAnimatedRef = useRef<Set<string | number>>(new Set())
  const ghostTimersRef = useRef<Map<string | number, ReturnType<typeof setTimeout>>>(new Map())
  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runningRef = useRef(false)
  const queueRef = useRef<ListTrigger[]>([])
  const runIdRef = useRef(0)
  const reducedRef = useRef(false)
  const triggerConfigs = useMemo(() => {
    if (triggersProp) {
      return triggersProp.map(tc => ({
        trigger: tc.trigger as ListTrigger,
        animation: tc.animation as ListAnimationPreset,
        threshold: tc.threshold ?? threshold,
      }))
    }
    const sources = (Array.isArray(trigger) ? trigger.slice(0, 2) : [trigger]) as ListTrigger[]
    return sources.map(s => ({
      trigger: s,
      animation: s === "scroll" && scrollAnimation ? scrollAnimation : animation,
      threshold,
    }))
  }, [triggersProp, trigger, animation, scrollAnimation, threshold])

  const triggerSources = useMemo(
    () => triggerConfigs.map(tc => tc.trigger),
    [triggerConfigs]
  )

  const hasTrigger = useCallback((source: ListTrigger) => triggerSources.includes(source), [triggerSources])
  const [currentRun, setCurrentRun] = useState<{ id: number; source: ListTrigger } | null>(null)
  const [inView, setInView] = useState(!hasTrigger("scroll"))
  const activeTrigger = currentRun?.source ?? triggerSources[0] ?? "mount"
  const activeConfig = triggerConfigs.find(tc => tc.trigger === activeTrigger)
  const activeAnimation = activeConfig?.animation ?? animation
  const scrollConfig = triggerConfigs.find(tc => tc.trigger === "scroll")
  const scrollThreshold = scrollConfig?.threshold ?? threshold

  if (typeof window !== "undefined") {
    reducedRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  }

  useEffect(() => {
    setInView(!hasTrigger("scroll"))
  }, [hasTrigger])

  useEffect(() => {
    if (!hasTrigger("scroll")) return
    const node = rootRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== node) continue
          setInView(entry.isIntersecting)
        }
      },
      scrollObserverOptions(node, scrollThreshold),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasTrigger, scrollThreshold])

  const finishRun = useCallback(() => {
    if (runTimerRef.current !== null) {
      clearTimeout(runTimerRef.current)
      runTimerRef.current = null
    }
    runningRef.current = false
    const next = queueRef.current.shift()
    if (next) {
      runningRef.current = true
      setCurrentRun({ id: ++runIdRef.current, source: next })
    } else {
      setCurrentRun(null)
    }
  }, [])

  const requestRun = useCallback((source: ListTrigger) => {
    if (runningRef.current) {
      if (source !== "scroll") queueRef.current = [...queueRef.current, source].slice(-2)
      return
    }
    runningRef.current = true
    setCurrentRun({ id: ++runIdRef.current, source })
  }, [])

  const reorderMode = reorderAnimation ?? reorder

  const animateCollection = useCallback((source: ListTrigger = activeTrigger) => {
    const root = rootRef.current
    if (!root) {
      finishRun()
      return
    }
    if (reducedRef.current) {
      finishRun()
      return
    }
    const sourceConfig = triggerConfigs.find(tc => tc.trigger === source)
    const selectedAnimation = sourceConfig?.animation ?? animation
    if (isParallaxAnimation(selectedAnimation) || isMarqueeAnimation(selectedAnimation)) {
      finishRun()
      return
    }
    const def = resolveDef(selectedAnimation, "enter", customAnimation)
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-trigr-key]"))
    if (nodes.length === 0) {
      finishRun()
      return
    }
    if (runTimerRef.current !== null) {
      clearTimeout(runTimerRef.current)
      runTimerRef.current = null
    }
    const resolvedDuration = reducedRef.current
      ? validDuration(duration, 300) / 2
      : validDuration(def.options?.duration ?? duration, 300)
    nodes.forEach((el, index) => {
      cancelElementAnimations(el)
      runAnimation(el, def, {
        duration: resolvedDuration,
        easing: def.options?.easing ?? easing,
        delay: index * stagger,
        fill: "forwards",
      })
      runPropertyAnimation(el, properties, {
        duration: resolvedDuration,
        easing,
        delay: index * stagger,
      })
    })
    runTimerRef.current = setTimeout(finishRun, resolvedDuration + Math.max(0, nodes.length - 1) * stagger + 80)
  }, [activeTrigger, animation, customAnimation, duration, easing, finishRun, properties, triggerConfigs, stagger])

  const hoveredKeyRef = useRef<string | number | null>(null)

  const runSingleItem = useCallback((key: string | number, source?: ListTrigger) => {
    const root = rootRef.current
    if (!root || reducedRef.current) return
    const el = root.querySelector(`[data-trigr-key="${key}"]`) as HTMLElement | null
    if (!el) return
    cancelElementAnimations(el)
    const sourceConfig = source ? triggerConfigs.find(tc => tc.trigger === source) : undefined
    const anim = sourceConfig?.animation ?? animation
    const def = resolveDef(anim, "enter", customAnimation)
    const dur = reducedRef.current ? validDuration(duration, 300) / 2 : validDuration(duration, 300)
    runAnimation(el, def, {
      duration: dur,
      easing: def.options?.easing ?? easing,
      fill: "forwards",
    })
    runPropertyAnimation(el, properties, { duration: dur, easing })
  }, [animation, duration, easing, customAnimation, properties, triggerConfigs])

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    if (!hasTrigger("hover")) return
    if (runningRef.current) return
    const root = rootRef.current
    if (!root) return
    const target = closestItem(e.target as HTMLElement, root)
    if (!target) return
    const key = getItemKey(target)
    if (key == null || key === hoveredKeyRef.current) return
    hoveredKeyRef.current = key
    runSingleItem(key, "hover")
  }, [hasTrigger, runSingleItem])

  const handleMouseLeave = useCallback(() => {
    hoveredKeyRef.current = null
  }, [])

  const handleItemClick = useCallback((e: React.MouseEvent) => {
    if (!hasTrigger("click")) return
    if (runningRef.current) return
    const root = rootRef.current
    if (!root) return
    const target = closestItem(e.target as HTMLElement, root)
    if (!target) return
    const key = getItemKey(target)
    if (key == null) return
    runSingleItem(key, "click")
  }, [hasTrigger, runSingleItem])

  useImperativeHandle(ref, () => ({ animate: () => requestRun("manual") }), [requestRun])

  const reorderEasings: Record<string, string> = {
    flip: EASE_IN_OUT,
    smooth: EASE_IN_OUT,
    spring: SPRING,
    none: EASE_IN_OUT,
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const dur = duration
    const rDur = reorderDuration

    if (reducedRef.current) {
      if (diff.removed.length > 0) diff.removed.forEach((key) => onItemExit?.(key))
      if (diff.added.length > 0) diff.added.forEach((key) => onItemEnter?.(key))
      prevChildrenRef.current = children
      return
    }

    const getEl = (key: string | number): HTMLElement | null =>
      root.querySelector(`[data-trigr-key="${key}"]`) as HTMLElement | null

    const rootRect = root.getBoundingClientRect()
    const readPositions = () => {
      const map = new Map<string | number, { top: number; left: number; width: number; height: number }>()
      for (const child of root.children) {
        const k = (child as HTMLElement).getAttribute("data-trigr-key")
        if (!k) continue
        const rect = (child as HTMLElement).getBoundingClientRect()
        map.set(k, {
          top: rect.top - rootRect.top,
          left: rect.left - rootRect.left,
          width: rect.width,
          height: rect.height,
        })
      }
      return map
    }

    const oldPositions = getPositions()

    if (diff.reordered.length > 0 && reorderMode !== "none") {
      const newPositions = readPositions()
      const rEasing = reorderEasings[reorderMode] ?? reorderEasing
      for (const key of diff.reordered) {
        const old = oldPositions.get(key)
        const now = newPositions.get(key)
        if (!old || !now) continue
        const deltaX = old.left - now.left
        const deltaY = old.top - now.top
        if (deltaX === 0 && deltaY === 0) continue
        const el = getEl(key)
        if (!el) continue
        el.style.zIndex = "1"
        el.style.willChange = "transform"
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
        el.getBoundingClientRect()
        const anim = el.animate(
          [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }],
          { duration: rDur, easing: rEasing, fill: "forwards" },
        )
        anim.onfinish = () => {
          el.style.zIndex = ""
          el.style.willChange = "auto"
        }
        el.style.transform = ""
      }
      onReorder?.()
    }

    if (diff.added.length > 0) {
      const def = resolveDef(activeAnimation, "enter", customAnimation)
      diff.added.forEach((key, i) => {
        const el = getEl(key)
        if (el) {
          runAnimation(el, def, {
            duration: dur,
            easing: def.options?.easing ?? easing,
            delay: i * stagger,
            fill: "forwards",
          })
          runPropertyAnimation(el, properties, {
            duration: dur,
            easing,
            delay: i * stagger,
          })
        }
        onItemEnter?.(key)
      })
    }

    if (diff.removed.length > 0) {
      const prevArr = React.Children.toArray(prevChildrenRef.current)
      const newGhosts = new Map(ghosts)
      diff.removed.forEach((key) => {
        if (ghosts.has(key)) return
        const element = prevArr.find((c) => React.isValidElement(c) && c.key === key)
        const pos = oldPositions.get(key)
        if (element && pos) newGhosts.set(key, { key, element, ...pos })
      })
      if (newGhosts.size !== ghosts.size) setGhosts(newGhosts)
    }

    prevChildrenRef.current = children
  }, [diff, children, activeAnimation, exitAnimation, duration, reorderDuration, stagger, exitStagger, reorderMode, reorderEasing, properties])

  useEffect(() => {
    if (reducedRef.current) return
    const root = rootRef.current
    if (!root || ghosts.size === 0) return
    const def = resolveDef(exitAnimation, "exit", customAnimation)

    const unanimated: [string | number, GhostEntry][] = []
    ghosts.forEach((g, key) => {
      if (!ghostAnimatedRef.current.has(key)) unanimated.push([key, g])
    })
    if (unanimated.length === 0) return

    unanimated.forEach(([key], idx) => {
      ghostAnimatedRef.current.add(key)
      const timer = setTimeout(() => {
        setGhosts((prev) => {
          const next = new Map(prev)
          next.delete(key)
          return next
        })
        ghostAnimatedRef.current.delete(key)
        ghostTimersRef.current.delete(key)
      }, duration + idx * exitStagger)
      ghostTimersRef.current.set(key, timer)

      const el = root.querySelector(`[data-trigr-key="${key}"]`) as HTMLElement | null
      if (el) {
        el.getAnimations().forEach((a) => a.cancel())
        runAnimation(el, def, {
          duration,
          easing: def.options?.easing ?? EASE_OUT,
          delay: idx * exitStagger,
          fill: "forwards",
        })
      }
      onItemExit?.(key)
    })
  }, [ghosts, exitAnimation, duration, exitStagger, customAnimation])

  useEffect(() => {
    const scrollConfig = triggerConfigs.find(tc => tc.trigger === "scroll")
    const scrollName = scrollConfig?.animation ?? scrollAnimation ?? animation
    if (!hasTrigger("scroll") || !isParallaxAnimation(scrollName)) return
    const root = rootRef.current
    if (!root || reducedRef.current) return

    const scrollRoot = getScrollRoot(root)
    const scrollTarget: HTMLElement | Window = scrollRoot ?? window
    const previous = new Map<HTMLElement, { transform: string; zIndex: string; willChange: string }>()
    let raf = 0
    let ticking = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    function viewport() {
      if (scrollRoot) {
        const rect = scrollRoot.getBoundingClientRect()
        return { top: rect.top, height: scrollRoot.clientHeight }
      }
      return { top: 0, height: window.innerHeight }
    }

    function children() {
      return Array.from(root!.children).filter((child): child is HTMLElement =>
        child instanceof HTMLElement && child.hasAttribute("data-trigr-key"),
      )
    }

    function update() {
      ticking = false
      if (!root) return
      if (idleTimer) clearTimeout(idleTimer)
      const nodes = children()
      const count = nodes.length
      if (count === 0) return

      const rootRect = root.getBoundingClientRect()
      const view = viewport()
      const viewCenter = view.top + view.height / 2
      const rootCenter = rootRect.top + rootRect.height / 2
      const rawCenterOffset = (rootCenter - viewCenter) / Math.max(view.height, 1)
      const centerOffset = Math.max(-1.25, Math.min(1.25, rawCenterOffset))
      const baseSpeed = normalizeParallaxSpeed(speed)
      const centerIndex = (count - 1) / 2

      nodes.forEach((el, index) => {
        if (!previous.has(el)) {
          previous.set(el, {
            transform: el.style.transform,
            zIndex: el.style.zIndex,
            willChange: el.style.willChange,
          })
        }

        const depth = index - centerIndex
        const layerSpeed = baseSpeed * (44 + Math.abs(depth) * 18)
        let y = -centerOffset * layerSpeed + depth * 10
        let x = 0
        let scale = 1 - Math.min(0.04, Math.abs(depth) * 0.012)
        let rotateX = 0
        let transform = ""

        if (scrollName === "parallaxFast") {
          y = -centerOffset * layerSpeed * 1.45 + depth * 12
        }

        if (scrollName === "parallaxReverse") {
          y = centerOffset * layerSpeed + depth * 10
        }

        if (scrollName === "tiltScroll") {
          y = -centerOffset * layerSpeed * 0.62 + depth * 8
          rotateX = -centerOffset * (7 + Math.abs(depth) * 2)
          scale = 1 - Math.min(0.035, Math.abs(depth) * 0.01)
          transform = `perspective(720px) translate3d(0, ${y.toFixed(2)}px, 0) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`
        }

        if (scrollName === "scaleScroll") {
          const focus = 1 - Math.min(1, Math.abs(centerOffset))
          y = -centerOffset * layerSpeed * 0.28 + depth * 8
          x = depth * focus * 5
          scale = Math.min(1.12, Math.max(0.9, 0.9 + focus * (0.18 + baseSpeed * 0.08) - Math.abs(depth) * 0.01))
        }

        el.style.willChange = "transform"
        el.style.zIndex = String(index + 1)
        el.style.transform = transform || `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`
      })

      idleTimer = setTimeout(() => {
        nodes.forEach((el) => { el.style.willChange = "auto" })
      }, 300)
    }

    function onScroll() {
      if (ticking) return
      raf = requestAnimationFrame(update)
      ticking = true
    }

    scrollTarget.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    onScroll()

    return () => {
      scrollTarget.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
      if (idleTimer) clearTimeout(idleTimer)
      previous.forEach((styles, el) => {
        el.style.transform = styles.transform
        el.style.zIndex = styles.zIndex
        el.style.willChange = styles.willChange
      })
    }
  }, [animation, hasTrigger, scrollAnimation, speed, triggerConfigs])

  useEffect(() => {
    if (hasTrigger("mount")) {
      const mountConfig = triggerConfigs.find(tc => tc.trigger === "mount")
      const mountAnim = mountConfig?.animation ?? animation
      if (isParallaxAnimation(mountAnim)) return
      requestRun("mount")
      return
    }
    const scrollConfig = triggerConfigs.find(tc => tc.trigger === "scroll")
    const scrollName = scrollConfig?.animation ?? scrollAnimation ?? animation
    if (hasTrigger("scroll") && inView && !isParallaxAnimation(scrollName)) requestRun("scroll")
  }, [animation, hasTrigger, inView, requestRun, scrollAnimation, triggerConfigs])

  useEffect(() => {
    if (!currentRun) return
    animateCollection(currentRun.source)
  }, [animateCollection, currentRun])

  useEffect(() => () => {
    ghostTimersRef.current.forEach((t) => clearTimeout(t))
    ghostTimersRef.current.clear()
    if (runTimerRef.current !== null) clearTimeout(runTimerRef.current)
    queueRef.current = []
  }, [])

  const marquee = isMarqueeAnimation(activeAnimation)
  if (marquee) {
    const childrenArr = React.Children.toArray(children)
    const marqueeChildren = [...childrenArr, ...childrenArr]
    const reverse = activeAnimation === "marqueeReverse"
    const fadeMask = activeAnimation === "marqueeFade"
    const pxPerSec = Math.max(speed, 1)
    const travelPx = Math.max(800, childrenArr.length * 180)
    const marqueeDurationMs = Math.round((travelPx / pxPerSec) * 1000)

    return createElement(
      as,
      {
        ref: rootRef,
        className,
        style: {
          position: "relative",
          overflow: "hidden",
          width: "100%",
          ...(fadeMask
            ? { maskImage: "linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)" }
            : null),
          ...style,
        },
      },
      createElement("style", {
        key: "trigr-list-marquee-keyframes",
        dangerouslySetInnerHTML: {
          __html: "@keyframes trigr-list-marquee-x{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
        },
      }),
      createElement(
        "div",
        {
          style: {
            display: "inline-flex",
            width: "max-content",
            gap: "1rem",
            whiteSpace: "nowrap",
            animation: reducedRef.current
              ? undefined
              : `trigr-list-marquee-x ${marqueeDurationMs}ms linear infinite${reverse ? " reverse" : ""}`,
            willChange: reducedRef.current ? undefined : "transform",
          },
        },
        marqueeChildren.map((child, index) =>
          createElement("div", { key: `mq-${index}`, style: { display: "inline-flex", alignItems: "center" } }, child),
        ),
      ),
    )
  }

  const ghostEntries: React.ReactNode[] = []
  ghosts.forEach((g) => {
    ghostEntries.push(
      createElement("div", {
        key: `ghost-${g.key}`,
        "data-trigr-key": g.key,
        style: {
          position: "absolute",
          top: g.top,
          left: g.left,
          width: g.width,
          height: g.height,
          overflow: "visible",
          pointerEvents: "none",
        },
      } as React.HTMLAttributes<HTMLDivElement>, g.element),
    )
  })

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    ...style,
  }

  const items = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child
    return createElement(
      "div",
      {
        key: child.key,
        "data-trigr-key": child.key ?? "",
        style: { overflow: "visible" },
      } as React.HTMLAttributes<HTMLDivElement>,
      child,
    )
  })

  return createElement(
    as,
    {
      ref: rootRef,
      className,
      style: wrapperStyle,
      onMouseOver: hasTrigger("hover") ? handleMouseOver : undefined,
      onMouseLeave: hasTrigger("hover") ? handleMouseLeave : undefined,
      onClick: hasTrigger("click") ? handleItemClick : undefined,
    },
    items,
    ...ghostEntries,
  )
})

export { AnimateList }
export const Animate = { List: AnimateList }
