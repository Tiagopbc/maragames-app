# Decisões técnicas — pontos para apresentação ao professor

Lista viva, atualizada conforme os marcos avançam. Cada item é uma escolha de arquitetura/modelagem que vale explicar na apresentação, com o raciocínio por trás. Última atualização: 05/10/2026, noite (itens 6, 8, 12, 13, 14, 16, 19, 20, 23 e 24 revistos, item 25 novo).

## 1. Arquitetura "híbrida" no sentido correto do termo

React Native + Expo: base de código única (JS/TS) compilada em componentes nativos reais pra iOS/Android, sem WebView. Atende o requisito de app híbrido da disciplina no sentido amplo (cross-platform), distinto tecnicamente do conceito histórico de híbrido baseado em WebView (Cordova/Ionic) e do nativo puro (Swift/Kotlin isolados por plataforma).

## 2. Modelo de dados: guardar evento, não agregado

A plataforma atual da Beast Maragames registra só o resultado final da lição (concluiu, % de acerto, XP ganho) — não dá pra saber o que o aluno sabia, o que chutou, nem se ainda lembra depois de uma semana. O protótipo grava cada resposta como um evento imutável (coleção `answers`), e toda métrica de retenção/domínio é derivada dessa coleção, sem precisar de nada além dela. Resolve diretamente a dor relatada pela cliente: "a plataforma registra conclusão, não aprendizado."

## 3. Repository pattern na camada de dados

Interface `ProgressRepository` abstrai o acesso ao backend. Hoje implementada sobre Firebase (`FirebaseProgressRepository`); no dia em que a Beast Maragames liberar acesso à API deles, troca-se a implementação sem reescrever telas. Regra do time: nenhum componente de tela importa Firebase diretamente.

## 4. Coleção separada para `questions`, não array embutido em `lessons`

Decisão de modelagem NoSQL. Array embutido seria mais barato em leitura (1 documento = 1 lição inteira), mas impede consultar questões por `topicId` atravessando lições diferentes. Coleção separada custa mais leituras (N por lição, irrelevante na cota gratuita do Firestore pra escala de um projeto acadêmico), mas é o que viabiliza o M5 (domínio agregado por tópico) e o M8 (dificuldade adaptativa) sem remodelar o banco no meio do semestre. Trade-off clássico de normalização vs desempenho em NoSQL.

## 5. Confiança no cliente vs validação no servidor

No M2, o cálculo de "resposta certa/errada" acontece no cliente, comparando a escolha do aluno com o campo `correta` da alternativa já recebida do Firestore. Isso expõe uma superfície de fraude: o cliente é código rodando na máquina do usuário, então pode ser inspecionado (DevTools) e adulterado para forjar acertos e inflar XP/domínio artificialmente. Decisão consciente: aceitar esse risco na fase de protótipo acadêmico, resolvendo com validação server-side (Cloud Function conferindo a resposta antes de gravar `correta`) se o produto avançar pra uso real.

## 6. Tela inicial orientada a dados (data-driven UI)

Os atalhos da home (Continuar lição, Lições, Progresso, Perfil) são definidos num array tipado (`ATALHOS: Atalho[]`) fora do componente, e o JSX só percorre esse array com `.map()`. Separa o *que* mostrar do *como* mostrar: trocar, adicionar ou reordenar um atalho é mudar uma linha de dados, sem tocar no layout; e no futuro a lista pode vir do backend sem reescrever a tela. O campo `icone` é tipado como `keyof typeof Ionicons.glyphMap`, então um nome de ícone inexistente é erro de compilação, não um "?" silencioso em tempo de execução. Ícones via `@expo/vector-icons` (funciona igual em iOS, Android, web e Expo Go). Cores dos cards vêm do tema (`useTheme`), então light/dark mode funcionam sem cor fixa.

Revisto em 05/10. A home mantém o formato de trilha livre, mas no piloto o aluno é sempre puxado para o roteiro guiado (item 22): um botão principal, do tipo "Continuar estudos", leva à próxima etapa, calculada a partir de `answers`. Os atalhos das demais trilhas aparecem travados, em cinza claro. Como os atalhos são dados, destravar uma trilha depois do piloto é mudar um campo do array, sem mexer no layout.

