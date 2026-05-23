import type { ListAnimationPreset, AnimationDefinition } from "./types"

export const EASE_IN = "cubic-bezier(0.0, 0.0, 0.2, 1)"
export const EASE_OUT = "cubic-bezier(0.4, 0.0, 1, 1)"
export const EASE_IN_OUT = "cubic-bezier(0.4, 0.0, 0.2, 1)"
export const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)"
export const SNAPPY = "cubic-bezier(0.2, 0, 0, 1)"
export const SMOOTH = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"

const SPRING_EASE = SPRING
const SMOOTH_EASE = SMOOTH
const SNAPPY_EASE = SNAPPY

export const enterPresets: Record<string, AnimationDefinition> = {
  // ── Stagger ──
  staggerFadeIn: {
    keyframes: [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
    options: { duration: 280, easing: SPRING_EASE },
  },
  staggerSlideUp: {
    keyframes: [{ transform: "translateY(14px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    options: { duration: 300, easing: SPRING_EASE },
  },
  staggerSlideLeft: {
    keyframes: [{ transform: "translateX(20px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
    options: { duration: 300, easing: SPRING_EASE },
  },
  staggerZoomIn: {
    keyframes: [{ transform: "scale(0.88)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
    options: { duration: 320, easing: SPRING_EASE },
  },
  staggerPopIn: {
    keyframes: [
      { transform: "scale(0.88)", opacity: 0 },
      { transform: "scale(1.04)", opacity: 1, offset: 0.6 },
      { transform: "scale(0.99)", opacity: 1, offset: 0.82 },
      { transform: "scale(1)", opacity: 1 },
    ],
    options: { duration: 340, easing: SPRING_EASE },
  },
  stackIn: {
    keyframes: [{ transform: "translateY(24px) scale(0.93)", opacity: 0 }, { transform: "translateY(0) scale(1)", opacity: 1 }],
    options: { duration: 350, easing: SMOOTH_EASE },
  },

  // ── Cascade ──
  wordCascade: {
    keyframes: [{ transform: "translateY(12px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    options: { duration: 280, easing: SMOOTH_EASE },
  },
  wordWave: {
    keyframes: [
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(-10px)", opacity: 1, offset: 0.5 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    options: { duration: 360, easing: SMOOTH_EASE },
  },
  wordDrop: {
    keyframes: [{ transform: "translateY(-18px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    options: { duration: 320, easing: SMOOTH_EASE },
  },
  wordFadeIn: {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 260, easing: SMOOTH_EASE },
  },

  // ── Marquee (keyframes handled by runtime) ──
  marquee: { keyframes: [] },
  marqueeReverse: { keyframes: [] },
  marqueeFade: { keyframes: [] },

  // ── Scroll-linked collection motion (handled by runtime) ──
  parallax: { keyframes: [] },
  parallaxFast: { keyframes: [] },
  parallaxReverse: { keyframes: [] },
  tiltScroll: { keyframes: [] },
  scaleScroll: { keyframes: [] },
  parallaxStagger: { keyframes: [] },

  // ── Presence ──
  itemFadeIn: { keyframes: [{ opacity: 0 }, { opacity: 1 }], options: { duration: 220, easing: SPRING_EASE } },
  itemSlideIn: {
    keyframes: [{ transform: "translateY(12px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    options: { duration: 250, easing: SPRING_EASE },
  },
  itemPopIn: {
    keyframes: [{ transform: "scale(0.9)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
    options: { duration: 250, easing: SNAPPY_EASE },
  },
  itemBounceIn: {
    keyframes: [
      { transform: "scale(0.88)", opacity: 0 },
      { transform: "scale(1.06)", opacity: 1, offset: 0.45 },
      { transform: "scale(0.98)", opacity: 1, offset: 0.68 },
      { transform: "scale(1)", opacity: 1 },
    ],
    options: { duration: 320, easing: SPRING_EASE },
  },
  itemFadeOut: { keyframes: [{ opacity: 1 }, { opacity: 0 }], options: { duration: 180, easing: EASE_OUT } },
  itemSlideOut: {
    keyframes: [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-14px)", opacity: 0 }],
    options: { duration: 210, easing: EASE_OUT },
  },
  itemCollapseOut: {
    keyframes: [{ transform: "scaleY(1)", opacity: 1, transformOrigin: "top" }, { transform: "scaleY(0)", opacity: 0, transformOrigin: "top" }],
    options: { duration: 230, easing: EASE_OUT },
  },

  // ── Reorder tokens (handled by runtime) ──
  flip: { keyframes: [{ transform: "translate(0, 0)" }, { transform: "translate(0, 0)" }] },
  smooth: { keyframes: [{ transform: "translate(0, 0)" }, { transform: "translate(0, 0)" }] },
  spring: { keyframes: [{ transform: "translate(0, 0)" }, { transform: "translate(0, 0)" }] },
  none: { keyframes: [] },
}

// Distinct legacy aliases (not references — each has its own identity)
const extended: Record<string, AnimationDefinition> = {
  fadeIn:      { keyframes: [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], options: { duration: 300, easing: SMOOTH_EASE } },
  slideIn:     { keyframes: [{ transform: "translateY(20px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], options: { duration: 320, easing: SMOOTH_EASE } },
  slideInLeft: { keyframes: [{ transform: "translateX(-20px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], options: { duration: 300, easing: SPRING_EASE } },
  slideInRight:{ keyframes: [{ transform: "translateX(20px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], options: { duration: 300, easing: SPRING_EASE } },
  popIn: {
    keyframes: [
      { transform: "scale(0.9)", opacity: 0 },
      { transform: "scale(1.05)", opacity: 1, offset: 0.55 },
      { transform: "scale(0.99)", opacity: 1, offset: 0.78 },
      { transform: "scale(1)", opacity: 1 },
    ],
    options: { duration: 320, easing: SPRING_EASE },
  },
  bounceIn: {
    keyframes: [
      { transform: "translateY(10px) scale(0.9)", opacity: 0 },
      { transform: "translateY(-6px) scale(1.06)", opacity: 1, offset: 0.45 },
      { transform: "translateY(2px) scale(0.99)", opacity: 1, offset: 0.7 },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ],
    options: { duration: 340, easing: SPRING_EASE },
  },
  expandIn:   { keyframes: [{ transform: "scaleY(0.85)", opacity: 0, transformOrigin: "top" }, { transform: "scaleY(1)", opacity: 1, transformOrigin: "top" }], options: { duration: 300, easing: SPRING_EASE } },
  flipIn: {
    keyframes: [
      { transform: "perspective(500px) rotateX(-75deg)", opacity: 0 },
      { transform: "perspective(500px) rotateX(4deg)", opacity: 1, offset: 0.75 },
      { transform: "perspective(500px) rotateX(0deg)", opacity: 1 },
    ],
    options: { duration: 380, easing: SMOOTH_EASE },
  },
  glideIn:    { keyframes: [{ transform: "translateX(-12px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], options: { duration: 280, easing: SMOOTH_EASE } },

  // Exit aliases — reverses of their enter counterparts
  fadeOut:      { keyframes: [{ opacity: 1 }, { opacity: 0 }], options: { duration: 180, easing: EASE_OUT } },
  slideOut:     { keyframes: [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(20px)", opacity: 0 }], options: { duration: 210, easing: EASE_OUT } },
  slideOutLeft: { keyframes: [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-20px)", opacity: 0 }], options: { duration: 210, easing: EASE_OUT } },
  slideOutRight:{ keyframes: [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(20px)", opacity: 0 }], options: { duration: 210, easing: EASE_OUT } },
  popOut: {
    keyframes: [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.03)", opacity: 1, offset: 0.3 },
      { transform: "scale(0.9)", opacity: 0 },
    ],
    options: { duration: 210, easing: EASE_OUT },
  },
  bounceOut: {
    keyframes: [
      { transform: "scale(1)", opacity: 1 },
      { transform: "translateY(-4px) scale(1.04)", opacity: 1, offset: 0.32 },
      { transform: "translateY(8px) scale(0.9)", opacity: 0 },
    ],
    options: { duration: 240, easing: EASE_OUT },
  },
  collapseOut: {
    keyframes: [{ transform: "scaleY(1)", opacity: 1, transformOrigin: "top" }, { transform: "scaleY(0)", opacity: 0, transformOrigin: "top" }],
    options: { duration: 230, easing: EASE_OUT },
  },
  flipOut: {
    keyframes: [
      { transform: "perspective(500px) rotateX(0deg)", opacity: 1 },
      { transform: "perspective(500px) rotateX(75deg)", opacity: 0 },
    ],
    options: { duration: 250, easing: EASE_OUT },
  },
  glideOut: { keyframes: [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-12px)", opacity: 0 }], options: { duration: 200, easing: EASE_OUT } },

  staggerBlurIn: {
    keyframes: [
      { filter: 'blur(8px)', opacity: 0 },
      { filter: 'blur(0px)', opacity: 1 },
    ],
    options: { duration: 400, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' },
  },
  feedAppend: {
    keyframes: [
      { transform: 'translateY(-20px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    options: { duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
  },
  filterIn: {
    keyframes: [
      { transform: 'scale(0.85)', opacity: 0 },
      { transform: 'scale(1.03)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    options: { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
  },
  emptyToList: {
    keyframes: [
      { transform: 'translateY(10px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    options: { duration: 400, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' },
  },
}

// Merge enterPresets + extended into a single lookup, typed as the union
const merged = { ...enterPresets, ...extended } as Record<string, AnimationDefinition>
export const presets = merged as Record<ListAnimationPreset, AnimationDefinition>
