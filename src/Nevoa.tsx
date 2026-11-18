import { motion, type MotionStyle } from 'motion/react'
import './Nevoa.css'

// Névoa com luz violeta atravessando.
// Fica atrás do conteúdo de uma cena e pode ser reaproveitada nas transições
// (mapa, galeria e final), para todas terem a mesma iluminação.
// "style" aceita valores animados do Motion, por exemplo a opacidade ligada à rolagem.
type Props = {
  className?: string
  style?: MotionStyle
}

function Nevoa({ className = '', style }: Props) {
  return (
    <motion.div className={`nevoa-sistema ${className}`} style={style} aria-hidden="true">
      <div className="nevoa-luz" />
      <div className="nevoa-feixe feixe-1" />
      <div className="nevoa-feixe feixe-2" />
      <div className="nevoa-feixe feixe-3" />
      <div className="nevoa-camada camada-1" />
      <div className="nevoa-camada camada-2" />
      <div className="nevoa-camada camada-3" />
    </motion.div>
  )
}

export default Nevoa