## 7. Navegação guiada pelo estado da sessão (rotas protegidas)

O layout raiz (`src/app/_layout.tsx`) usa `Stack.Protected` com três guards mutuamente exclusivos: deslogado (sign-in/sign-up), logado sem perfil (complete-profile) e logado com perfil completo (grupo `(app)`). Nenhuma tela chama `router.push` depois de login ou de salvar o perfil: a tela muda porque o estado do `SessionProvider` mudou. Rota com guard falso deixa de existir, então nem pela URL na web dá pra abrir a área logada sem sessão. O `isLoading` segura a renderização até o Firebase restaurar a sessão e o perfil ser lido, evitando que o login ou o complete-profile "pisquem".

## 8. Perfil no Firestore, Auth só para credencial

O Firebase Auth guarda só email/senha. Os dados do aluno (nome, apelido, telefone, instituição, curso, experiência) ficam em `users/{uid}` no Firestore, ligados pelo `uid`. Isso permite regras de validação, consultas e evolução do esquema, coisas que o Auth não oferece. O `displayName` do Auth é só um espelho do nome, e falhar em atualizá-lo não derruba o cadastro. Perfil completo é obrigatório antes de entrar no app.

Confirmado em 05/10 para o piloto: nenhum campo é opcional, e o participante só entra no roteiro com todos preenchidos. O "código anônimo" previsto no item 19 deixa de ser o identificador do participante e passa a existir só na exportação: o CSV enviado à Mara Games (item 23) troca nome e contato por um código.

## 9. Validação dupla: cliente para UX, regras para garantia

`src/lib/validacao.ts` tem funções puras (sem React, sem Firebase) que devolvem a mensagem de erro ou `null`, usadas nos formulários para feedback imediato. As mesmas regras (tamanhos, telefone com 10–11 dígitos, experiência dentro do enum) estão em `perfilValido()` no `firestore.rules`, executado no servidor. O cliente pode ser adulterado; a regra do Firestore não.

## 10. Um arquivo por plataforma quando o comportamento difere

`firebase.ts` (nativo) usa `initializeAuth` + `getReactNativePersistence(AsyncStorage)` porque o celular não tem `localStorage`; `firebase.web.ts` usa `getAuth`, que já persiste em IndexedDB. O Metro escolhe o `.web.ts` no build web automaticamente, e o resto do código importa só `@/lib/firebase`. Mesmo padrão em `app-tabs` e `use-color-scheme`. Login com Google fica só na web por limitação consciente (popup não existe no nativo e o fluxo nativo exige módulo fora do Expo Go).

## 11. Backend: Firebase mantido, sem espelhar o Supabase da cliente

A cliente confirmou que o maragames.app roda em Supabase (PostgreSQL), sem ambiente de homologação separado e sem acesso liberado ao banco para o grupo. Com o app independente do site (item 13), o grupo decidiu em 04/10 seguir com Firebase (Auth, Firestore e regras já prontos). O DRDA v0.0.3 ainda cita Supabase, mas já foi entregue e não será alterado até segunda ordem. A interface `ProgressRepository` (item 3) continua como proteção contra mudança futura de backend: telas e hooks dependem só dela, nunca do SDK do Firebase. Se um dia houvesse integração com o Supabase da cliente, bastaria uma `SupabaseProgressRepository`. O custo que não desapareceria está no modelo de dados: coleções e subcoleções do Firestore (`questions`, `attempts`, `answers`, `progress/{uid}/lessons`) viram tabelas relacionais com chaves estrangeiras, e as regras do `firestore.rules` viram políticas de Row Level Security. Os conceitos se mantêm (evento imutável em `answers`, questões consultáveis por `topicId`), só muda a forma de persistir.

## 12. Escala de confiança padronizada: três níveis, valor numérico no dado, rótulo só na tela

