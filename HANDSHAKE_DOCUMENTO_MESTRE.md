# HANDSHAKE — Documento mestre do projeto
**Atualizado em 18/11/2026 — especificação de produto e direção criativa**

## Objetivo
Handshake é um PWA criado como surpresa romântica para Ester, ligada à viagem de Lisboa a Campinas em 27/11/2026, e também um projeto de portfólio. É uma experiência predominantemente visual e contemplativa. Preservar o aplicativo existente e seu conteúdo.

## Tecnologia conhecida (conforme documentação anterior)
React 19, TypeScript, Vite, Motion (`motion/react`), `vite-plugin-pwa`, Cloudflare Workers, GitHub. Produção: https://handshake.gui4lemos.workers.dev. Arquivos relatados: `App.tsx`, `App.css`, `Cena.tsx`, `Voo.tsx`, `Voo.css`, `mapa.ts`, `Galeria.tsx`, `Galeria.css`, `Instalacao.tsx`, `Instalacao.css`, `Buque.tsx`. Verificar estado atual antes de alterar. A documentação anterior apontou problemas na instalação e modo de teste do voo; confirmar se persistem.

## Direção de arte aprovada
- Preto profundo, cinza carvão, violeta e reflexos azulados discretos.
- Minecraft como inspiração seletiva, especialmente obsidiana e fotografias voxel; não pixelar todo o site.
- Aparência cinematográfica e profissional, com luz e sombra realistas, profundidade, espaços bem proporcionados e hierarquia tipográfica. Preservar as fontes atuais aprovadas (Pixelify Sans e Inter conforme documentação).
- Sem corações decorativos, emojis, neon excessivo ou aparência de painel gamer.
- Névoa semitransparente, orgânica, com luz volumétrica difusa atravessando-a, inspirada visualmente na atmosfera do círculo do modo de voz, porém mais sutil.
- A mesma iluminação violeta conecta abertura, mapa, galeria e revelação final. Usar névoa nas transições principais, sem exagerar.

## Instalação e abertura
No desktop, entrar diretamente na experiência, sem obrigatoriedade de instalação. No iPhone, navegador apresenta primeiro tutorial intuitivo, estilo instruções Apple, para adicionar à Tela de Início. PWA aberto em modo standalone mostra a história diretamente. Não repetir tutorial se já está no modo correto. Explicar que é gratuito e dispensa App Store. Detectar permissões de notificações quando disponíveis e não pedir repetidamente; push exige consentimento explícito, PWA instalado e infraestrutura de envio. A instalação não pode ser comprovada com certeza absoluta pelo navegador iOS; usar `display-mode: standalone` e testes reais. Permissão de localização não é necessária para exibir uma rota estimada Lisboa–Brasil.

A abertura instalada mostra imediatamente uma obsidiana 3D grande, centralizada, com textura convincente, névoa e luz violeta. Sem botão de começar; apenas indicação sutil “Role para baixo”. Sem vinheta demorada.

## Narrativa e transições
Rolagem conduz cenas com aproximação, afastamento, dissolução e luz/nuvem volumétrica suave. Evitar espaços pretos longos e cortes secos. Da obsidiana, a câmera conduz ao mapa, inicialmente em Lisboa, revelando Atlântico e Brasil. Animações sofisticadas, mas não excessivas. Mesma qualidade visual no iPhone e no computador, com ajustes de desempenho internos.

## Mapa cinematográfico
Mapa quase em tela cheia no iPhone e amplo no desktop. Continentes suaves em cinza escuro, não pixelados. Avião branco minimalista e reconhecível, sem sprite em formato de emoji/seta. Rota curva contínua fina em violeta com halo difuso e névoa; trecho percorrido mais luminoso que trecho futuro. Marcadores discretos de Lisboa e Viracopos. Contagem discreta sobreposta, sem caixa neon ou barra de blocos.

**Datas confirmadas:**
- Partida: 27/11/2026 às 09:00 Lisboa = `2026-11-27T09:00:00Z`.
- Chegada prevista: 27/11/2026 às 16:20 São Paulo = `2026-11-27T19:20:00Z`.
- Duração programada: 10h20, ou 620 minutos.

