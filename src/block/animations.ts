import type { BlockAnimationPreset, AnimationDefinition, PresetCategory } from "./types"

export const EASE_IN = "cubic-bezier(0.0, 0.0, 0.2, 1)"
export const EASE_OUT = "cubic-bezier(0.4, 0.0, 1, 1)"
export const EASE_IN_OUT = "cubic-bezier(0.4, 0.0, 0.2, 1)"
export const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)"
export const SNAPPY = "cubic-bezier(0.2, 0, 0, 1)"
export const SMOOTH = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"

export const presetCategory: Record<string, PresetCategory> = {
  fadeIn: "oneshot", fadeOut: "oneshot", fadeSwap: "oneshot",
  slideUp: "oneshot", slideDown: "oneshot", slideLeft: "oneshot", slideRight: "oneshot",
  scaleIn: "oneshot", scaleOut: "oneshot", popIn: "oneshot", popOut: "oneshot",
  rotateIn: "oneshot", rotateOut: "oneshot", flipX: "oneshot", flipY: "oneshot",
  bounceIn: "oneshot", bounceOut: "oneshot",
  shake: "oneshot", wiggle: "oneshot", jello: "oneshot", flash: "oneshot", heartBeat: "oneshot",
  glideIn: "oneshot", glideOut: "oneshot", dropIn: "oneshot", riseUp: "oneshot",
  expandIn: "oneshot", collapseOut: "oneshot", expandHeight: "oneshot", fadeSlideUp: "oneshot",
  blurIn: "oneshot", blurOut: "oneshot",
  clipUp: "oneshot", clipLeft: "oneshot",
  zoomIn: "oneshot", zoomOut: "oneshot",
  springBounce: "oneshot", springScale: "oneshot", springSlideUp: "oneshot", springSlideDown: "oneshot",
  morphRadius: "oneshot", morphCircle: "oneshot",
  press: "oneshot",
  parallax: "scrollLink", parallaxFast: "scrollLink", parallaxReverse: "scrollLink",
  tiltScroll: "scrollLink", scaleScroll: "scrollLink",
  lift: "hoverState", sink: "hoverState", grow: "hoverState",
  glow: "hoverState", shadow: "hoverState", borderPop: "hoverState",
  tilt: "cursorTrack", tilt3D: "cursorTrack", rotate3D: "cursorTrack", depth: "cursorTrack",
  float: "continuous",
  pulse: "continuous",
  spin: "continuous", ping: "continuous", shimmer: "continuous",
  ripple: "overlay", burst: "overlay",
  modalIn: "oneshot", modalOut: "oneshot",
  popoverIn: "oneshot", popoverOut: "oneshot",
  toastIn: "oneshot", toastOut: "oneshot",
  successCheckIn: "oneshot", buttonLoading: "oneshot",
  focusRingPulse: "continuous",
  tabPanelIn: "oneshot",
  tabPanelOut: "oneshot",
  successToast: "oneshot",
  checkboxCheck: "oneshot",
  dialogOut: "oneshot", drawerOutLeft: "oneshot", drawerOutRight: "oneshot", drawerOutTop: "oneshot", drawerOutBottom: "oneshot",
  menuOut: "oneshot", toastOutRight: "oneshot", toastOutUp: "oneshot", collapseWidth: "oneshot", dismissOut: "oneshot", errorOut: "oneshot", successOut: "oneshot",
}