A confiança declarada é uma escala ordinal de três níveis, com o mesmo construto no paper, no código e na tela. No dado, ela é gravada como valor numérico 1, 2 ou 3 em cada evento de `answers`. No paper, os níveis são chamados de confiança baixa, média e alta. Na tela, os rótulos são "Palpite" (1), "Tenho dúvida" (2) e "Tenho certeza" (3), definidos em um único arquivo de strings ligado ao valor numérico, então trocar um texto não altera dados nem análise.

A estrutura de três níveis segue Gardner-Medwin (1995, 2006, 2019). O autor identifica os níveis por números (C=1, 2, 3) ou por termos neutros (baixa, média, alta), e não por palavras como "chute" ou "certeza", porque termos descritivos "significam coisas diferentes para pessoas diferentes" (2006; Gardner-Medwin; Gahan, 2003; em 2019 ele fala em interpretações idiossincráticas). A justificativa anterior desta lista, de que os rótulos neutros evitariam a hesitação do aluno em declarar baixa confiança, não aparece nessas fontes e foi retirada. Em 2019 o autor também troca o nome do método de "confidence-based" para "certainty-based", porque o primeiro nome era confundido com algo feito para elevar a autoconfiança.

Os rótulos da tela ("Palpite", "Tenho dúvida", "Tenho certeza") são descritivos, ou seja, vão contra a recomendação do autor. É uma limitação consciente, a registrar na metodologia do paper: a interpretação de cada rótulo pode variar entre alunos. "Palpite" substitui "Estou chutando" por ser menos acusatório. A relação com a opção "não sei" de Silva et al. (2022) é parcial: lá, a opção serve para evitar o chute; aqui, o aluno responde mesmo assim e sinaliza que foi palpite, o que concorda com Gardner-Medwin, para quem é sempre melhor responder no nível baixo do que deixar em branco. Os rótulos da tela, e os do quadrante (Firme, Frágil, Lacuna, Ponto cego), são decisão do grupo; como a cliente deixou o formato do app a critério do grupo (item 13), não passam por validação com a Jeane Assunção.

A decisão sobre pontuação está no item 14.

## 13. App independente do site: a rota passa a ser guiada pela medição de aprendizagem

A Beast Maragames liberou o grupo para definir o formato do app e disse que não quer uma continuidade do site. Com isso, a extensão do maragames.app e a continuidade de lição entre dispositivos deixam de ser requisito do projeto (confirmado: a rubrica da matéria não exige). O eixo do produto passa a ser medir aprendizagem a partir do evento imutável em `answers` (item 2): domínio por tópico, calibração (acerto por nível de confiança), retenção em reteste espaçado e, no piloto, ganho normalizado. O quadrante acerto × confiança (Firme, Frágil, Lacuna, Ponto cego) é calculado a partir do evento, não gravado, então mudar a regra recalcula tudo sem migrar dados. Os marcos foram reordenados: confiança (M3), diagnóstico (M4), retenção (M5), banco de conteúdo em paralelo (M6), relatório (M7) e piloto (M8). O detalhe está no doc "Rota recalculada: app de confiança declarada e aprendizagem". A retomada de tentativa entre aparelhos saiu também da lista de opcionais.

Reforçado em 05/10: decisões de produto e de interface (rótulos, telas, gamificação) são do grupo, sem etapa de validação com a cliente.

## 14. Domínio por acerto simples; XP pela pontuação por certeza de Gardner-Medwin

Revisto em 05/10 (antes, a confiança não valia ponto nem XP). O domínio por tópico continua sendo a taxa de acerto simples, sem peso por confiança.

O XP passa a seguir o esquema que Gardner-Medwin testou para mais de duas opções: 1, 2 e 3 pontos por acerto em "Palpite", "Tenho dúvida" e "Tenho certeza", e 0, −1 e −4 por erro. O original (0, −2 e −6) é para verdadeiro ou falso. A diferença para os pesos descartados em 04/10 (por exemplo 1,0 para acerto firme e 0,5 para frágil) é que, neles, declarar certeza nunca rendia menos, o que tornava a certeza sempre a melhor escolha (regra "não motivadora", Gardner-Medwin; Gahan, 2003). No esquema adotado, o melhor nível depende da chance real de acerto: "Tenho dúvida" compensa a partir de 50% e "Tenho certeza" a partir de 75%; abaixo disso, "Palpite" rende mais, e responder em "Palpite" nunca perde ponto. O referencial de palpite puro em 4 alternativas é 25%. Com isso, a limitação registrada antes (sem ponto em jogo, nada incentiva a sinceridade) deixa de valer, e o esquema ganha base teórica direta.

