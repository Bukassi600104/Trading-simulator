import type { Variants, Transition } from "framer-motion";

// Shared spring transition
const spring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

const smooth: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

// Page transitions
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

// Fade variants
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: smooth },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Slide up variants
export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: smooth },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

// Scale in variants (for modals, popovers)
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

// Card hover effect
export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  hover: {
    scale: 1.01,
    y: -2,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  tap: {
    scale: 0.99,
    transition: { duration: 0.1 },
  },
};

// Stagger children
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

// Sidebar nav item
export const navItem: Variants = {
  rest: { x: 0 },
  hover: { x: 4, transition: { duration: 0.2 } },
};

// Number counting animation config
export const numberSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
};

// Tab content transition
export const tabContent: Variants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0, transition: smooth },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
};

// Toast slide in/out
export const toastSlide: Variants = {
  initial: { opacity: 0, x: 100, scale: 0.95 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: spring,
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// Modal backdrop
export const backdrop: Variants = {
  initial: { opacity: 0, backdropFilter: "blur(0px)" },
  animate: { opacity: 1, backdropFilter: "blur(8px)", transition: { duration: 0.25 } },
  exit: { opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.2 } },
};

// Modal content
export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.2 } },
};

// Sidebar expand/collapse
export const sidebarExpand: Variants = {
  collapsed: { width: 64 },
  expanded: { width: 240, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

// Progress bar fill
export const progressFill = (width: number): Variants => ({
  initial: { width: 0 },
  animate: {
    width: `${width}%`,
    transition: { duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 },
  },
});

// Skeleton pulse
export const skeletonPulse: Variants = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
};
