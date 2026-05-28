"use client"

import { motion, HTMLMotionProps } from "framer-motion"

export function MotionCard(props: HTMLMotionProps<"div">) {
  return <motion.div {...props} />
}
