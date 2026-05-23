import type { CSSProperties, JSX, MouseEvent, ReactNode } from "react"

export type TextPresetOptions = {
  distance?: number
  scale?: number
  blur?: number
  stagger?: number
}

export type AnimationPreset =
  | "fadeSwap"
  | "morph"
  | "slideUp"
  | "slideDown"
  | "highlight"
  | "bump"
  | "blur"
  | "decoder"
  | "fadeAway"
  | "fadeIn"
  | "fadeOut"
  | "slideReplace"
  | "letterDrop"
  | "glitch"
  | "textReveal"
  | "liftReveal"
  | "scatter"
  | "typewriter"
  | "splash"
  | "jitter"
  | "popUp"
  | "jello"
  | "scramble"
  | "flip"
  | "bounce"
  | "shake"
  | "pulse"
  | "blink"
  | "wave"
  | "ping"
  | "popIn"
  | "dropIn"
  | "riseUp"
  | "expandIn"
  | "shrinkOut"
  | "boldFlash"
  | "strikeThrough"
  | "odometer"
  | "ticker"
  | "splitReveal"
  | "splitSlide"
  | "bigBang"
  | "scatterAssemble"
  | "pixelRain"
  | "dominoFall"
  | "vortex"
  | "pendulum"
  | "centerBurst"
  | "gravityBounce"
  | "scrollFanIn"
  | "textRotate"
  | "gooeyMorph"
  | "randomLetterSwap"
  | "textEffect"
  | "staggerText"
  | "underlineDraw" | "underlineSlide" | "copyConfirm" | "brightnessShift" | "activeTabText"
  | "fadeOutUp" | "fadeOutDown" | "slideOutUp" | "slideOutDown" | "slideOutLeft" | "slideOutRight" | "scaleOut" | "blurOut" | "clipOut" | "strikeOut" | "typeOut" | "scrambleOut" | "popOut"

export type AnimationTrigger = "change" | "scroll" | "hover" | "click" | "manual" | "mount"
export type AnimationTriggerInput = AnimationTrigger | readonly [AnimationTrigger, AnimationTrigger] | readonly AnimationTrigger[]
export type AnimationProperties = Record<string, readonly [string | number, string | number]>

export type TriggerConfig = {
  trigger: AnimationTrigger
  animation: AnimationPreset
  threshold?: number
}

export interface AnimateTextHandle {
  animate: () => void
  element: HTMLElement | null
}

export interface AnimateTextProps {
  value?: string | number
  triggers?: TriggerConfig[]
  trigger?: AnimationTriggerInput
  animation: AnimationPreset
  scrollAnimation?: AnimationPreset
  properties?: AnimationProperties
  exitAnimation?: AnimationPreset
  show?: boolean
  unmountOnExit?: boolean
  duration?: number
  easing?: string
  delay?: number
  highlightColor?: string
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
  presetOptions?: TextPresetOptions
  children: ReactNode
}

/** Internal shape for each animation preset. */
export interface AnimationDefinition {
  out: Keyframe[]
  in: Keyframe[]
}
