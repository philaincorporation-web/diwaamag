"use client";

import { MotionConfig as Config } from "motion/react";

/** Toutes les animations Framer Motion respectent « réduire les animations » du système. */
export function MotionConfig({ children }: { children: React.ReactNode }) {
  return <Config reducedMotion="user">{children}</Config>;
}
