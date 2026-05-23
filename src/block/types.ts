import type { CSSProperties, JSX, MouseEvent, ReactNode } from "react"

export type PresetCategory =
  | "oneshot"
  | "continuous"
  | "hoverState"
  | "cursorTrack"
  | "scrollLink"
  | "overlay"

export type BlockAnimationPreset =
  | "fadeIn" | "fadeOut" | "fadeSwap"
  | "slideUp" | "slideDown" | "slideLeft" | "slideRight"
  | "scaleIn" | "scaleOut" | "popIn" | "popOut"
  | "rotateIn" | "rotateOut" | "flipX" | "flipY"
  | "bounceIn" | "bounceOut"
  | "shake" | "pulse" | "wiggle" | "jello" | "flash" | "heartBeat"
  | "glideIn" | "glideOut" | "dropIn" | "riseUp"
  | "expandIn" | "collapseOut" | "expandHeight" | "fadeSlideUp"
  | "blurIn" | "blurOut"
  | "clipUp" | "clipLeft"
  | "zoomIn" | "zoomOut"
  | "springBounce" | "springScale" | "springSlideUp" | "springSlideDown"
  | "morphRadius" | "morphCircle"
  | "parallax" | "parallaxFast" | "parallaxReverse" | "tiltScroll" | "scaleScroll"
  | "lift" | "sink" | "grow" | "glow" | "shadow" | "borderPop" | "tilt" | "float"
  | "press" | "ripple" | "burst"
  | "spin" | "ping" | "shimmer"
  | "tilt3D" | "rotate3D" | "depth"
  | "modalIn" | "modalOut" | "popoverIn" | "popoverOut" | "toastIn" | "toastOut" | "successCheckIn" | "buttonLoading" | "focusRingPulse"
  | "tabPanelIn" | "tabPanelOut" | "successToast" | "checkboxCheck"
  | "dialogOut" | "drawerOutLeft" | "drawerOutRight" | "drawerOutTop" | "drawerOutBottom"
  | "menuOut" | "toastOutRight" | "toastOutUp" | "collapseWidth" | "dismissOut" | "errorOut" | "successOut"

export type AnimationTrigger = "change" | "scroll" | "hover" | "click" | "manual" | "mount"
export type AnimationTriggerInput = AnimationTrigger | readonly [AnimationTrigger, AnimationTrigger] | readonly AnimationTrigger[]
export type AnimationProperties = Record<string, readonly [string | number, string | number]>

export type TriggerConfig = {
  trigger: AnimationTrigger
  animation: BlockAnimationPreset
  threshold?: number
}

export interface AnimateBlockHandle {
  animate: () => void
  element: HTMLElement | null
}

export interface AnimateBlockProps {
  value?: string | number
  triggers?: TriggerConfig[]
  trigger?: AnimationTriggerInput
  animation: BlockAnimationPreset
  scrollAnimation?: BlockAnimationPreset
  properties?: AnimationProperties
  exitAnimation?: BlockAnimationPreset
  show?: boolean
  unmountOnExit?: boolean
  duration?: number
  easing?: string
  delay?: number
  speed?: number
  threshold?: number
  repeat?: boolean
  once?: boolean
  as?: keyof JSX.IntrinsicElements
  className?: string
  style?: CSSProperties
  onClick?: (event: MouseEvent<HTMLElement>) => void
  onEnter?: () => void
  onExit?: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
  onAnimationEnd?: () => void
  drag?: "x" | "y" | "both" | boolean
  dragThreshold?: number
  dragElastic?: number
  dragSnapBackDuration?: number
  onDragEnd?: (info: { offset: { x: number; y: number }; velocity: { x: number; y: number }; dismissed: boolean }) => void
  layoutId?: string
  layoutTransition?: { duration?: number; easing?: string }
  children: ReactNode
}

export interface AnimationDefinition {
  in: Keyframe[]
  out: Keyframe[]
}

export type ParallaxType = "parallax" | "parallaxFast" | "parallaxReverse" | "tiltScroll" | "scaleScroll"
