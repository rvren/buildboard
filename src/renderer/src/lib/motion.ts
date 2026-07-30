import type { Transition, Variants } from "framer-motion";

/**
 * Centralized motion language so interactions feel consistent and "pro" —
 * short, spring-based, never gratuitous. Framer Motion automatically respects
 * the OS `prefers-reduced-motion` setting when `MotionConfig reducedMotion`
 * is set (see App.tsx).
 */

export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};

export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
};

export const ease: Transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
};

/** Page/route transition. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
};

/** Staggered container for lists/grids. */
export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.045, delayChildren: 0.02 },
  },
};

/** Item that rises + fades in (dashboard cards, etc.). */
export const riseItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } },
};

/** Row that slides/fades (layers, list rows). */
export const listRow: Variants = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0, transition: softSpring },
  exit: { opacity: 0, x: -6, transition: { duration: 0.12 } },
};

/** Pop-in for newly dropped nodes / mounted frames. */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: spring },
};

/** Dialog / popover content. */
export const dialogPop: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.12 } },
};

/** Common button/tile hover + tap. */
export const tapScale = { whileHover: { y: -1 }, whileTap: { scale: 0.97 } };