**Estados:** antes da partida, avião parado em Lisboa, câmera focada em Lisboa e contagem até decolagem. Durante, posição calculada pelo tempo decorrido, câmera revela e acompanha rota e tempo até pouso. Depois, avião parado em Viracopos, câmera foca Brasil/Campinas e surge “A distância chegou ao fim.”. Em novas aberturas após chegada, manter foco no Brasil. Não exigir app aberto para avançar: recalcular com relógio em cada abertura/retomada. Mostrar discretamente “Trajeto estimado pelos horários previstos”; **não é rastreamento real**. O movimento e a posição não provam decolagem ou pouso efetivos.

## Oito Polaroids
Manter as oito imagens existentes e suas frases, sem substituir conteúdo. No iPhone, apresentar duas por tela/etapa; toque amplia suavemente, fundo escurece/desfoca, foto ganha profundidade e retorna ao fechar. No desktop, oito numa composição única como fotografias sobre mesa/exposição, pequenas inclinações, sombras naturais; hover eleva/ilumina e clique destaca no centro enquanto as demais recuam. Preservar a moldura e não transformar em cartões genéricos.

## Revelação do significado
Depois das Polaroids, transição para **HANDSHAKE**. Dois pontos de luz trocam sinais de handshake TCP estilizado `SYN → SYN-ACK → ACK`, com conexão visual. Explicar com clareza que, na tecnologia, handshake é uma troca inicial para estabelecer comunicação, e que a conexão do casal veio antes do primeiro abraço, mesmo à distância. Não sugerir que todos os protocolos usam SYN/SYN-ACK/ACK.

Em seguida, luz e névoa levam à água encontrando lava de fonte (referência Minecraft), formando obsidiana. Explicar que o bloco é resistente e permite construir portais, simbolizando duas histórias diferentes que se encontraram e abriram caminho para algo novo. Reutilizar visualmente a obsidiana inicial. Texto curto, legível e emocional, sem efeito de digitação letra a letra.

**Rascunho do texto Handshake:** “Na tecnologia, um handshake é o primeiro passo para estabelecer uma conexão. E foi assim com a gente: antes do primeiro abraço, mesmo longe, já tínhamos encontrado uma maneira de nos conectar.”

**Rascunho do texto obsidiana:** “No Minecraft, quando a água encontra uma fonte de lava, nasce a obsidiana. Eu escolhi esse bloco porque me lembra a gente: duas histórias diferentes que se encontraram e criaram algo forte, capaz de abrir caminhos para um mundo novo.”

Esses textos são propostas; podem receber ajustes pessoais.

## Som e notificações
Foi cogitada trilha instrumental original/licenciada, suave, com atmosfera de Minecraft, apenas na primeira experiência, mas **não há decisão final de implementação**. Evitar autoplay não consentido. Notificações esporádicas foram desejadas; exigem serviço push, permissão explícita e testes em iPhone. Não prometer entrega sem infraestrutura e validação. A documentação anterior considerava push adiado; resolver escopo antes de implementar.

## Requisitos de engenharia
Preservar código, conteúdos e links. Inspecionar repositório antes de editar. Preferir tecnologias leves (SVG, CSS, Motion) e usar 3D/WebGL somente quando acrescentar valor, especialmente na obsidiana. Testar Safari/iOS PWA, desktop, fusos, suspensão da aba, modo offline, permissão negada, desempenho, bateria e `prefers-reduced-motion`. Garantir navegação por teclado, Escape para fechar imagens, contraste, alvos de toque e fallback sem WebGL. Qualidade visual equivalente em dispositivos, sem exigir efeitos que prejudiquem fluidez.

## Ordem recomendada
1. Auditoria do estado atual e backup.
2. Sistema de luz, sombras, névoa e abertura.
3. Mapa, câmera e estados temporais.
4. Galeria responsiva e ampliação.
5. Revelação do nome e da obsidiana.
6. Tutorial de instalação e notificações (se viáveis).
7. Testes reais, polimento e publicação.

## Pendências
Confirmar código e assets atuais, frases definitivas de Polaroids, escopo de notificações, trilha sonora, eventuais horários atualizados da companhia e desempenho real no iPhone. Evitar afirmar que qualquer proposta já foi implementada.

## Ideia futura — fora do escopo
Possibilidade de transformar o conceito Handshake em aplicativo de relacionamentos, contando a origem como surpresa para a namorada. Não alterar o projeto atual por isso.
