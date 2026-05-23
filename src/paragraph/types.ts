import type { CSSProperties, JSX, MouseEvent, ReactNode } from "react"

export type ParagraphPreset =
  | "fadeIn"
  | "fadeOut"
  | "fadeSwap"
  | "fadeMask"
  | "morphText"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "slideReplace"
  | "popIn"
  | "popOut"
  | "expandIn"
  | "collapseOut"
  | "zoomIn"
  | "zoomOut"
  | "wordFadeIn"
  | "wordSlideUp"
  | "wordPop"
  | "lineFadeIn"
  | "lineSlideUp"
  | "streamIn"
  | "streamFade"
  | "streamSlide"
  | "cursorBlink"
  | "expandCollapse"
  | "heightAuto"
  | "crossFade"
  | "pulse"
  | "shake"
  | "highlight"
  | "flash"
  | "pushLeft"
  | "pushRight"
  | "flipPage"
  | "morphBlur"
  | "diffAnimate"
  | "scrollWordReveal"
  | "errorMessageIn"
  | "paragraphFadeOut"
  | "slideOutUp"
  | "slideOutDown"
  | "slideOutLeft"
  | "slideOutRight"
  | "collapseHeight"
  | "wordFadeOut"
  | "wordSlideOut"
  | "lineFadeOut"
  | "lineSlideOut"
  | "fadeMaskOut"

export type AnimationTrigger = "change" | "scroll" | "hover" | "click" | "manual" | "mount"
export type AnimationTriggerInput = AnimationTrigger | readonly [AnimationTrigger, AnimationTrigger] | readonly AnimationTrigger[]
export type AnimationProperties = Record<string, readonly [string | number, string | number]>

export type TriggerConfig = {
  trigger: AnimationTrigger
  animation: ParagraphPreset
  threshold?: number
}

export interface AnimateParagraphHandle {
  animate: () => void
  element: HTMLElement | null
}

export interface AnimateParagraphProps {
  value?: string
  triggers?: TriggerConfig[]
  trigger?: AnimationTriggerInput
  animation: ParagraphPreset
  scrollAnimation?: ParagraphPreset
  properties?: AnimationProperties
  exitAnimation?: ParagraphPreset
  show?: boolean
  unmountOnExit?: boolean
  highlightColor?: string
  duration?: number
  easing?: string
  delay?: number
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
  children: ReactNode
}

export interface AnimationDefinition {
  out: Keyframe[]
  in: Keyframe[]
}
