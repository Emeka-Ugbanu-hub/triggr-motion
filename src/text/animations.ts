import type { AnimationPreset, AnimationDefinition } from "./types"

export const EASE_IN = "cubic-bezier(0.0, 0.0, 0.2, 1)"
export const EASE_OUT = "cubic-bezier(0.4, 0.0, 1, 1)"
export const EASE_IN_OUT = "cubic-bezier(0.4, 0.0, 0.2, 1)"
export const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)"
export const SNAPPY = "cubic-bezier(0.2, 0, 0, 1)"
export const SMOOTH = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"

const fadeOut: Keyframe[] = [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-4px)" }]
const fadeIn: Keyframe[] = [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }]
const neutralOut: Keyframe[] = [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.96)" }]
const neutralIn: Keyframe[] = [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }]

export const presets: Record<AnimationPreset, AnimationDefinition> = {
  fadeSwap: {
    out: [
      { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" },
      { opacity: 0.92, transform: "translateY(0)", filter: "blur(0px)", offset: 0.28 },
      { opacity: 0, transform: "translateY(-0.12em)", filter: "blur(1.5px)" },
    ],
    in: [
      { opacity: 0, transform: "translateY(0.14em)", filter: "blur(2px)" },
      { opacity: 0.9, transform: "translateY(0.02em)", filter: "blur(0.35px)", offset: 0.72 },
      { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" },
    ],
  },
  morph: {
    out: neutralOut,
    in: neutralIn,
  },
  slideUp: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-10px)" }],
    in: [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }],
  },
  slideDown: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(10px)" }],
    in: [{ opacity: 0, transform: "translateY(-10px)" }, { opacity: 1, transform: "translateY(0)" }],
  },
  highlight: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  bump: {
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.08)", offset: 0.45 }, { opacity: 1, transform: "scale(1)" }],
    in: [],
  },
  blur: {
    out: [{ opacity: 1, filter: "blur(0px)", transform: "translateY(0)" }, { opacity: 0, filter: "blur(4px)", transform: "translateY(-4px)" }],
    in: [{ opacity: 0, filter: "blur(4px)", transform: "translateY(4px)" }, { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" }],
  },
  decoder: {
    out: fadeOut,
    in: fadeIn,
  },
  fadeAway: {
    out: fadeOut,
    in: fadeIn,
  },
  fadeIn: {
    out: fadeOut,
    in: fadeIn,
  },
  slideReplace: {
    out: [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-10px)" }],
    in: [{ opacity: 0, transform: "translateX(10px)" }, { opacity: 1, transform: "translateX(0)" }],
  },
  letterDrop: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateY(-18px)" }, { opacity: 1, transform: "translateY(2px)", offset: 0.72 }, { opacity: 1, transform: "translateY(0)" }],
  },
  glitch: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateX(-3px)" }, { opacity: 1, transform: "translateX(3px)", offset: 0.45 }, { opacity: 1, transform: "translateX(0)" }],
  },
  textReveal: {
    out: fadeOut,
    in: fadeIn,
  },
  liftReveal: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-10px)" }],
    in: [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }],
  },
  scatter: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateY(8px) scale(0.96)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
  },
  typewriter: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
  },
  splash: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateY(12px) scale(0.92)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
  },
  jitter: {
    out: fadeOut,
    in: [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 1, transform: "translateX(-6px)", offset: 0.2 },
      { opacity: 1, transform: "translateX(6px)", offset: 0.4 },
      { opacity: 1, transform: "translateX(-4px)", offset: 0.6 },
      { opacity: 1, transform: "translateX(4px)", offset: 0.8 },
      { opacity: 1, transform: "translateX(0)" },
    ],
  },
  popUp: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateY(10px) scale(0.92)" }, { opacity: 1, transform: "translateY(-2px) scale(1.04)", offset: 0.65 }, { opacity: 1, transform: "translateY(0) scale(1)" }],
  },
  jello: {
    out: fadeOut,
    in: [
      { opacity: 1, transform: "scale(1, 1)" },
      { opacity: 1, transform: "scale(1.08, 0.94)", offset: 0.24 },
      { opacity: 1, transform: "scale(0.96, 1.05)", offset: 0.48 },
      { opacity: 1, transform: "scale(1.03, 0.98)", offset: 0.72 },
      { opacity: 1, transform: "scale(1, 1)" },
    ],
  },
  scramble: {
    out: fadeOut,
    in: fadeIn,
  },
  flip: {
    out: [{ opacity: 1, transform: "perspective(600px) rotateY(0deg)" }, { opacity: 0, transform: "perspective(600px) rotateY(-36deg)" }],
    in: [{ opacity: 0, transform: "perspective(600px) rotateY(36deg)" }, { opacity: 1, transform: "perspective(600px) rotateY(0deg)" }],
  },
  bounce: {
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.92)" }],
    in: [{ opacity: 0, transform: "scale(0.88)" }, { opacity: 1, transform: "scale(1.06)", offset: 0.55 }, { opacity: 1, transform: "scale(1)" }],
  },
  shake: {
    out: fadeOut,
    in: [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 1, transform: "translateX(-6px)", offset: 0.2 },
      { opacity: 1, transform: "translateX(6px)", offset: 0.4 },
      { opacity: 1, transform: "translateX(-4px)", offset: 0.6 },
      { opacity: 1, transform: "translateX(4px)", offset: 0.8 },
      { opacity: 1, transform: "translateX(0)" },
    ],
  },
  pulse: {
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 1, transform: "scale(0.98)" }],
    in: [{ opacity: 1, transform: "scale(1)" }, { opacity: 1, transform: "scale(1.04)", offset: 0.5 }, { opacity: 1, transform: "scale(1)" }],
  },
  blink: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(0)" }],
    in: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0.28, transform: "translateY(0)", offset: 0.5 }, { opacity: 1, transform: "translateY(0)" }],
  },
  wave: {
    out: fadeOut,
    in: fadeIn,
  },
  ping: {
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.12)" }],
    in: [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1.08)", offset: 0.52 }, { opacity: 1, transform: "scale(1)" }],
  },
  popIn: {
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.92)" }],
    in: [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1.06)", offset: 0.65 }, { opacity: 1, transform: "scale(1)" }],
  },
  dropIn: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateY(-20px)" }, { opacity: 1, transform: "translateY(2px)", offset: 0.72 }, { opacity: 1, transform: "translateY(0)" }],
  },
  riseUp: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }],
  },
  expandIn: {
    out: neutralOut,
    in: [{ opacity: 0, transform: "scaleX(0.92)" }, { opacity: 1, transform: "scaleX(1)" }],
  },
  shrinkOut: {
    out: neutralOut,
    in: [{ opacity: 1, transform: "scaleX(1)" }, { opacity: 0, transform: "scaleX(0.92)" }],
  },
  boldFlash: {
    out: fadeOut,
    in: [{ opacity: 0, transform: "scale(0.98)" }, { opacity: 1, transform: "scale(1.02)", offset: 0.35 }, { opacity: 1, transform: "scale(1)" }],
  },
  strikeThrough: {
    out: fadeOut,
    in: fadeIn,
  },
  odometer: {
    out: fadeOut,
    in: fadeIn,
  },
  ticker: {
    out: fadeOut,
    in: fadeIn,
  },
  splitReveal: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  splitSlide: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  bigBang: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  scatterAssemble: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  pixelRain: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  dominoFall: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  vortex: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  pendulum: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  centerBurst: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  gravityBounce: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  scrollFanIn: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  textRotate: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  gooeyMorph: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  randomLetterSwap: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  textEffect: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  staggerText: {
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)" }],
    in: [],
  },
  underlineDraw: {
    out: [
      { backgroundSize: '0% 2px', backgroundPosition: '0% 100%', backgroundRepeat: 'no-repeat', backgroundImage: 'none', opacity: 1 },
      { backgroundSize: '0% 2px', opacity: 1 },
    ],
    in: [
      { backgroundSize: '0% 2px', backgroundPosition: '0% 100%', backgroundRepeat: 'no-repeat', opacity: 1 },
      { backgroundSize: '100% 2px', opacity: 1 },
    ],
  },
  underlineSlide: {
    out: [
      { backgroundSize: '0% 2px', backgroundPosition: '0% 100%', backgroundRepeat: 'no-repeat', opacity: 1 },
      { backgroundSize: '0% 2px', opacity: 1 },
    ],
    in: [
      { backgroundSize: '0% 2px', backgroundPosition: '0% 100%', backgroundRepeat: 'no-repeat', opacity: 1 },
      { backgroundSize: '100% 2px', opacity: 1 },
    ],
  },
  copyConfirm: {
    out: [],
    in: [
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1)', opacity: 1 },
    ],
  },
  colorShift: {
    out: [
      { filter: 'brightness(1)', opacity: 1 },
      { filter: 'brightness(1.05)', opacity: 1 },
    ],
    in: [
      { filter: 'brightness(1)', opacity: 0.7 },
      { filter: 'brightness(1.08)', opacity: 1, offset: 0.4 },
      { filter: 'brightness(1)', opacity: 1 },
    ],
  },
  activeTabText: {
    out: [],
    in: [
      { filter: 'brightness(0.6)', opacity: 0.7 },
      { filter: 'brightness(1.1)', opacity: 1, offset: 0.5 },
      { filter: 'brightness(1)', opacity: 1 },
    ],
  },

  fadeOutUp: {
    out: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-8px)' },
    ],
    in: [
      { opacity: 0, transform: 'translateY(-8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
  },
  fadeOutDown: {
    out: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(8px)' },
    ],
    in: [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
  },

  slideOutUp: {
    out: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-12px)' },
    ],
    in: [
      { opacity: 0, transform: 'translateY(-12px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
  },
  slideOutDown: {
    out: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(12px)' },
    ],
    in: [
      { opacity: 0, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
  },
  slideOutLeft: {
    out: [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(-14px)' },
    ],
    in: [
      { opacity: 0, transform: 'translateX(-14px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ],
  },
  slideOutRight: {
    out: [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(14px)' },
    ],
    in: [
      { opacity: 0, transform: 'translateX(14px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ],
  },

  scaleOut: {
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.9)', opacity: 0 },
    ],
    in: [
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
  },
  popOut: {
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.05)', opacity: 0.3, offset: 0.4 },
      { transform: 'scale(0.9)', opacity: 0 },
    ],
    in: [
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1.05)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1)', opacity: 1 },
    ],
  },

  blurOut: {
    out: [
      { filter: 'blur(0)', opacity: 1 },
      { filter: 'blur(4px)', opacity: 0 },
    ],
    in: [
      { filter: 'blur(4px)', opacity: 0 },
      { filter: 'blur(0)', opacity: 1 },
    ],
  },
  clipOut: {
    out: [
      { clipPath: 'inset(0 0 0 0)', opacity: 1 },
      { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
    ],
    in: [
      { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
      { clipPath: 'inset(0 0 0 0)', opacity: 1 },
    ],
  },

  strikeOut: {
    out: [],
    in: [],
  },
  typeOut: {
    out: [],
    in: [],
  },
  scrambleOut: {
    out: [],
    in: [],
  },
}
