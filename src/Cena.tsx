import { motion } from 'motion/react'
import type { ReactNode } from 'react'

function Cena({ children }: { children: ReactNode }) {
  return (
    <motion.section
      className="cena"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  )
}

export default Cena