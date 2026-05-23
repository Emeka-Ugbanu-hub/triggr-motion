import type { CSSProperties, JSX, ReactNode } from "react"

export type ListTrigger = "scroll" | "hover" | "click" | "mount" | "manual"
export type ListTriggerInput = ListTrigger | readonly [ListTrigger, ListTrigger] | readonly ListTrigger[]
export type ListReorderPreset = "flip" | "smooth" | "spring" | "none"
export type AnimationProperties = Record<string, readonly [string | number, string | number]>

export type ListTriggerConfig = {
  trigger: ListTrigger
  animation: ListAnimationPreset
  threshold?: number
}

export type ListStaggerPreset =
  | "staggerFadeIn" | "staggerSlideUp" | "staggerSlideLeft"
  | "staggerZoomIn" | "staggerPopIn" | "stackIn"

export type ListCascadePreset =
  | "wordCascade" | "wordWave" | "wordDrop" | "wordFadeIn"

export type ListMarqueePreset =
  | "marquee" | "marqueeReverse" | "marqueeFade"

export type ListParallaxPreset =
  | "parallax" | "parallaxFast" | "parallaxReverse"
  | "tiltScroll" | "scaleScroll" | "parallaxStagger"

export type ListPresencePreset =
  | "itemFadeIn" | "itemSlideIn" | "itemPopIn" | "itemBounceIn"
  | "itemFadeOut" | "itemSlideOut" | "itemCollapseOut"

export type ListAnimationPreset =
  | ListStaggerPreset
  | ListCascadePreset
  | ListMarqueePreset
  | ListParallaxPreset
  | ListPresencePreset
  | ListReorderPreset
  | "fadeIn" | "slideIn" | "slideInLeft" | "slideInRight"
  | "popIn" | "bounceIn" | "expandIn" | "flipIn" | "glideIn"
  | "fadeOut" | "slideOut" | "slideOutLeft" | "slideOutRight"
  | "popOut" | "bounceOut" | "collapseOut" | "flipOut" | "glideOut"
  | "marquee"
  | "staggerBlurIn" | "feedAppend" | "filterIn" | "emptyToList"

export interface ListDiff {
  added: (string | number)[]
  removed: (string | number)[]
  reordered: (string | number)[]
  stable: (string | number)[]
}

export type PositionMap = Map<string | number, { top: number; left: number; width: number; height: number }>

export interface AnimationDefinition {
  keyframes: Keyframe[]
  options?: globalThis.KeyframeAnimationOptions
}

export interface GhostEntry {
  key: string | number
  element: ReactNode
  top: number
  left: number
  width: number
  height: number
}

export interface AnimateListProps {
  triggers?: ListTriggerConfig[]
  animation?: ListAnimationPreset
  scrollAnimation?: ListAnimationPreset
  properties?: AnimationProperties
  exitAnimation?: ListAnimationPreset
  reorderAnimation?: ListAnimationPreset
  reorder?: ListReorderPreset
  duration?: number
  reorderDuration?: number
  stagger?: number
  exitStagger?: number
  speed?: number
  trigger?: ListTriggerInput
  threshold?: number
  easing?: string
  reorderEasing?: string
  as?: keyof JSX.IntrinsicElements
  className?: string
  style?: CSSProperties
  onItemEnter?: (key: string | number) => void
  onItemExit?: (key: string | number) => void
  onReorder?: () => void
  children: ReactNode
  customAnimation?: { enter?: AnimationDefinition; exit?: AnimationDefinition }
}

export interface AnimateListHandle {
  animate: () => void
}