O XP é calculado a partir de `answers`, não gravado, então trocar os valores do esquema recalcula tudo. Nos blocos medidos (pré, pós e reteste), o XP só aparece no fim do bloco: mostrá-lo mudando a cada questão revelaria o acerto e quebraria a ausência de feedback (item 19).

Limitações a registrar no paper: o XP vale pouco fora do app, então o incentivo é real mas fraco; e, como a confiança agora tem consequência em pontos, ela deixa de ser independente da regra, o que deve aparecer na discussão. A calibração (taxa de acerto em cada nível) continua no relatório como indicador, e o aluno também a vê.

A taxa de acerto ajustada do paper é o percentual de acertos firmes (corretos com "Tenho certeza") sobre o total, comparado à taxa comum. Foi preferida à "acurácia com confiança" de 2019, cujo fator foi otimizado para provas de verdadeiro ou falso e não é garantido para múltipla escolha.

## 15. Corte do quadrante: confiança baixa são os níveis 1 e 2

Decidido em 04/10. Para o quadrante acerto × confiança, confiança baixa são "Palpite" e "Tenho dúvida" (níveis 1 e 2), e confiança alta é só "Tenho certeza" (nível 3). Acerto frágil passa a incluir acerto com dúvida, e ponto cego é erro com certeza. Os três níveis continuam gravados e alimentam a calibração. Como o quadrante é calculado a partir do evento, o corte pode mudar depois sem migrar dados.

## 16. Dificuldade das questões: gravada desde já, escada só no modo prática

Decidido em 05/10. Cada questão grava `dificuldade` (1 a 3; no código, básico, intermediário e avançado, para não confundir com os níveis de confiança 1 a 3). É uma hipótese do autor, não uma medida: só depois do piloto a taxa de acerto por questão mostra se os níveis estavam certos. Os blocos medidos (pré-teste, pós-teste e reteste) usam questões fixas e a mesma mistura de dificuldades, porque uma escada adaptativa faria todo aluno convergir para cerca de 70% de acerto (Levitt, 1971), o que tira o sinal do acerto como medida e impede comparar alunos e calcular o ganho normalizado.

A escada adaptativa fica só no modo prática, depois do M5, como opcional. A regra escolhida usa a confiança: sobe de nível com 2 acertos firmes seguidos (corretos com "Tenho certeza"); acerto com palpite ou dúvida não conta para subir; erro com certeza desce um nível e manda a questão para a revisão. O nível é por tópico e derivado dos últimos eventos de `answers`, não gravado. No piloto, as respostas do modo prática entram marcadas e ficam fora do cálculo de ganho.

Relação com o item 14 (revisto): a confiança já tem consequência em XP em todas as fases; no modo prática ela também passa a afetar a progressão. As duas consequências apontam na mesma direção (declarar certeza só compensa quando ela é real).

## 17. Tópicos do piloto

Decidido em 05/10, a partir dos módulos gratuitos da plataforma de referência: Framework MDA (módulo Fundamentos de Game Design), Escolhendo a Engine Certa (Game Engines), Lógica de Programação (Programação para Jogos) e Pixel Art Básico (Arte & Pixel Art), com 8 a 10 questões cada. Critério: temas de resposta objetiva, em que o gabarito não vira discussão. Ficaram fora temas de opinião, como direção de arte e marketing. O seed atual já cobre MDA, escolha de engine e escala de sprites (que cabe em Pixel Art Básico), então faltam as questões de Lógica de Programação e a ampliação de cada tópico para 8 a 10.

