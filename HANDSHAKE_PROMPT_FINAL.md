# PROMPT FINAL — IMPLEMENTAÇÃO DO HANDSHAKE

Você é um engenheiro frontend sênior e diretor de arte digital. Trabalhará no **PWA existente Handshake**, criado como surpresa romântica e projeto de portfólio. **Leia primeiro `HANDSHAKE_DOCUMENTO_MESTRE.md` inteiro.** Não recrie o site do zero, não descarte fotos/textos existentes, não mude as fontes aprovadas sem necessidade e não invente conteúdo.

**Antes de escrever código:** inspecione repositório, dependências, componentes, assets, build, responsividade e PWA. Faça backup/commit do estado funcional. Entregue um plano de alterações por arquivos e riscos. Implemente em etapas testáveis, sem quebrar produção.

## Direção artística
Interface cinematográfica premium: preto profundo, violeta controlado, cinzas escuros, sombras naturais, luz difusa, névoa orgânica semitransparente atravessada por feixes luminosos suaves. A luz da obsidiana deve criar continuidade entre cenas. Referências Minecraft pontuais, não pixelização generalizada. Sem corações, emojis decorativos, caixas neon ou aspecto de jogo amador. Respeitar hierarquia, espaçamento, legibilidade e tipografia atual. A mesma sofisticação visual no iPhone e desktop.

## Implementação
**1. Instalação e abertura:** no desktop, abrir experiência diretamente. No iPhone em navegador, mostrar tutorial intuitivo de adicionar à Tela de Início, com ilustrações simples e obsidiana ao fundo. Ao abrir em standalone, não repetir tutorial. Não pedir notificações repetidamente se já autorizadas; distinguir permissão negada de concedida e não bloquear indevidamente a experiência por impossibilidade técnica. O iOS não permite detectar com certeza a instalação a partir de uma aba do navegador. A abertura mostra de imediato uma obsidiana 3D grande, centralizada, névoa e luz violeta. Apenas “Role para baixo” discreto, sem botão de começar.

**2. Transições:** narrativa conduzida pela rolagem, com movimento de câmera, fade, aproximação e névoa iluminada em momentos importantes. Eliminar grandes espaços vazios e cortes bruscos. Da obsidiana, revelar Lisboa, Atlântico e Brasil progressivamente.

**3. Mapa:** ocupar quase toda a tela do iPhone e ser amplo no desktop. Continentes suaves cinza-escuro; avião branco minimalista claramente reconhecível; rota curva contínua violeta fina, halo/névoa difusa, trecho percorrido mais luminoso. Contagem discreta sobreposta; sem barra pixelada ou painel gamer. Antes da decolagem, foco Lisboa, avião parado e contagem até partida. Durante, posição estimada pelo tempo decorrido e câmera acompanhando trajetória. Depois, foco Campinas/Viracopos, avião parado e mensagem “A distância chegou ao fim.”. Em reaberturas após pouso, manter foco no Brasil.
Partida `2026-11-27T09:00:00Z`; chegada `2026-11-27T19:20:00Z` (16:20 Brasília); duração 620 minutos. Calcular `progress = clamp((Date.now() - partida)/(chegada - partida),0,1)` e recalcular em abertura, retomada e intervalos adequados. Identificar como **estimativa pelos horários programados, não GPS/rastreio real**.

**4. Polaroids:** manter oito fotos originais. iPhone: duas por tela/etapa; toque amplia com sombra e fundo suavemente desfocado. Desktop: oito em uma composição única de fotografias físicas, com inclinação/sombra sutil; hover eleva/ilumina e clique centraliza a escolhida. Fechamento intuitivo, incluindo Escape.

**5. Final:** após galeria, surgir HANDSHAKE e dois pontos trocando sinais TCP estilizados `SYN → SYN-ACK → ACK`, acompanhados de explicação acessível do nome e da conexão do casal. Depois, névoa conduz à água encontrando lava de fonte e formando obsidiana, com explicação do símbolo de resistência, encontro e portal. Reutilizar obsidiana da abertura. Textos claros e curtos; não reduzir a explicação a frases vagas. Usar rascunhos do documento mestre e preservar oportunidade de revisão.

**6. Qualidade:** otimizar para iPhone sem sacrificar o acabamento visual. Priorizar SVG/CSS/Motion; usar WebGL/3D onde agregar valor e prever fallback. Testar Safari instalado e navegador, desktop, fuso, suspensão, responsividade, contraste, acessibilidade, redução de movimento e consumo de bateria. Não implementar música ou push sem escopo confirmado, licenças e infraestrutura apropriada.

## Critérios de aceite
- PWA existente preservado, sem regressões.
- Instalação iPhone intuitiva e não repetitiva; desktop livre.
- Obsidiana grande e cinematográfica de imediato.
- Transições contínuas e névoa iluminada sutil.
- Mapa sofisticado, com três estados temporais corretos e aviso de estimativa.
- Oito Polaroids com comportamento específico por dispositivo.
- Explicações técnicas e afetivas do Handshake e da obsidiana completas e claras.
- Testes reais documentados, com arquivos alterados, passos de validação e limitações.

**Entregue primeiro o plano e a lista de arquivos que pretende alterar. Não faça todas as mudanças de uma só vez.**
