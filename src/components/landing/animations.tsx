"use client";

import type { ReactNode } from "react";
import { MotionConfig, motion, stagger, type HTMLMotionProps } from "motion/react";

// The landing page's entrance animations. Each plays once, when its element scrolls into view.

const ease = [0.22, 1, 0.36, 1] as const;
const viewport = { once: true, amount: 0.2 };

// Where each effect starts from. "visible" carries the timing, so a group only has to add the delays.
const effects = {
  up: { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } },
  left: { hidden: { opacity: 0, x: -48 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease } } },
  right: { hidden: { opacity: 0, x: 48 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease } } },
  zoom: { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.9, ease } } },
};

type Effect = keyof typeof effects;

// Plays the effect on itself.
export function Reveal({ effect = "up", delay = 0, ...props }: HTMLMotionProps<"div"> & { effect?: Effect; delay?: number }) {
  const { hidden, visible } = effects[effect];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={{ hidden, visible: { ...visible, transition: { ...visible.transition, delay } } }}
      {...props}
    />
  );
}

// Doesn't move itself, but plays the RevealItems inside it one after another.
export function RevealGroup({
  stagger: interval = 0.12,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { stagger?: number; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={{ visible: { transition: { delayChildren: stagger(interval, { startDelay: delay }) } } }}
      {...props}
    />
  );
}

// Plays the effect in its turn, once its RevealGroup scrolls into view.
export function RevealItem({ effect = "up", ...props }: HTMLMotionProps<"div"> & { effect?: Effect }) {
  return <motion.div variants={effects[effect]} {...props} />;
}

// Bobs gently up and down.
export function Float(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
      {...props}
    />
  );
}

// Visitors whose device asks for reduced motion get the fades only, without the sliding, zooming and floating.
export function ReducedMotionConfig({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