## 18. Formato das questões: só múltipla escolha nos blocos medidos

Decidido em 05/10. O tipo `Question` já prevê três formatos (`multipla_escolha`, `completar_codigo`, `ordenar_etapas`), mas os blocos medidos do piloto (pré, pós e reteste) usam só múltipla escolha com 4 alternativas e uma correta. Três motivos. Primeiro, a pontuação por certeza e o quadrante supõem acerto binário, e completar ou ordenar abrem acerto parcial. Segundo, com 4 alternativas a chance de chute é 25% fixo, e em ordenar 4 etapas ela cai para 1/24, o que muda o sentido de "Palpite". Terceiro, cada formato novo custa tela, validação, ajuste no tipo `Answer` e questões próprias, tempo que disputa com M3 a M5. Os limiares de 50% e 75% da pontuação não dependem do número de alternativas. Lógica de Programação cobre leitura de código em múltipla escolha (prever a saída de um trecho). Um segundo formato pode entrar depois do M5, só no modo prática, que já fica fora do cálculo de ganho; o campo `formato` mantém a porta aberta sem retrabalho.

## 19. Desenho do piloto: duas sessões, pré e pós sem feedback, reteste em 7 dias

Decidido em 05/10. Grupo único, sem controle, estudo exploratório. Cada tópico tem 10 questões divididas em forma A (3), forma B (3) e prática (4).

Sessão 1, cerca de 30 minutos: termo de consentimento no app (o participante já entra com perfil completo, item 8); pré-teste com 12 questões (3 por tópico) com confiança declarada e sem nenhum feedback, avisando no início que o resultado aparece no fim (feedback ensinaria e contaminaria a medida do que o aluno já sabia); estudo com cartão de conceito e 4 questões de prática por tópico, com feedback completo (gabarito, explicação e quadrante), que é a intervenção; pós-teste com as outras 12 questões, também sem feedback questão a questão, e relatório no fim (acerto por tópico, quadrantes, acerto por nível de confiança, XP do bloco).

Sessão 2, no dia 7, cerca de 10 minutos: reteste com as mesmas 12 questões do pós, sem estudo antes, seguido do SUS. O participante é chamado por mensagem no grupo da turma, não por notificação push, para não gastar prazo configurando o expo-notifications.

Por trás: metade faz A no pré e B no pós, a outra metade o contrário (contrabalanceamento, para uma forma mais fácil não inflar o ganho); respostas da prática ficam marcadas e fora do cálculo. Do pré para o pós sai o ganho normalizado de Hake; do pós para o reteste, a retenção; e a confiança nos três momentos mostra transições como Frágil para Firme ou Ponto cego persistente.

## 20. Cronograma da disciplina e janela do piloto

Prazos: 02/10 paper, 1º check (entregue); 09/10 protótipo no Figma; 16/10 relatório de evolução com prints da arquitetura, repositório e sistema; primeira quinzena de outubro, Incubators (data a confirmar); 14/11 apresentação final ao cliente, com simulações e análise estatística; 27/11 paper final; 11/12 substitutiva; 16/12 avaliação final.

Como a apresentação de 14/11 já exige análise, o piloto termina antes dela: sessão 1 até 30/10 (no máximo 03/11), reteste entre 06/11 e 10/11, análise até 13/11. Para isso, app com M2 a M5 e todo o conteúdo revisado até 23/10, incluindo a trilha diária dos dias 2 a 6 (item 23; confirmado em 05/10), e o fluxo de questão com confiança rodando até 16/10 para os prints do relatório. Prioridade de conteúdo: Lógica de Programação e Framework MDA primeiro, Engine e Pixel Art na semana seguinte, trilha diária em paralelo. Escada adaptativa, offline e segundo formato ficam para depois do piloto.

## 21. Conteúdo versionado em JSON, com um único script de seed