export const presets: Record<string, AnimationDefinition> = {
  fadeIn: {
    in: [{ opacity: 0 }, { opacity: 1 }],
    out: [{ opacity: 1 }, { opacity: 0 }],
  },
  fadeOut: {
    in: [{ opacity: 0 }, { opacity: 1 }],
    out: [{ opacity: 1 }, { opacity: 0 }],
  },
  fadeSwap: {
    in: [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 0.72, transform: "translateY(2px)", offset: 0.58 },
      { opacity: 1, transform: "translateY(0)" },
    ],
    out: [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-10px)" },
    ],
  },
  slideUp: {
    in: [
      { opacity: 0, transform: "translateY(32px)" },
      { opacity: 0.76, transform: "translateY(7px)", offset: 0.62 },
      { opacity: 1, transform: "translateY(0)" },
    ],
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-24px)" }],
  },
  slideDown: {
    in: [
      { opacity: 0, transform: "translateY(-32px)" },
      { opacity: 0.76, transform: "translateY(-7px)", offset: 0.62 },
      { opacity: 1, transform: "translateY(0)" },
    ],
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(24px)" }],
  },
  slideLeft: {
    in: [
      { opacity: 0, transform: "translateX(-32px)" },
      { opacity: 0.76, transform: "translateX(-7px)", offset: 0.62 },
      { opacity: 1, transform: "translateX(0)" },
    ],
    out: [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-24px)" }],
  },
  slideRight: {
    in: [
      { opacity: 0, transform: "translateX(32px)" },
      { opacity: 0.76, transform: "translateX(7px)", offset: 0.62 },
      { opacity: 1, transform: "translateX(0)" },
    ],
    out: [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(24px)" }],
  },
  scaleIn: {
    in: [{ opacity: 0, transform: "scale(0.9)" }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.9)" }],
  },
  scaleOut: {
    in: [{ opacity: 0, transform: "scale(0.9)" }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.9)" }],
  },
  popIn: {
    in: [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1.04)", offset: 0.6 }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.92)" }],
  },
  popOut: {
    in: [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.05)", offset: 0.45 }, { opacity: 0, transform: "scale(0.92)" }],
  },
  rotateIn: {
    in: [{ opacity: 0, transform: "rotate(-12deg) scale(0.9)" }, { opacity: 1, transform: "rotate(0deg) scale(1)" }],
    out: [{ opacity: 1, transform: "rotate(0deg) scale(1)" }, { opacity: 0, transform: "rotate(12deg) scale(0.9)" }],
  },
  rotateOut: {
    in: [{ opacity: 0, transform: "rotate(-12deg) scale(0.9)" }, { opacity: 1, transform: "rotate(0deg) scale(1)" }],
    out: [{ opacity: 1, transform: "rotate(0deg) scale(1)" }, { opacity: 0, transform: "rotate(12deg) scale(0.9)" }],
  },
  flipX: {
    in: [{ opacity: 0, transform: "perspective(600px) rotateX(-90deg)" }, { opacity: 1, transform: "perspective(600px) rotateX(0deg)" }],
    out: [{ opacity: 1, transform: "perspective(600px) rotateX(0deg)" }, { opacity: 0, transform: "perspective(600px) rotateX(90deg)" }],
  },
  flipY: {
    in: [{ opacity: 0, transform: "perspective(600px) rotateY(-90deg)" }, { opacity: 1, transform: "perspective(600px) rotateY(0deg)" }],
    out: [{ opacity: 1, transform: "perspective(600px) rotateY(0deg)" }, { opacity: 0, transform: "perspective(600px) rotateY(90deg)" }],
  },
  bounceIn: {
    in: [{ opacity: 0, transform: "scale(0.9)" }, { opacity: 1, transform: "scale(1.05)", offset: 0.55 }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.9)" }],
  },
  bounceOut: {
    in: [{ opacity: 0, transform: "scale(0.9)" }, { opacity: 1, transform: "scale(1.05)", offset: 0.55 }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.04)", offset: 0.45 }, { opacity: 0, transform: "scale(0.9)" }],
  },
  shake: {
    in: [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 1, transform: "translateX(-6px)", offset: 0.15 },
      { opacity: 1, transform: "translateX(6px)", offset: 0.3 },
      { opacity: 1, transform: "translateX(-4px)", offset: 0.45 },
      { opacity: 1, transform: "translateX(4px)", offset: 0.6 },
      { opacity: 1, transform: "translateX(-2px)", offset: 0.75 },
      { opacity: 1, transform: "translateX(2px)", offset: 0.9 },
      { opacity: 1, transform: "translateX(0)" },
    ],
    out: [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(-6px)" }],
  },
  wiggle: {
    in: [
      { opacity: 1, transform: "rotate(0deg)" },
      { opacity: 1, transform: "rotate(8deg)", offset: 0.2 },
      { opacity: 1, transform: "rotate(-6deg)", offset: 0.4 },
      { opacity: 1, transform: "rotate(4deg)", offset: 0.6 },
      { opacity: 1, transform: "rotate(-2deg)", offset: 0.8 },
      { opacity: 1, transform: "rotate(0deg)" },
    ],
    out: [{ opacity: 1, transform: "rotate(0deg)" }, { opacity: 0, transform: "rotate(8deg)" }],
  },
  jello: {
    in: [
      { opacity: 1, transform: "scale(1, 1)" },
      { opacity: 1, transform: "scale(1.06, 0.96)", offset: 0.25 },
      { opacity: 1, transform: "scale(0.97, 1.04)", offset: 0.5 },
      { opacity: 1, transform: "scale(1.02, 0.99)", offset: 0.75 },
      { opacity: 1, transform: "scale(1, 1)" },
    ],
    out: [{ opacity: 1, transform: "scale(1, 1)" }, { opacity: 0, transform: "scale(0.9, 0.9)" }],
  },
  flash: {
    in: [
      { opacity: 1 },
      { opacity: 0.72, offset: 0.28 },
      { opacity: 1, offset: 0.5 },
      { opacity: 0.78, offset: 0.78 },
      { opacity: 1 },
    ],
    out: [{ opacity: 1 }, { opacity: 0 }],
  },
  heartBeat: {
    in: [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 1, transform: "scale(1.12)", offset: 0.15 },
      { opacity: 1, transform: "scale(1)", offset: 0.3 },
      { opacity: 1, transform: "scale(1.12)", offset: 0.45 },
      { opacity: 1, transform: "scale(1)", offset: 0.6 },
      { opacity: 1, transform: "scale(1.06)", offset: 0.75 },
      { opacity: 1, transform: "scale(1)" },
    ],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.85)" }],
  },
  glideIn: {
    in: [
      { opacity: 0, transform: "translateY(24px) scale(0.97)" },
      { opacity: 0.82, transform: "translateY(5px) scale(0.995)", offset: 0.62 },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    out: [{ opacity: 1, transform: "translateY(0) scale(1)" }, { opacity: 0, transform: "translateY(-18px) scale(0.97)" }],
  },
  glideOut: {
    in: [
      { opacity: 0, transform: "translateY(24px) scale(0.97)" },
      { opacity: 0.82, transform: "translateY(5px) scale(0.995)", offset: 0.62 },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    out: [{ opacity: 1, transform: "translateY(0) scale(1)" }, { opacity: 0, transform: "translateY(-18px) scale(0.97)" }],
  },
  dropIn: {
    in: [{ opacity: 0, transform: "translateY(-30px)" }, { opacity: 1, transform: "translateY(3px)", offset: 0.7 }, { opacity: 1, transform: "translateY(0)" }],
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-30px)" }],
  },
  riseUp: {
    in: [{ opacity: 0, transform: "translateY(30px)" }, { opacity: 1, transform: "translateY(-3px)", offset: 0.7 }, { opacity: 1, transform: "translateY(0)" }],
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(30px)" }],
  },
  expandIn: {
    in: [{ opacity: 0, transform: "scaleX(0.9)" }, { opacity: 1, transform: "scaleX(1)" }],
    out: [{ opacity: 1, transform: "scaleX(1)" }, { opacity: 0, transform: "scaleX(0.9)" }],
  },
  collapseOut: {
    in: [{ opacity: 0, transform: "scaleX(0.9)" }, { opacity: 1, transform: "scaleX(1)" }],
    out: [{ opacity: 1, transform: "scaleX(1)" }, { opacity: 0, transform: "scaleX(0.9)" }],
  },
  expandHeight: {
    in: [{ opacity: 0, transform: "scaleY(0.5)", transformOrigin: "top" }, { opacity: 1, transform: "scaleY(1)", transformOrigin: "top" }],
    out: [{ opacity: 1, transform: "scaleY(1)", transformOrigin: "top" }, { opacity: 0, transform: "scaleY(0.5)", transformOrigin: "top" }],
  },
  fadeSlideUp: {
    in: [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }],
    out: [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-16px)" }],
  },
  blurIn: {
    in: [{ opacity: 0, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)" }],
    out: [{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(4px)" }],
  },
  blurOut: {
    in: [{ opacity: 0, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)" }],
    out: [{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(4px)" }],
  },
  clipUp: {
    in: [
      { opacity: 0, transform: "translateY(10px)", clipPath: "inset(100% 0 0 0)" },
      { opacity: 1, transform: "translateY(0)", clipPath: "inset(0 0 0 0)" },
    ],
    out: [
      { opacity: 1, transform: "translateY(0)", clipPath: "inset(0 0 0 0)" },
      { opacity: 0, transform: "translateY(-8px)", clipPath: "inset(0 0 100% 0)" },
    ],
  },
  clipLeft: {
    in: [
      { opacity: 0, transform: "translateX(10px)", clipPath: "inset(0 100% 0 0)" },
      { opacity: 1, transform: "translateX(0)", clipPath: "inset(0 0 0 0)" },
    ],
    out: [
      { opacity: 1, transform: "translateX(0)", clipPath: "inset(0 0 0 0)" },
      { opacity: 0, transform: "translateX(-8px)", clipPath: "inset(0 0 0 100%)" },
    ],
  },
  zoomIn: {
    in: [{ opacity: 0, transform: "scale(0.85)" }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.85)" }],
  },
  zoomOut: {
    in: [{ opacity: 0, transform: "scale(1.15)" }, { opacity: 1, transform: "scale(1)" }],
    out: [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.15)" }],
  },
  springBounce: {
    in: [
      { transform: "scale(0)", opacity: 0 },
      { transform: "scale(1.15)", opacity: 1, offset: 0.55 },
      { transform: "scale(0.92)", offset: 0.72 },
      { transform: "scale(1.03)", offset: 0.85 },
      { transform: "scale(1)" },
    ],
    out: [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.1)", opacity: 0.3, offset: 0.3 },
      { transform: "scale(0)", opacity: 0 },
    ],
  },
  springScale: {
    in: [
      { transform: "scale(0.6)", opacity: 0 },
      { transform: "scale(1.08)", opacity: 1, offset: 0.6 },
      { transform: "scale(0.96)", offset: 0.8 },
      { transform: "scale(1)" },
    ],
    out: [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(0.6)", opacity: 0 },
    ],
  },
  springSlideUp: {
    in: [
      { transform: "translateY(40px)", opacity: 0 },
      { transform: "translateY(-6px)", opacity: 1, offset: 0.6 },
      { transform: "translateY(2px)", offset: 0.8 },
      { transform: "translateY(0)" },
    ],
    out: [
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(-20px)", opacity: 0 },
    ],
  },
  springSlideDown: {
    in: [
      { transform: "translateY(-40px)", opacity: 0 },
      { transform: "translateY(6px)", opacity: 1, offset: 0.6 },
      { transform: "translateY(-2px)", offset: 0.8 },
      { transform: "translateY(0)" },
    ],
    out: [
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(20px)", opacity: 0 },
    ],
  },
  morphRadius: {
    in: [
      { borderRadius: "12px", opacity: 0 },
      { borderRadius: "0px", opacity: 1 },
    ],
    out: [
      { borderRadius: "0px", opacity: 1 },
      { borderRadius: "12px", opacity: 0 },
    ],
  },
  morphCircle: {
    in: [
      { borderRadius: "50%", opacity: 0 },
      { borderRadius: "8px", opacity: 1, offset: 0.5 },
      { borderRadius: "12px", opacity: 1 },
    ],
    out: [
      { borderRadius: "12px", opacity: 1 },
      { borderRadius: "50%", opacity: 0 },
    ],
  },
  press: {
    in: [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.96)", opacity: 1 }],
    out: [{ transform: "scale(0.96)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }],
  },
  modalIn: {
    in: [
      { transform: 'scale(0.85)', opacity: 0 },
      { transform: 'scale(1.02)', opacity: 1, offset: 0.65 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.9)', opacity: 0 },
    ],
  },
  modalOut: {
    in: [],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.85)', opacity: 0 },
    ],
  },
  popoverIn: {
    in: [
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1.05)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.95)', opacity: 0 },
    ],
  },
  popoverOut: {
    in: [],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.9)', opacity: 0 },
    ],
  },
  toastIn: {
    in: [
      { transform: 'translateY(-24px)', opacity: 0 },
      { transform: 'translateY(2px)', opacity: 1, offset: 0.7 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    out: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-12px)', opacity: 0 },
    ],
  },
  toastOut: {
    in: [],
    out: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-12px)', opacity: 0 },
    ],
  },
  successCheckIn: {
    in: [
      { transform: 'scale(0.4)', opacity: 0 },
      { transform: 'scale(1.15)', opacity: 1, offset: 0.55 },
      { transform: 'scale(0.92)', offset: 0.75 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.6)', opacity: 0 },
    ],
  },
  buttonLoading: {
    in: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.96)', opacity: 0.7 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    out: [],
  },
  focusRingPulse: {
    in: [],
    out: [],
  },
  tabPanelIn: {
    in: [
      { transform: 'translateX(16px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    out: [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(-16px)', opacity: 0 },
    ],
  },
  tabPanelOut: {
    in: [],
    out: [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(-16px)', opacity: 0 },
    ],
  },
  successToast: {
    in: [
      { transform: 'translateY(24px) scale(0.9)', opacity: 0 },
      { transform: 'translateY(-2px) scale(1.02)', opacity: 1, offset: 0.6 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    out: [
      { transform: 'translateY(0) scale(1)', opacity: 1 },
      { transform: 'translateY(-8px) scale(0.98)', opacity: 0 },
    ],
  },
  checkboxCheck: {
    in: [
      { transform: 'scale(0) rotate(-45deg)', opacity: 0 },
      { transform: 'scale(1.15) rotate(0deg)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
    ],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0)', opacity: 0 },
    ],
  },
  dialogOut: {
    in: [],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.95)', opacity: 0 },
    ],
  },
  drawerOutLeft: {
    in: [],
    out: [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(-100%)', opacity: 0 },
    ],
  },
  drawerOutRight: {
    in: [],
    out: [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(100%)', opacity: 0 },
    ],
  },
  drawerOutTop: {
    in: [],
    out: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-100%)', opacity: 0 },
    ],
  },
  drawerOutBottom: {
    in: [],
    out: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(100%)', opacity: 0 },
    ],
  },
  menuOut: {
    in: [],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.95)', opacity: 0 },
    ],
  },
  toastOutRight: {
    in: [],
    out: [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(24px)', opacity: 0 },
    ],
  },
  toastOutUp: {
    in: [],
    out: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-16px)', opacity: 0 },
    ],
  },
  collapseWidth: {
    in: [],
    out: [
      { maxWidth: '100%', opacity: 1, overflow: 'hidden' },
      { maxWidth: '0px', opacity: 0, overflow: 'hidden' },
    ],
  },
  dismissOut: {
    in: [],
    out: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(8px) scale(0.96)', opacity: 0 },
    ],
  },
  errorOut: {
    in: [],
    out: [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(-4px)', offset: 0.2 },
      { transform: 'translateX(4px)', offset: 0.4 },
      { transform: 'translateX(-2px)', offset: 0.6 },
      { transform: 'translateX(0)', opacity: 0, offset: 0.8 },
    ],
  },
  successOut: {
    in: [],
    out: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.1)', opacity: 0.3, offset: 0.4 },
      { transform: 'scale(0.9)', opacity: 0 },
    ],
  },
}
