import { motion } from 'motion/react'
import './Galeria.css'

// As quatro frases marcadas com "provisória" serão trocadas pelas suas.
const FOTOS = [
  { arquivo: 'distancia', frase: 'Não importam os quilômetros entre nós; você sempre foi a pessoa mais próxima de mim.' },
  { arquivo: 'shrek', frase: 'O ogro encontrou a princesa dele.' },
  { arquivo: 'resident-evil', frase: 'Até os jogos de terror ficaram mais bonitos com você.' },
  { arquivo: 'broad-peak', frase: 'A montanha mais alta que eu já conquistei.' },
  { arquivo: 'mario-peach', frase: 'Atravessei mundos inteiros para chegar até você.' }, // provisória
  { arquivo: 'fisioterapia', frase: 'Você cuida de mim até nas partes que eu não sabia que doíam.' }, // provisória
  { arquivo: 'aeroporto', frase: 'O abraço que eu ensaiei durante meses.' }, // provisória
  { arquivo: 'casamento', frase: 'E a estrada continua, agora com você do meu lado.' }, // provisória
]

function Galeria() {
  return (
    <div className="galeria">
      <h2 className="galeria-titulo">Nossas Memórias</h2>

      {FOTOS.map((foto, i) => (
        <motion.figure
          key={foto.arquivo}
          className="polaroid"
          initial={{ opacity: 0, y: 60, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -3 : 3 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={`/fotos/${foto.arquivo}.webp`} alt="" loading="lazy" />
          <figcaption>{foto.frase}</figcaption>
        </motion.figure>
      ))}
    </div>
  )
}

export default Galeria