Decidido em 05/10. Questões e cartões de conceito ficam em `content/questoes.json` e `content/topicos.json`, versionados no Git, e esse JSON é a fonte da verdade. Um único script (`scripts/seed-conteudo.js`, `npm run seed:conteudo`) valida o conteúdo e o espelha no Firestore com ids fixos, então rodar de novo atualiza em vez de duplicar. Corrigir uma questão é editar o JSON, fazer commit e rodar o script. Substitui o `seed-questions.js`, que tinha as questões escritas no código.

A validação barra o que quebraria a medida: questão sem exatamente uma alternativa correta, `correta` que não seja booleano, ids repetidos e formas A e B que não tenham uma questão de cada dificuldade. Cada documento grava `versaoConteudo`, um hash do conteúdo, para o paper poder dizer exatamente qual versão das questões o piloto usou. Questões removidas do JSON só são apagadas do banco com `--prune`, e nunca se já tiverem respostas em `answers`, para não deixar respostas órfãs.

Alternativas descartadas: cadastrar pelo console do Firebase (40 documentos com arrays aninhados, sem histórico), tela de administração no app (custo alto para conteúdo que muda duas ou três vezes) e embutir as questões no código do app (contraria o item 4 e obrigaria publicar o app de novo para corrigir um erro de digitação).

Os cartões ficam no documento da lição (campo `cartao`, uma lista de slides), que já tem leitura liberada nas regras, então não foi preciso abrir uma coleção nova. O conteúdo é rascunho com apoio de IA, com revisão independente de gabaritos, fatos e pistas (por exemplo, a alternativa correta ser sempre a mais longa); ainda precisa da revisão do grupo.

## 22. Fluxo e estado do participante no piloto

Decidido em 05/10. O caminho principal do app no piloto é um roteiro guiado (consentimento, pré-teste, cartão e prática de cada tópico, pós-teste, relatório, espera, reteste, SUS); a trilha livre de lições aparece na home, mas travada (item 6). Cinco escolhas sustentam esse roteiro:

- **Fase gravada em cada resposta** (`pre`, `pratica`, `pos` ou `reteste`). A mesma questão da forma A é pré-teste para metade dos participantes e pós-teste para a outra, e o reteste repete as questões do pós, então só a fase diz o que cada resposta mede. Como `answers` é imutável, o campo entra antes de existir resposta real, e a regra do Firestore passa a exigi-lo. O horário da resposta passa a ser o do servidor, porque o intervalo do reteste é calculado a partir dele.
- **Forma inicial alternada no aceite do consentimento.** Um contador em `piloto/contador`, incrementado em transação, dá A ao 1º participante, B ao 2º, e assim por diante. Isso garante metades iguais, o que um sorteio aleatório não garante com cerca de 15 pessoas. A forma fica em `users/{uid}.formaPre`, e a regra impede alterá-la depois de gravada.
- **Etapa calculada a partir das respostas**, sem campo gravado, coerente com os itens 2 e 13. Não há como a etapa contradizer o dado, e o retorno no meio de um bloco sai de graça. Consentimento e SUS ficam em `users/{uid}` (`consentiuEm`, `susRespondidoEm` e as notas).
- **Reteste do dia 7 ao dia 9**, em dias de calendário contados a partir do pós. Antes disso, a home mostra a contagem; depois, o participante ainda responde e a análise o marca como fora da janela, pela diferença entre as datas.
- **Ordem fixa de tópicos e questões; alternativas embaralhadas por participante e por fase.** A ordem das alternativas sai de uma semente (uid + questão + fase), então é estável se o participante sair e voltar, mas muda entre o pós e o reteste, o que impede lembrar a letra marcada. A análise não é afetada porque a resposta grava o id da alternativa, não a posição; a ordem exibida também é gravada (`ordemExibida`) para checar efeito de posição. O cansaço no último tópico (Pixel Art) fica como limitação.

## 23. Trilha diária com limite por dia e indicadores para a Mara Games

Decidido em 05/10. O app não é tratado só como instrumento do estudo: a ideia é que vire um produto real da Beast Maragames, e um app parado por seis dias ensina o usuário a não abri-lo. Por isso, entre o pós-teste e o reteste, entra uma trilha diária no estilo Duolingo, sem tocar no que é medido.

- **Ordem do dia 1, do mais concreto ao mais abstrato:** Framework MDA, Pixel Art Básico, Escolhendo a Engine Certa, Lógica de Programação. O tópico mais difícil fica no fim, quando a pessoa está mais cansada; o custo foi aceito, porque começar pelo difícil desanima, e vira limitação no paper.
- **Dias 2 a 6, um tópico por dia, "do papel à loja":** GDD, UX/UI em jogos, Efeitos sonoros, Playtest e iteração, Publicando na Steam. Cada um tem um cartão curto e 5 a 6 questões de prática, com feedback completo, e não entra na medição. Level Design, Narrativa e Psicologia do Jogador ficaram de fora porque falam de diversão e estéticas, o mesmo conteúdo do MDA, e contaminariam o reteste. Todo esse conteúdo precisa estar pronto até 23/10 (item 20).
- **Limite diário:** um tópico novo por dia de calendário. Ao terminar, o app mostra a sequência e "volte amanhã". A sequência conta dias seguidos de uso; pular um dia zera o contador (sem protetor de sequência no piloto), mas o próximo tópico da fila continua esperando, então ninguém perde conteúdo. A trilha anda no ritmo de cada participante.
- **Os quatro tópicos medidos ficam travados** entre o pós e o reteste (sem cartão nem prática), para que o reteste meça retenção e não revisão. Depois do reteste, destravam e entram na revisão normal.

Indicadores para a Mara Games, todos derivados de `answers`: aprendizagem (ganho normalizado pré → pós, retenção pós → reteste); consciência do próprio saber (acerto por nível de confiança, taxa de ponto cego, acerto simples × acerto firme, mudança de quadrante); engajamento (dias ativos entre os dias 2 e 6, sequência média, tópicos do dia concluídos, adesão ao reteste); qualidade do conteúdo (acerto e ponto cego por questão, distrator mais escolhido, dificuldade real × prevista); usabilidade (SUS). O indicador central é se respostas Firmes no pós são mais lembradas no reteste do que as Frágeis: se sim, a confiança declarada prevê o esquecimento, o que a plataforma atual não consegue. O aluno vê os próprios indicadores no app.

Entrega à Mara Games (decidido em 05/10): o grupo exporta os dados e envia um CSV com um código no lugar de nome e contato, junto com os indicadores agregados (M7). Não há painel nem papel de administrador dentro do app, o que evita mexer em autenticação e regras para algo usado uma vez. Com cerca de 15 pessoas e sem grupo de controle, os números descrevem e não provam causa.

## 24. Pendências que travam o piloto

- Distribuição do app para os participantes (Expo Go, build web na Vercel ou build EAS com APK/TestFlight): consultar o professor.
- Conteúdo (M6): quem escreve e quem revisa cada tópico (proposta: autor diferente do revisor, rascunhos com apoio de IA revisados pelo grupo). Prazo de 23/10 inclui a trilha diária.
- Piloto (M8): número e perfil dos participantes (proposta: colegas da UNDB, voluntários e sem nota, meta de pelo menos 15), versão em português do SUS e se haverá pergunta aberta. Comitê de ética e LGPD ficam de lado por ora, por decisão do grupo em 05/10 (público controlado de colegas adultos).
- XP total: se pode ficar negativo com erros em "Tenho certeza" (proposta: o saldo pode cair, que é o que dá sentido ao −4, mas o total exibido tem piso em 0).
- Data exata do Incubators.

## 25. Interação da questão: alternativa e confiança, em qualquer ordem

Decidido em 05/10. Alternativa e nível de confiança são duas seleções independentes na mesma tela, e o aluno pode marcá-las em qualquer ordem. O botão Confirmar só ativa com as duas marcadas, seguindo Gardner-Medwin, em que cada resposta vem acompanhada do grau de certeza. Não há opção de pular: com "Palpite" valendo 1 no acerto e 0 no erro (item 14), responder sempre compensa, e o tipo `Answer` não precisa de um estado "em branco". Só a confirmação vira evento em `answers`; trocas de seleção antes de confirmar não são gravadas.
