# Decisões técnicas — pontos para apresentação ao professor

Lista viva, atualizada conforme os marcos avançam. Cada item é uma escolha de arquitetura/modelagem que vale explicar na apresentação, com o raciocínio por trás. Última atualização: 10/10/2026 (item 31 novo: tema claro, escuro ou do sistema, escolhido no Perfil; item 30: "O que revisar primeiro" no Progresso; itens 6, 14, 21, 23, 24 e 30: Fases 3 a 6 e 8 do plano, com a lista de lições, a home nova, o Progresso, o Perfil, a retirada do roteiro do piloto e as 30 questões novas; itens 24 e 30: Fase 2 do plano, com a página da lição, os blocos por tópico, a trava por lição e os testes de emulador de `answers` e `attempts`; em 09/10, itens 24 e 30: Fase 1 do plano, com o motor do ciclo da lição em funções puras; itens 20 e 30: prazos cancelados e virada para o app completo, com o plano em `docs/plano-do-app-completo.md`; itens 6, 19, 22, 23, 24 e 27 revistos para a virada; itens 14 e 24: XP à vista na tela da sequência, no "Seu dia 1" e na home; item 29 novo e item 24 revisto: troca de tema do sistema na web; itens 23 e 24: pull request nº 5 integrado e ajustes na exportação; em 08/10, itens 24 e 28: protótipo do Figma corrigido à mão; itens 24, 25, 26 e 28: validação na web, com o roteiro do dia 1 refeito numa conta nova, estado de acessibilidade em `aria-*`, botões do cadastro e do perfil, abertura e ícone com a logo, pull request nº 5 aberto com o `main` integrado, endereço que não existe (item 7), cálculo de retenção e ordem de apresentação no app (item 23), volta ao app e relógio do aparelho (item 22), trilha diária no app e script de exportação (item 23) e home com rolagem (item 6); em 07/10, itens 6, 23, 24, 25, 26 e 28 revistos: as abas do template saíram, o rodapé fixo foi conferido na web, o desenho do piloto foi confirmado, a aparência do protótipo entrou no app, e a trava do roteiro e a tela de espera foram implementadas).

## 1. Arquitetura "híbrida" no sentido correto do termo

React Native + Expo: base de código única (JS/TS) compilada em componentes nativos reais pra iOS/Android, sem WebView. Atende o requisito de app híbrido da disciplina no sentido amplo (cross-platform), distinto tecnicamente do conceito histórico de híbrido baseado em WebView (Cordova/Ionic) e do nativo puro (Swift/Kotlin isolados por plataforma).

## 2. Modelo de dados: guardar evento, não agregado

A plataforma atual da Beast Maragames registra só o resultado final da lição (concluiu, % de acerto, XP ganho) — não dá pra saber o que o aluno sabia, o que chutou, nem se ainda lembra depois de uma semana. O protótipo grava cada resposta como um evento imutável (coleção `answers`), e toda métrica de retenção/domínio é derivada dessa coleção, sem precisar de nada além dela. Resolve diretamente a dor relatada pela cliente: "a plataforma registra conclusão, não aprendizado."

## 3. Repository pattern na camada de dados

Interface `ProgressRepository` abstrai o acesso ao backend. Hoje implementada sobre Firebase (`FirebaseProgressRepository`); no dia em que a Beast Maragames liberar acesso à API deles, troca-se a implementação sem reescrever telas. Regra do time: nenhum componente de tela importa Firebase diretamente.

Revisto em 06/10. O repositório passou a ter leitura, além da escrita: `getLicoes`, `getTopicos`, `getQuestoes`, `getQuestoesDoTopico` e `getRespostas`. Quatro escolhas:

- **O tópico não tem coleção própria.** O seed grava uma lição por tópico (item 21), então `getTopicos` monta o tipo `Topico` (id, título, módulo e ordem) a partir de `lessons`, sem mexer no seed nem nas regras. Uma coleção `topics` só compensa se um tópico passar a ter mais de uma lição.
- **A conversão do documento é função pura**, em `src/data/mapeadores.ts`, com testes em `src/data/__tests__/` (item 26). Copia campo a campo, deixa de fora os carimbos do seed e transforma o `respondidaEm` (Timestamp do Firestore) em milissegundos, que é o que as funções de `src/lib` recebem. Outra implementação do repositório reaproveita a mesma conversão.
- **A ordenação é feita no aparelho**, não com `orderBy`: filtro e ordenação em campos diferentes pediriam índice composto no Firestore, e as listas são pequenas (cerca de 40 questões). Lições saem pela ordem, questões agrupadas por tópico e pela ordem dentro dele, respostas da mais antiga para a mais recente. `getRespostas` filtra por `uid`, que é o que a regra de `answers` exige de uma consulta.
- **Uma instância só**, exportada em `src/data/repositorio.ts` e tipada como a interface. Telas e hooks importam `repositorio` desse arquivo; trocar de backend é trocar uma linha. Sem cache nem leitura em tempo real por ora.

Revisto em 06/10 (consentimento). A interface ganhou `registrarConsentimento(uid)`, a primeira operação que escreve em mais de um documento (item 22). `FirebaseProgressRepository` passou a receber o Firestore no construtor, em vez de importá-lo: o app passa o dele em `repositorio.ts`, e o teste das regras passa o do emulador, então a transação testada é a mesma que roda no aparelho (item 26).

## 4. Coleção separada para `questions`, não array embutido em `lessons`

Decisão de modelagem NoSQL. Array embutido seria mais barato em leitura (1 documento = 1 lição inteira), mas impede consultar questões por `topicId` atravessando lições diferentes. Coleção separada custa mais leituras (N por lição, irrelevante na cota gratuita do Firestore pra escala de um projeto acadêmico), mas é o que viabiliza o M5 (domínio agregado por tópico) e o M8 (dificuldade adaptativa) sem remodelar o banco no meio do semestre. Trade-off clássico de normalização vs desempenho em NoSQL.

## 5. Confiança no cliente vs validação no servidor

No M2, o cálculo de "resposta certa/errada" acontece no cliente, comparando a escolha do aluno com o campo `correta` da alternativa já recebida do Firestore. Isso expõe uma superfície de fraude: o cliente é código rodando na máquina do usuário, então pode ser inspecionado (DevTools) e adulterado para forjar acertos e inflar XP/domínio artificialmente. Decisão consciente: aceitar esse risco na fase de protótipo acadêmico, resolvendo com validação server-side (Cloud Function conferindo a resposta antes de gravar `correta`) se o produto avançar pra uso real.

## 6. Tela inicial orientada a dados (data-driven UI)

Os atalhos da home (Continuar lição, Lições, Progresso, Perfil) são definidos num array tipado (`ATALHOS: Atalho[]`) fora do componente, e o JSX só percorre esse array com `.map()`. Separa o *que* mostrar do *como* mostrar: trocar, adicionar ou reordenar um atalho é mudar uma linha de dados, sem tocar no layout; e no futuro a lista pode vir do backend sem reescrever a tela. O campo `icone` é tipado como `keyof typeof Ionicons.glyphMap`, então um nome de ícone inexistente é erro de compilação, não um "?" silencioso em tempo de execução. Ícones via `@expo/vector-icons` (funciona igual em iOS, Android, web e Expo Go). Cores dos cards vêm do tema (`useTheme`), então light/dark mode funcionam sem cor fixa.

Revisto em 05/10. A home mantém o formato de trilha livre, mas no piloto o aluno é sempre puxado para o roteiro guiado (item 22): um botão principal, do tipo "Continuar estudos", leva à próxima etapa, calculada a partir de `answers`. Os atalhos das demais trilhas aparecem travados, em cinza claro. Como os atalhos são dados, destravar uma trilha depois do piloto é mudar um campo do array, sem mexer no layout.

Revisto em 06/10. Implementado: "Continuar lição" saiu do array e virou o botão principal; cada atalho tem o campo `travado`, e os três que ficaram (Lições, Progresso, Perfil) aparecem em cinza claro, com o ícone da própria trilha e um cadeado pequeno no canto. As abas viraram o grupo `(app)/(tabs)`, dentro de um `Stack`, para a tela da pergunta abrir por cima delas, em tela cheia.

"Continuar estudos" segue `etapaDoRoteiro`. A home fica em três camadas, como a tela da pergunta (item 25): `src/lib/passo.ts` diz para qual bloco cada etapa leva, `src/hooks/use-roteiro.ts` lê tópicos, questões e respostas pelo repositório e calcula a etapa, e a tela só desenha. Quatro escolhas:

- **A etapa é recalculada toda vez que a home ganha foco**, e não guardada. Quem sai de um bloco já vê o passo seguinte, e não há estado da home para ficar diferente de `answers`.
- **Etapa sem bloco deixa o botão apagado, com uma linha dizendo por quê.** `consentimento` abre o termo, `pre`, `pos` e `reteste` abrem o bloco medido, e `estudo` abre o cartão ou a prática do tópico; em `espera` a home mostra quantos dias faltam para o reteste, e `sus` e `concluido` ainda não têm para onde ir. (Texto ajustado nas revisões abaixo, quando o termo e o cartão ganharam tela.)
- **Só os tópicos medidos entram no roteiro** (`topicosMedidos`, em `src/lib/bloco.ts`): os que têm questão das formas A ou B, na ordem das lições. Os da trilha diária só têm prática e, sem esse filtro, o roteiro mandaria estudá-los antes do pós-teste.
- **Aceite simulado em desenvolvimento.** Sem tela de consentimento, ninguém tem `consentiuEm` nem `formaPre`, e a etapa seria `consentimento` para todos. Em `__DEV__`, `src/lib/participante.ts` entrega o participante como se tivesse aceitado, com forma A; nada é gravado no perfil. Fora de desenvolvimento, o botão fica apagado com o aviso de que falta o termo. A rota do bloco usa a mesma função, então a regra mora num lugar só.

Revisto em 06/10 (consentimento). O aceite simulado saiu: a tela de consentimento existe (item 22), e `participante.ts` passou a ler `formaPre` e `consentiuEm` do perfil, em desenvolvimento ou não. Na etapa `consentimento`, "Continuar estudos" abre o termo. Só o SUS e o roteiro concluído ainda deixam o botão apagado.

Revisto em 06/10 (cartão). Na etapa `estudo`, o botão abre o cartão de conceito enquanto o tópico não tem resposta de prática, e a prática depois disso (item 22). A linha da home acompanha: "Cartão de Framework MDA" e, com a prática começada, "Prática de Framework MDA · 1 de 4".

Revisto em 07/10 (sem abas). O grupo `(tabs)` saiu, e a home passou a ser `src/app/(app)/index.tsx`, direto no `Stack` de `(app)`; bloco, cartão e termo continuam abrindo por cima dela. As abas eram as do template do Expo: na web, uma barra flutuante com "Expo Starter", a aba Explore e o link Docs, que cobria a saudação; no celular, uma aba "Expo" que abria a tela de exemplo. Tirada a Explore, sobraria uma aba só, e barra de uma aba não navega: no piloto, quem navega é o "Continuar estudos" e os atalhos. Saíram junto os componentes e as imagens que só o template usava, e `BottomTabInset` do tema. Se depois do piloto os atalhos virarem abas, o grupo volta. Coberto por teste de navegação (item 26).

Revisto em 08/10 (rolagem). A home passou a rolar. Com a contagem do reteste, o cartão da trilha diária e os atalhos, ela passa da altura de um celular pequeno: em 375×667 o conteúdo tem 818 px. O "Sair" fica no pé da tela quando o conteúdo é curto e desce com ele quando é longo.

Revisto em 09/10 (virada, item 30). Os três atalhos deixam de ser cadeados: Lições, Progresso e Perfil viram telas. O "Continuar estudos", que seguia o roteiro, dá lugar ao cartão "Para hoje", que aponta um passo só entre todas as lições, e o "Sair" vai para o Perfil. O array `ATALHOS` continua sendo a fonte dos atalhos; o campo `travado` sai quando o último deles tiver destino. O desenho está na seção 4 de `docs/plano-do-app-completo.md`. No código, a home ainda é a de 08/10 até a Fase 4 do plano.

Revisto em 10/10 (Fase 4 do plano). A home nova está no código (`src/app/(app)/index.tsx`): saudação com o selo de XP, o cartão "Para hoje" com o selo da sequência, a seção "Revisões agendadas" e os três atalhos, lado a lado. Cada item de `ATALHOS` tem agora a rota que abre e, quando há o que dizer, um resumo calculado das lições ("6 de 9 feitas"); o campo `travado` saiu. O botão do "Para hoje" abre o passo sugerido com a página da lição empilhada por baixo, para que sair do passo volte à lição, e não à home; sem termo aceito, abre só a página da lição, que explica o que falta. A home lê tudo de um hook, `useLicoes`, o mesmo da lista de lições e do Progresso. O "Sair" foi para o Perfil.

## 7. Navegação guiada pelo estado da sessão (rotas protegidas)

O layout raiz (`src/app/_layout.tsx`) usa `Stack.Protected` com três guards mutuamente exclusivos: deslogado (sign-in/sign-up), logado sem perfil (complete-profile) e logado com perfil completo (grupo `(app)`). Nenhuma tela chama `router.push` depois de login ou de salvar o perfil: a tela muda porque o estado do `SessionProvider` mudou. Rota com guard falso deixa de existir, então nem pela URL na web dá pra abrir a área logada sem sessão. O `isLoading` segura a renderização até o Firebase restaurar a sessão e o perfil ser lido, evitando que o login ou o complete-profile "pisquem".

Revisto em 08/10 (endereço que não existe). Entrou `src/app/+not-found.tsx`: "Essa página não existe." e "Voltar ao início", no lugar da tela padrão do Expo Router, que é em inglês. O botão escolhe o destino pelo estado da sessão (login, perfil ou home), pela mesma razão do resto deste item: a home é protegida, e mandar para ela quem não entrou não sai do lugar. Foi o teste que mostrou isso. O mapa de rotas do Expo Router (`/_sitemap`), que lista todos os endereços do app, foi desligado no `app.json`; no servidor de desenvolvimento ele pode continuar aparecendo até limpar o cache, mas o build web gerado não tem a página.

## 8. Perfil no Firestore, Auth só para credencial

O Firebase Auth guarda só email/senha. Os dados do aluno (nome, apelido, telefone, instituição, curso, experiência) ficam em `users/{uid}` no Firestore, ligados pelo `uid`. Isso permite regras de validação, consultas e evolução do esquema, coisas que o Auth não oferece. O `displayName` do Auth é só um espelho do nome, e falhar em atualizá-lo não derruba o cadastro. Perfil completo é obrigatório antes de entrar no app.

Confirmado em 05/10 para o piloto: nenhum campo é opcional, e o participante só entra no roteiro com todos preenchidos. O "código anônimo" previsto no item 19 deixa de ser o identificador do participante e passa a existir só na exportação: o CSV enviado à Mara Games (item 23) troca nome e contato por um código.

Revisto em 06/10. O perfil passou a ser lido por um mapeador (`paraPerfil`, em `src/data/mapeadores.ts`), como as outras coleções, porque `consentiuEm` é horário do servidor e precisa virar milissegundos. Correção junto: salvar o perfil trocava o perfil em memória por um objeto sem `formaPre`; agora o estado local preserva forma e consentimento, como o `merge` já fazia no banco.

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

Revisto em 06/10. No domínio por tópico, cada questão conta uma vez, pela resposta mais recente em qualquer fase (`dominioPorTopico`, em `src/lib/dominio.ts`). É a leitura "o que o aluno sabe agora": a questão respondida no pós e de novo no reteste entra só pelo reteste, em vez de pesar duas vezes. O XP (`src/lib/xp.ts`) devolve o saldo sem piso, que pode ser negativo; o piso do total exibido continua pendente (item 24).

Revisto em 06/10 (XP negativo). Decidido: o XP de um bloco aparece como é, inclusive negativo ("−5 XP"). É coerente com o feedback da prática, que já mostra "−4 XP" na questão, e é o que dá sentido ao peso do erro com certeza; um piso no bloco deixaria o resumo diferente da soma do que a pessoa viu questão a questão. O piso em 0 vale só para o total acumulado do aluno, quando existir uma tela que o mostre. Fecha a pendência do item 24.

Revisto em 09/10 (XP à vista). O XP estava certo no banco, mas quase não aparecia: o Tiago acertou as 6 questões de um tópico da trilha e não viu número nenhum mudar. Três mudanças, sem gravar nada novo:

- **Tela da sequência**: a linha dos acertos traz o XP do tópico ("Você acertou 6 de 6 questões de UX/UI em jogos · +18 XP"), com o saldo real, inclusive negativo.
- **"Seu dia 1"**: o rótulo passa a ser "XP do pós-teste". A tela é o retrato do pós e não muda com a trilha; "XP do bloco" dava a entender que era o total.
- **Home**: um selo com o total ("XP: +10") ao lado da saudação, calculado por `xpAcumulado` (`src/lib/xp.ts`) e entregue pelo `useRoteiro`, que já lê as respostas.

O total segue quatro regras. A prática entra sempre, porque o feedback dela já saiu questão a questão. Bloco medido só entra depois de concluído: quem sai do pré no meio veria o selo mudar e descobriria se acertou, o que quebraria a ausência de feedback (item 19). Cada questão conta uma vez por fase, pela resposta mais recente, como no resultado do bloco; pós e reteste são fases diferentes, então a mesma questão rende nas duas. E o piso em 0, reservado acima para o acumulado, passa a valer aqui. Antes do primeiro bloco concluído, o selo não aparece.

Se o grupo decidir mostrar o resultado do pré-teste só no fim do dia 1 (item 24), o pré deixa de contar até o pós terminar: é uma linha na tabela `CONCLUIDO_EM`, na mesma função.

Revisto em 10/10 (Fase 4 do plano). O total que a home mostra passou a ser `xpDasLicoes`; `xpAcumulado`, que decidia pela etapa do roteiro geral, saiu junto com o roteiro. A regra é a mesma, por tópico: só entram as respostas que já podem aparecer (`respostasAVista`, em `src/lib/licao.ts`), a prática sempre e os blocos sem feedback quando a lição passa deles. O domínio da lista de lições e os números do Progresso usam o mesmo filtro, então nenhuma tela revela o acerto de um bloco pela metade nem o do diagnóstico antes do fim da lição.

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

Revisto em 09/10 (virada, item 30). O piloto em duas sessões está suspenso, junto com as datas. Do desenho ficam o pré e o pós sem feedback, as formas A e B contrabalanceadas entre pessoas, a prática como intervenção e o reteste com as questões do pós. Muda a unidade: cada tópico passa a ter o seu pré (na tela, "diagnóstico"), o seu pós ("verificação") e o seu reteste ("revisão"), no lugar de três blocos de 12 questões. Ganho e retenção passam a ser calculados por tópico e por pessoa. Limitação a registrar: com 3 questões, o ganho de um tópico sozinho é grosseiro; a leitura com sinal continua sendo a soma dos tópicos de cada pessoa. O SUS, que fechava a sessão 2, fica sem lugar no fluxo (decisão D4 do plano).

## 20. Cronograma da disciplina e janela do piloto

Prazos: 02/10 paper, 1º check (entregue); 09/10 protótipo no Figma; 16/10 relatório de evolução com prints da arquitetura, repositório e sistema; primeira quinzena de outubro, Incubators (data a confirmar); 14/11 apresentação final ao cliente, com simulações e análise estatística; 27/11 paper final; 11/12 substitutiva; 16/12 avaliação final.

Como a apresentação de 14/11 já exige análise, o piloto termina antes dela: sessão 1 até 30/10 (no máximo 03/11), reteste entre 06/11 e 10/11, análise até 13/11. Para isso, app com M2 a M5 e todo o conteúdo revisado até 23/10, incluindo a trilha diária dos dias 2 a 6 (item 23; confirmado em 05/10), e o fluxo de questão com confiança rodando até 16/10 para os prints do relatório. Prioridade de conteúdo: Lógica de Programação e Framework MDA primeiro, Engine e Pixel Art na semana seguinte, trilha diária em paralelo. Escada adaptativa, offline e segundo formato ficam para depois do piloto.

Revisto em 09/10. Todos os prazos acima estão cancelados, por decisão do Tiago: o projeto deixa de correr atrás da janela do piloto e passa a seguir as fases de `docs/plano-do-app-completo.md`, sem datas (item 30).

## 21. Conteúdo versionado em JSON, com um único script de seed

Decidido em 05/10. Questões e cartões de conceito ficam em `content/questoes.json` e `content/topicos.json`, versionados no Git, e esse JSON é a fonte da verdade. Um único script (`scripts/seed-conteudo.js`, `npm run seed:conteudo`) valida o conteúdo e o espelha no Firestore com ids fixos, então rodar de novo atualiza em vez de duplicar. Corrigir uma questão é editar o JSON, fazer commit e rodar o script. Substitui o `seed-questions.js`, que tinha as questões escritas no código.

A validação barra o que quebraria a medida: questão sem exatamente uma alternativa correta, `correta` que não seja booleano, ids repetidos e formas A e B que não tenham uma questão de cada dificuldade. Cada documento grava `versaoConteudo`, um hash do conteúdo, para o paper poder dizer exatamente qual versão das questões o piloto usou. Questões removidas do JSON só são apagadas do banco com `--prune`, e nunca se já tiverem respostas em `answers`, para não deixar respostas órfãs.

Alternativas descartadas: cadastrar pelo console do Firebase (40 documentos com arrays aninhados, sem histórico), tela de administração no app (custo alto para conteúdo que muda duas ou três vezes) e embutir as questões no código do app (contraria o item 4 e obrigaria publicar o app de novo para corrigir um erro de digitação).

Os cartões ficam no documento da lição (campo `cartao`, uma lista de slides), que já tem leitura liberada nas regras, então não foi preciso abrir uma coleção nova. O conteúdo é rascunho com apoio de IA, com revisão independente de gabaritos, fatos e pistas (por exemplo, a alternativa correta ser sempre a mais longa); ainda precisa da revisão do grupo.

Revisto em 06/10. O seed foi rodado no projeto `maragames-mobile` pela primeira vez com este script: versão de conteúdo `5d59872c96b3`, 4 lições com cartão e 40 questões. Até então o banco tinha o seed antigo (3 questões sem o campo `bloco` e 5 lições sem tópico). O script reaproveitou as lições 1 a 4 pela ordem; as 3 questões antigas e a lição 5 ficaram, porque nada é apagado sem `--prune`. Por causa dessas sobras, `topicosMedidos` (`src/lib/bloco.ts`) passou a reconhecer tópico medido pela presença de questão das formas A ou B, e não por "questão que não é de prática": uma questão sem bloco não pode fazer um tópico contar como medido.

Revisto em 10/10 (Fase 8 do plano). Três mudanças no conteúdo, ainda sem seed:

- **Os cinco tópicos que só tinham prática ganharam diagnóstico e verificação**: 30 questões novas (formas A e B, uma de cada dificuldade por forma), escritas pelo assistente a pedido do Tiago, a partir do cartão de cada tópico e de pesquisa (documentação do Steamworks; Fagerholt e Lorentzon sobre interface diegética; Librande sobre o GDD de uma página; práticas de playtest e de áudio). Cada uma traz a fonte. São rascunho até o grupo revisar; os ids vão de `_07` a `_12` em cada tópico. O conteúdo passa a ter 100 questões, e os nove tópicos fazem o ciclo completo.
- **O "Correto." saiu do começo das 70 explicações** de alternativa certa: quando a pessoa errava, a tela mostrava "Resposta certa: Correto. ...".
- **A validação do seed acompanhou o ciclo da lição.** Saiu a regra "tópico da trilha diária só tem prática". Vale agora: todo tópico tem prática; quem tem questão de uma forma precisa das duas, cada uma com uma questão básica, uma intermediária e uma avançada; tópico sem forma nenhuma é válido e faz o ciclo curto. O campo `trilha` (`medido` ou `diaria`) fica como rótulo de origem, sem efeito no app.

`npm test` passou a conferir o conteúdo com a validação do seed (`src/__tests__/conteudo.test.js`). O seed foi rodado pelo Tiago em 10/10, sem `--prune`: versão `ebaeb429b051`, 100 questões gravadas, e as 3 questões antigas fora do JSON continuam no banco. Consequência para as duas contas de teste: GDD, UX/UI e Efeitos sonoros, que estavam concluídas no ciclo curto, passam a aparecer com o diagnóstico por fazer, apesar da prática já feita.

## 22. Fluxo e estado do participante no piloto

Decidido em 05/10. O caminho principal do app no piloto é um roteiro guiado (consentimento, pré-teste, cartão e prática de cada tópico, pós-teste, relatório, espera, reteste, SUS); a trilha livre de lições aparece na home, mas travada (item 6). Cinco escolhas sustentam esse roteiro:

- **Fase gravada em cada resposta** (`pre`, `pratica`, `pos` ou `reteste`). A mesma questão da forma A é pré-teste para metade dos participantes e pós-teste para a outra, e o reteste repete as questões do pós, então só a fase diz o que cada resposta mede. Como `answers` é imutável, o campo entra antes de existir resposta real, e a regra do Firestore passa a exigi-lo. O horário da resposta passa a ser o do servidor, porque o intervalo do reteste é calculado a partir dele.
- **Forma inicial alternada no aceite do consentimento.** Um contador em `piloto/contador`, incrementado em transação, dá A ao 1º participante, B ao 2º, e assim por diante. Isso garante metades iguais, o que um sorteio aleatório não garante com cerca de 15 pessoas. A forma fica em `users/{uid}.formaPre`, e a regra impede alterá-la depois de gravada.
- **Etapa calculada a partir das respostas**, sem campo gravado, coerente com os itens 2 e 13. Não há como a etapa contradizer o dado, e o retorno no meio de um bloco sai de graça. Consentimento e SUS ficam em `users/{uid}` (`consentiuEm`, `susRespondidoEm` e as notas).
- **Reteste do dia 7 ao dia 9**, em dias de calendário contados a partir do pós. Antes disso, a home mostra a contagem; depois, o participante ainda responde e a análise o marca como fora da janela, pela diferença entre as datas.
- **Ordem fixa de tópicos e questões; alternativas embaralhadas por participante e por fase.** A ordem das alternativas sai de uma semente (uid + questão + fase), então é estável se o participante sair e voltar, mas muda entre o pós e o reteste, o que impede lembrar a letra marcada. A análise não é afetada porque a resposta grava o id da alternativa, não a posição; a ordem exibida também é gravada (`ordemExibida`) para checar efeito de posição. O cansaço no último tópico (Pixel Art) fica como limitação.

Revisto em 06/10. Os tipos `Answer` e `Attempt` e o `firestore.rules` passaram a refletir o evento completo. Três escolhas de nome: o dono do documento é `uid` (antes `userId`) em `answers` e `attempts`; o horário é `respondidaEm`, preenchido com `serverTimestamp()` e conferido na regra contra `request.time`, então o relógio do aparelho não entra no dado; e `lessonId` saiu de `Answer`, porque os blocos pré, pós e reteste atravessam os quatro tópicos (em `Attempt` ele fica `null` nesses blocos). A tela entrega um `NovaResposta` (o `Answer` sem `id` e sem `respondidaEm`), e o repositório grava campo a campo.

A regra de `answers` (`respostaValida()`) exige exatamente os onze campos do evento, nenhum a mais: `uid`, `questionId`, `topicId`, `attemptId`, `fase`, `escolha`, `ordemExibida`, `correta`, `confianca`, `tempoMs` e `respondidaEm`. Confere também que `confianca` é inteiro de 1 a 3, que `ordemExibida` tem 4 itens e contém a `escolha`, e que a tentativa citada existe, é do próprio aluno e é da mesma fase (uma leitura a mais por resposta gravada). Para essa última checagem valer, `attempts` só aceita alterar `respostas` e `concluida` depois de criada. Tipo e regra andam juntos, como no perfil (item 9): mudou um, muda o outro. Em `users/{uid}`, `formaPre` é opcional, só aceita A ou B e não pode ser trocada nem removida depois de gravada. A exigência de 4 itens em `ordemExibida` precisa ser revista se um segundo formato de questão entrar (item 18).

Revisto em 06/10 (funções puras). A etapa e o embaralhamento viraram código em `src/lib/roteiro.ts` e `src/lib/embaralhar.ts`, com quatro escolhas que o texto acima não fixava:

- **Cartão e relatório não são etapas calculadas.** Ver o cartão ou o relatório não gera evento em `answers`, então não há como derivá-los. `etapaDoRoteiro` devolve `consentimento`, `pre`, `estudo` (um por tópico), `pos`, `espera`, `reteste`, `sus` ou `concluido`. A tela mostra o cartão quando o estudo do tópico tem zero respostas de prática, e o relatório do dia 1 dentro da espera.
- **Dia de calendário em fuso fixo, UTC−3 (São Luís).** A contagem do reteste não depende do fuso configurado no aparelho. Conta a partir da última resposta do pós: libera no dia do pós + 7, e depois do dia do pós + 9 o reteste segue aberto com `foraDaJanela` verdadeiro.
- **No reteste, nenhuma alternativa repete a posição que teve no pós.** Só com a semente, uma alternativa cairia no mesmo lugar em 1 de cada 4 casos, o que enfraquece o "impede lembrar a letra marcada". A ordem do reteste é sorteada pela semente do reteste até nenhuma posição coincidir com a do pós, e continua determinística. O gerador é próprio (hash FNV-1a e mulberry32), sem `Math.random` nem `crypto`, para dar a mesma ordem em qualquer aparelho.
- **A ordem dos tópicos é parâmetro da função**, e ela falha com erro se os blocos medidos chegarem sem questões, em vez de tratar o bloco vazio como concluído e pular a medição.

Revisto em 06/10 (tela de consentimento). O aceite do termo virou código: tela em `src/components/consentimento/`, rota `(app)/consentimento`, texto em `src/constants/termo.ts` e gravação em `registrarConsentimento` (item 3). Seis escolhas:

- **O consentimento é etapa do roteiro, não guard de navegação.** A tela abre pelo "Continuar estudos" da home. Um quarto `Stack.Protected` obrigaria aceitar o termo para ver a home, e quem não quisesse participar ficaria preso. Os três estados de sessão do item 7 não mudam. "Agora não" volta à home sem gravar nada.
- **Uma transação escreve as duas pontas.** Ela lê `piloto/contador` e `users/{uid}`, soma 1 ao contador e grava no perfil `formaPre` (posição ímpar dá A, par dá B; `formaDoParticipante`, em `src/lib/participante.ts`) e `consentiuEm`, com o horário do servidor. O primeiro aceite cria o contador, então ninguém precisa prepará-lo. Quem já aceitou recebe de volta o que está gravado, sem gastar uma posição.
- **As regras conferem a transação inteira, uma ponta olhando a outra.** Em `users/{uid}`, o aceite só passa se o perfil não tinha consentimento, se `consentiuEm` é o horário do servidor, se o contador subiu exatamente 1 naquela transação e se a forma é a que o novo total dá. Em `piloto/contador`, a escrita só passa se sobe de 1 em 1 e se, na mesma transação, quem escreve está ganhando `formaPre` pela primeira vez. Isso usa `get()` (o documento antes) e `getAfter()` (como fica depois). Fora do aceite, forma e data não mudam nem somem, e o perfil não pode ser criado já com elas. Fecha a pendência do item 24: o participante não escolhe a própria forma, nem gravando direto, nem pulando uma posição.
- **Aceite simultâneo é refeito pelo app.** Quando dois aceitam ao mesmo tempo, o segundo escreve com o total antigo, e a regra o recusa com `permission-denied` antes de o Firestore refazer a transação sozinho. Como na sessão 1 a turma aceita junta, o repositório refaz o aceite até 6 vezes, relendo o contador, com espera crescente e variada. Achado pelo teste no emulador; uma recusa de verdade (regras não publicadas) falha depois das tentativas e a tela mostra o erro.
- **A mesma conta em dois lugares**, como na validação do perfil (item 9): `formaDoParticipante` no app e `formaDoContador` nas regras. Mudou uma, muda a outra.
- **O texto do termo é rascunho** e fica num arquivo próprio, separado dos rótulos de interface, porque mudar uma frase ali muda o que o participante aceitou. A versão do termo aceita não é gravada no perfil; quem a registra é o histórico do Git.

Revisto em 06/10 (cartão de conceito). O cartão virou tela: `src/components/cartao/`, rota `(app)/cartao/[topicId]` e leitura em `src/hooks/use-cartao.ts`, que busca os slides na lição do tópico (item 21). Cinco escolhas:

- **Quem decide entre cartão e prática é `destinoDaEtapa`** (`src/lib/passo.ts`): na etapa `estudo` com zero respostas de prática, o destino é o cartão; com uma ou mais, a prática. É o critério que este item já fixava, agora num lugar só e com teste. A etapa calculada continua sendo `estudo`; o cartão não entra em `etapaDoRoteiro`.
- **Um slide por vez**, com "Voltar" e "Próximo" e uma barra de progresso. Só no último slide o botão vira "Começar a prática". Não há como pular o cartão, mas nada mede se a pessoa leu: ver o cartão não gera evento e o tempo nele não é gravado.
- **Nada do cartão é guardado.** O slide em que a pessoa está só existe enquanto a tela está aberta. Quem sai pelo X e volta recomeça do primeiro, e a home continua mandando para o cartão até existir uma resposta de prática.
- **Sem revisão durante a prática.** Depois da primeira resposta, a home leva direto à prática e não há link para reabrir o cartão: a prática com feedback é a intervenção, e o cartão vem antes dela.
- **A prática toma o lugar do cartão na pilha de telas** (`replace`, e não `push`), então sair da prática volta à home, e não a um cartão que já não deveria abrir. Tópico sem cartão vai direto à prática, em vez de mostrar uma tela vazia.

Revisto em 08/10 (relógio e volta ao app). Dois pontos levantados na revisão automática do pull request nº 5:

- **A home refaz a conta quando o app volta a ficar ativo**, e não só quando a tela ganha foco. O app fica dias na memória do celular; quem voltava no dia do reteste via "O reteste abre amanhã", porque não tinha trocado de tela. `useAoVoltarAoApp` escuta o estado do app (no celular) e a visibilidade da aba (na web) e chama o mesmo `recarregar`. Não há relógio marcado para a meia-noite: só serviria a quem deixa a tela aberta na virada do dia.
- **A liberação do reteste usa o relógio do aparelho** contra o horário do servidor gravado no pós. Com o relógio adiantado o reteste abre antes; atrasado, segura. Limitação aceita: saber a hora do servidor pediria uma escrita a cada abertura da home ou uma regra no servidor, que está fora do escopo (item 5). A medida não se perde, porque a resposta do reteste também leva horário do servidor: a exportação (M7) calcula os dias entre pós e reteste por esses horários e marca quem ficou fora de 7 a 9.

Revisto em 09/10 (virada, item 30). O roteiro guiado deixa de ser o caminho do app. Continuam valendo a fase gravada em cada resposta, a forma por participante, o estado calculado das respostas, as alternativas embaralhadas por semente e nenhuma posição repetida entre o pós e o reteste. Mudam três coisas: a etapa única do participante dá lugar a um estado por lição (`estadoDaLicao`, Fase 1 do plano); os 7 dias passam a correr por lição, a partir da verificação dela, e a marca de "fora da janela" fica só na análise; e o consentimento deixa de ser a primeira etapa de um roteiro, com o lugar dele ainda por decidir (D3 do plano). No código, `etapaDoRoteiro` vale até as Fases 1 e 2.

## 23. Trilha diária com limite por dia e indicadores para a Mara Games

Decidido em 05/10. O app não é tratado só como instrumento do estudo: a ideia é que vire um produto real da Beast Maragames, e um app parado por seis dias ensina o usuário a não abri-lo. Por isso, entre o pós-teste e o reteste, entra uma trilha diária no estilo Duolingo, sem tocar no que é medido.

- **Ordem do dia 1, do mais concreto ao mais abstrato:** Framework MDA, Pixel Art Básico, Escolhendo a Engine Certa, Lógica de Programação. O tópico mais difícil fica no fim, quando a pessoa está mais cansada; o custo foi aceito, porque começar pelo difícil desanima, e vira limitação no paper.
- **Dias 2 a 6, um tópico por dia, "do papel à loja":** GDD, UX/UI em jogos, Efeitos sonoros, Playtest e iteração, Publicando na Steam. Cada um tem um cartão curto e 5 a 6 questões de prática, com feedback completo, e não entra na medição. Level Design, Narrativa e Psicologia do Jogador ficaram de fora porque falam de diversão e estéticas, o mesmo conteúdo do MDA, e contaminariam o reteste. Todo esse conteúdo precisa estar pronto até 23/10 (item 20).
- **Limite diário:** um tópico novo por dia de calendário. Ao terminar, o app mostra a sequência e "volte amanhã". A sequência conta dias seguidos de uso; pular um dia zera o contador (sem protetor de sequência no piloto), mas o próximo tópico da fila continua esperando, então ninguém perde conteúdo. A trilha anda no ritmo de cada participante.
- **Os quatro tópicos medidos ficam travados** entre o pós e o reteste (sem cartão nem prática), para que o reteste meça retenção e não revisão. Depois do reteste, destravam e entram na revisão normal.

Indicadores para a Mara Games, todos derivados de `answers`: aprendizagem (ganho normalizado pré → pós, retenção pós → reteste); consciência do próprio saber (acerto por nível de confiança, taxa de ponto cego, acerto simples × acerto firme, mudança de quadrante); engajamento (dias ativos entre os dias 2 e 6, sequência média, tópicos do dia concluídos, adesão ao reteste); qualidade do conteúdo (acerto e ponto cego por questão, distrator mais escolhido, dificuldade real × prevista); usabilidade (SUS). O indicador central é se respostas Firmes no pós são mais lembradas no reteste do que as Frágeis: se sim, a confiança declarada prevê o esquecimento, o que a plataforma atual não consegue. O aluno vê os próprios indicadores no app.

Entrega à Mara Games (decidido em 05/10): o grupo exporta os dados e envia um CSV com um código no lugar de nome e contato, junto com os indicadores agregados (M7). Não há painel nem papel de administrador dentro do app, o que evita mexer em autenticação e regras para algo usado uma vez. Com cerca de 15 pessoas e sem grupo de controle, os números descrevem e não provam causa.

Revisto em 07/10 (confirmado). O grupo reconsiderou espalhar os quatro tópicos medidos por quatro dias, um módulo de 10 questões por dia, e manteve o desenho acima. O que pesou: hoje os dias de engajamento estão separados da medição, e o dado fica completo com duas aberturas do app (dia 1 e reteste); com um módulo medido por dia seriam oito, e cada falta viraria dado perdido, o que pesa com cerca de 15 participantes. O custo aceito é escrever os cinco tópicos da trilha até 23/10; se isso não couber, a alternativa volta à mesa, porque não exige conteúdo novo.

Revisto em 07/10 (trava). A trava dos tópicos medidos virou regra do roteiro inteiro: uma tela de estudo só abre se for a da etapa em que a pessoa está. A home já levava sempre à etapa certa; o que faltava era quem chega por outro caminho, como a URL digitada na web. Antes disso, com a home dizendo "o reteste abre em 6 dias", `/bloco/reteste` abria a questão 1 de 12, e nem o hook do bloco nem o `firestore.rules` olhavam a etapa ou a janela.

- **A regra é função pura**, `podeAbrir(etapa, destino)`, em `src/lib/passo.ts`, ao lado de `destinoDaEtapa`: cartão e prática de um tópico abrem no estudo daquele tópico; pré, pós e reteste, na própria etapa; prática sem tópico na URL não abre, porque quem diz o tópico da vez é o roteiro. Na espera, nada abre.
- **Vale para os blocos medidos também**, e não só para cartão e prática, como a pendência dizia. Abrir o reteste antes da hora mede um dia de memória, e não sete; abrir o pós antes de estudar transforma o "depois" num segundo "antes". Os dois estragam a medida mais do que uma revisão.
- **Um portão só** (`src/components/roteiro/portao-do-roteiro.tsx`), usado pelas rotas `cartao/[topicId]` e `bloco/[fase]`. Ele calcula a etapa com o mesmo `useRoteiro` da home, mostra um indicador enquanto lê e, se a tela não é a da etapa, a rota redireciona para a home.
- **Decide uma vez, ao abrir.** Terminar a prática muda a etapa; se o portão decidisse de novo, tiraria a pessoa da tela antes de ela ver o resultado do bloco.
- **Falha de leitura fecha.** Sem saber a etapa, a tela não abre e a pessoa volta para a home, que tem "Tentar de novo".
- **Custo aceito:** tópicos, questões e respostas são lidos duas vezes ao abrir um bloco, uma pelo portão e outra pelo bloco. Pôr a checagem dentro dos hooks do bloco e do cartão evitaria a segunda leitura, mas espalharia a regra em dois lugares.
- **Exceção de desenvolvimento** (`travaVale`): em `__DEV__`, a trava não vale para pré, pós e reteste, para os links de teste da home continuarem abrindo o reteste sem esperar sete dias. No app do participante vale sempre. A exceção sai com os links, na limpeza antes do piloto.
- **A trava é do app, não do servidor.** Quem gravar direto no Firestore, fora do app, não passa por ela; validação no servidor está fora do escopo (item 5).

Os tópicos da trilha diária ainda não existem em `etapaDoRoteiro`, então a prática deles fica fechada por esta regra. Quando o limite diário entrar, ele acrescenta a sua parte a `podeAbrir`.

Revisto em 07/10 (espera do reteste). A espera ganhou tela, em duas partes, sem decidir os pontos do protótipo que seguem em aberto (item 28):

- **Na home**, o cartão "Próxima etapa" vira a contagem: "Seu reteste abre em", o número de dias em destaque e as datas ("Abre na terça, 13/10, e fica disponível até quinta, 15/10."). O botão principal, que ficava apagado, passa a ser "Ver meu resultado do dia 1". Os atalhos travados continuam.
- **Na rota `/dia-1`**, o resultado do pós-teste, com o mesmo componente do fim do bloco (item 27), e a lista "Travados até o reteste" com os quatro tópicos e o motivo. Nada por questão: o hook nem entrega os enunciados à tela.
- **O resultado do dia 1 é o do pós-teste**, sem comparar com o pré. A comparação por tópico do protótipo continua em aberto.
- **Entra na mesma trava**: `destinoDaEtapa` leva a espera a `{ tipo: 'dia1' }`, e `podeAbrir` só deixa abrir da espera em diante, quando o pós já terminou. Com a trava, reabrir `/bloco/pos` deixou de mostrar o resultado; é por aqui que ele volta a ser visto.
- **Datas no fuso fixo de São Luís**, como o resto do roteiro: a etapa de espera passou a trazer `ultimoDiaEm`, e `dataEmSaoLuis` dá dia da semana, dia e mês sem depender do fuso do aparelho.

Ficou de fora o "Tópico de hoje" da trilha diária, que depende do conteúdo. Um ponto para o grupo ver: o resultado traz a seção "O que revisar primeiro" logo acima de "Travados até o reteste", o que pede revisão de tópicos que estão travados.

Revisto em 08/10 (retenção). O cálculo ficou em `src/lib/retencao.ts`, função pura: `retencao(respostas, questoes)` compara o pós com o reteste, questão a questão, e devolve a razão entre os acertos do reteste e os do pós, no geral e por tópico, e o indicador central deste item: dos acertos do pós, quantos continuam certos no reteste, separando os que eram Firmes dos Frágeis. Quatro escolhas:

- **Só entram as questões respondidas nas duas fases.** Quem parou o reteste no meio é comparado no que respondeu; as que faltam não contam como esquecidas.
- **Pós sem acerto dá razão indefinida (`null`), e não zero.** Não havia o que reter.
- **A razão pode passar de 1**, quando a pessoa acerta no reteste o que errou no pós. O número fica como é; quem interpreta é a análise.
- **O quadrante que vale é o do pós.** A confiança declarada no reteste não entra na separação entre Firme e Frágil.

Não aparece em tela nenhuma: serve ao script de exportação (M7) e à análise.

Revisto em 08/10 (ordem no app). O conteúdo passou a trazer, em cada lição, a ordem de apresentação (`ordem`) e a trilha (`medido` ou `diaria`), e o app passou a ler as duas. `ordenarLicoes` ordena por `ordem`; `order` continua sendo só o número da lição no curso. Lição sem `ordem`, sobra de um seed antigo, vai para o fim, pelo número da lição, para não furar a fila. Como a ordem do roteiro sai da ordem das lições, o dia 1 passa a seguir MDA, Pixel Art, Engine, Lógica assim que o seed novo rodar; até lá, o banco não tem o campo e nada muda. Quem já passou do estudo não é afetado.

Revisto em 08/10 (trilha no app). A trilha diária foi implementada, em função pura (`src/lib/trilha.ts`), sem gravar nada a mais: a fila e a sequência saem de `answers`.

- **Uma regra só decide a fila:** o próximo tópico abre no dia de calendário seguinte ao da conclusão do anterior, e o primeiro, no dia seguinte ao do pós-teste. Cobre os três casos sem regra à parte: quem faz um por dia, quem pula dias (encontra o mesmo tópico esperando) e quem começa um tópico num dia e termina no outro (o que vale é o dia do fim).
- **Tópico começado continua aberto** até terminar, em qualquer dia.
- **Quais são os tópicos da trilha** sai das questões, como os medidos: são os que têm prática e nenhuma questão das formas A ou B (`topicosDaTrilha`). O campo `trilha` do conteúdo confere com isso, mas a regra não depende dele.
- **Sequência:** dias seguidos com pelo menos uma resposta confirmada, de qualquer fase; o dia 1 conta. Antes de responder hoje, a sequência que vinha até ontem continua valendo; um dia inteiro sem resposta zera. Abrir o app sem responder não conta, porque isso não gera evento.
- **A trilha corre ao lado do roteiro**, e não dentro dele: não é uma `Etapa`. `useRoteiro` entrega as duas coisas, e a home mostra o cartão "Tópico de hoje" abaixo do cartão do roteiro. Na espera do reteste, com tópico para hoje, a ação principal da tela é o tópico, e "Ver meu resultado do dia 1" vira botão de contorno; no dia do reteste, o reteste continua na frente.
- **No fim do tópico, a tela da sequência entra no lugar do resultado detalhado:** mascote, dias seguidos, acerto do tópico, os sete dias do piloto e o próximo tópico com "Libera amanhã". O feedback já foi dado questão a questão; o que traz a pessoa de volta é a sequência.
- **Trava:** `podeAbrir` deixa abrir o cartão e a prática do tópico de hoje em qualquer etapa. O de amanhã, o já feito e qualquer outro voltam para a home.
- **Relógio:** a liberação do tópico usa o relógio do aparelho contra horários do servidor, a mesma limitação do reteste (item 22).

Ficaram de fora: lembrete por notificação, protetor de sequência e a fila "Revisar hoje".

Revisto em 08/10 (exportação). O script de exportação está em `scripts/exportar-piloto.ts`, e as contas, em `src/lib/exportacao.ts`, função pura. O script só lê o Firestore, com a chave de serviço, e escreve em `exportacao/AAAA-MM-DD/`, que está fora do git.

- **Cinco arquivos.** `eventos.csv` (uma linha por resposta), `participantes.csv` (uma por pessoa), `questoes.csv` (uma por questão) e `resumo.md` podem ser enviados. `chave.csv` liga cada código ao nome e fica só com o grupo.
- **Código pela ordem do aceite do termo** (P01, P02...), para ser o mesmo a cada rodada com o mesmo filtro.
- **Do perfil, só a experiência com games sai.** Nome, apelido, e-mail, telefone, curso e instituição ficam de fora: com cerca de 15 colegas, curso e instituição já identificam. Um teste confere que nome, contato e `uid` não aparecem em nenhum arquivo que é enviado.
- **`--desde AAAA-MM-DD`** deixa de fora quem aceitou o termo antes da data, que é como as contas de teste ficam de fora sem depender da limpeza.
- **As contas são as do app.** Quadrante, XP, resultado do bloco, retenção e trilha vêm das funções de `src/lib`. Para o script rodar TypeScript entrou o `tsx` como dependência de desenvolvimento; reescrever as regras em JavaScript abriria espaço para o número do CSV divergir do que o aluno vê.
- **Por participante:** acertos no pré, no pós e no reteste; ganho normalizado de Hake (indefinido se o pré já foi 100%); retenção; acertos Firmes e Frágeis do pós mantidos no reteste; pontos cegos no pós; tópicos da trilha; dias ativos e maior sequência. Sem reteste, os campos dele ficam vazios, e não com zero.
- **Dias entre o pós e o reteste pelos horários do servidor**, com a marca de quem ficou fora de 7 a 9. É a resposta à limitação do relógio do aparelho (item 22).
- **Por questão:** acerto, ponto cego e distrator mais escolhido, com a dificuldade prevista ao lado. O reteste não entra, porque repete as questões do pós.
- **Formato:** ponto e vírgula, decimal com vírgula e UTF-8 com marca, para abrir direto no Excel em português.

O script não faz teste estatístico nem gráfico, e ainda não tem o SUS.

Revisto em 09/10. Dois ajustes depois de rodar o script com o filtro: a pasta passou a ser `exportacao/AAAA-MM-DD-desde-AAAA-MM-DD` quando há `--desde`, para a rodada filtrada não escrever por cima da completa; e, se ninguém entra no filtro, o script avisa e não grava arquivo nenhum. O que gravar e com que nome saiu do script para duas funções puras (`pastaDaExportacao` e `arquivosDaExportacao`), com teste.

Revisto em 09/10 (virada, item 30). Saem a fila de um tópico novo por dia e a trava pelo roteiro geral. A trilha diária passa a ser a sugestão do dia: um cartão "Para hoje" que aponta a revisão vencida, depois a lição pela metade, depois a próxima lição nova, sem limite por dia. A sequência continua contando dias de calendário com resposta. A trava passa a valer só dentro de uma lição: os passos não se pulam, o diagnóstico é obrigatório e, entre a verificação e a revisão, a prática daquela lição fica fechada e o cartão, livre; entre lições não há trava. O portão único e a regra em função pura continuam sendo o desenho. Os indicadores para a Mara Games e a exportação pelo grupo ficam, com ganho e retenção por tópico (Fase 9 do plano). No código, a fila e a trava antigas valem até as Fases 2 e 4.

Revisto em 10/10 (Fase 4 do plano). A fila de um tópico por dia, a trava pelo roteiro geral e as telas delas saíram do código: `src/lib/trilha.ts` (ficou só a sequência de dias, em `src/lib/sequencia.ts`), `src/lib/passo.ts`, o portão do roteiro, o cartão da trilha, a tela "Seu dia 1" e as rotas `/bloco/[fase]`, `/cartao/[topicId]` e `/dia-1`. A trava que vale é a da lição (`podeAbrirNaLicao`, item 30). `src/lib/roteiro.ts` continua no repositório porque a exportação ainda usa as contas dele (Fase 9), e `useBloco` ainda aceita o bloco geral, sem tópico, que nenhuma rota abre mais.

## 24. Pendências, na ordem das fases do plano

Revisto em 06/10: a lista passou a ser agrupada na ordem de ataque combinada com o grupo, e é atualizada a cada item resolvido.

Revisto em 09/10 (virada, item 30): os grupos deixam de ser as sessões do piloto e passam a ser as fases de `docs/plano-do-app-completo.md`, que não têm data. Uma fase só começa quando a prova da anterior passa.

**Para o Tiago revisar, antes de qualquer commit**

- Tudo o que foi feito em 10/10 está só no computador, na branch `feat/ciclo-da-licao`, sem commit depois do da Fase 1. As escolhas de tela tomadas sem ele estão no item 30 e em `docs/passagem-de-sessao.md`.

**Fase 0 — Documentos e o que está aberto**

- O grupo confirmar a virada (item 30): ela foi fechada só com o Tiago.

**Fase 2 — Página da lição e blocos por tópico**

- Percorrer no app uma lição de ciclo completo desde o diagnóstico e conferir os eventos no banco. Pede uma conta nova, que só o Tiago pode criar. A de ciclo curto foi feita em 10/10 (Efeitos sonoros).
- O texto do termo, em `src/constants/termo.ts`, continua rascunho.

**Fase 8 — Conteúdo**

- O grupo revisar as 30 questões novas de diagnóstico e verificação (ids `_07` a `_12` de GDD, UX/UI, Efeitos sonoros, Playtest e Publicando na Steam), escritas pelo assistente.
- Sobras do seed antigo no banco (item 21): 3 questões fora do JSON, sem versão de conteúdo. Decidir se roda com `--prune`.
- Com o seed de 10/10, GDD, UX/UI e Efeitos sonoros passaram a aparecer nas contas de teste com o diagnóstico por fazer e a prática já feita. Só afeta essas duas contas.

**Fase 7 — Revisão em intervalos crescentes**

- Fora por ora (D7): fica uma revisão só, aos 7 dias.

**Fase 9 — Exportação**

- `npm run exportar` com ganho e retenção por tópico e por pessoa. Hoje o script ainda monta o pré e o pós gerais; com as formas novas, os nove tópicos entram nesses blocos.
- Com a exportação refeita, apagar `src/lib/roteiro.ts` (ficam as contas de calendário) e o bloco geral de `useBloco`.

**Fase 10 — Acabamento**

- Conferir num aparelho de verdade (Expo Go) e em largura de celular: a home nova, a lista, a página da lição, o fim de cada passo, o Progresso e o Perfil, com a troca de tema pela seção "Aparência" (item 31) e a barra de status nos dois temas, e um aparelho Android (fonte em negrito e botão de voltar).
- Conferir a troca de tema do sistema com o app aberto e logado (item 29): a correção já está no `main`. Faltam as telas logadas e o Expo Go.
- Nome do app: no Expo Go aparece "maragames-app", o `name` do `app.json`.
- Dependências sem uso: `expo-symbols`, `react-native-reanimated` e `react-native-worklets`. Conferir se o Expo Router ainda precisa das duas últimas.
- O projeto não tem ESLint configurado, então `npm run lint` não roda.
- Dados de teste: duas contas (a do Tiago e a de apelido Tiagopbc) e o contador em 2 (D8).
- Forma de distribuição (Expo Go, build web na Vercel ou build EAS com APK/TestFlight).

**Decisões em aberto**

- D8 (as contas de teste), na seção 10 do plano. As outras foram decididas: D1, D2, D3 e D5 em 09/10; D4, D6 e D7 em 10/10.

**Deixaram de valer com a virada (item 30)**

- Tela do SUS: saiu do app por ora (D4).
- Lembrar o participante de voltar por mensagem no grupo da turma.
- Exportação com `--desde 2026-10-30`, depois do reteste do piloto.
- Aplicar o resto do visual do protótipo (item 28) e os pontos em que ele contradizia as decisões: o desenho das telas passou a ser o do plano.
- A seção "O que revisar primeiro" na tela do dia 1 e a numeração dos dias do reteste: a tela saiu, e os 7 dias contam por lição.
- Número e perfil dos participantes do piloto, versão em português do SUS e data do Incubators.

**Resolvidas em 10/10**

- Progresso: seção "O que revisar primeiro", com as três lições mais fracas, pedida pelo Tiago depois de ver a tela no iPhone (item 30).
- Tema claro, escuro ou do sistema, escolhido no Perfil e guardado no aparelho (item 31).
- Fase 3 do plano: lista de lições em `/licoes`, por módulo, com situação e domínio; qualquer lição abre.
- Fase 4 do plano: home nova, com "Para hoje", revisões agendadas e os atalhos Lições, Progresso e Perfil liberados. Saíram as telas e as regras do roteiro do piloto (itens 6 e 23).
- Fase 5 do plano: Progresso ("Meu domínio") e detalhe do tópico, o restante do M4.
- Fase 6 do plano: Perfil, com edição de tudo menos o e-mail, data do termo e "Sair"; regras da edição testadas no emulador.
- Fase 8 do plano: 30 questões novas, "Correto." fora das explicações e validação do seed ajustada (item 21). Seed rodado pelo Tiago em 10/10, versão `ebaeb429b051`: 100 questões gravadas. Falta a revisão do grupo.
- Conferência no app, no Chrome do Tiago: as telas novas e a lição Efeitos sonoros feita até o fim (item 30).
- Fase 2 do plano, no código (item 30): página da lição em `/licoes/[topicId]`, cartão e passos com questões em rotas próprias, blocos sem feedback por tópico, fim de cada passo (o diagnóstico sem número, o antes e depois no fim da verificação), trava por lição com a prática fechada entre a verificação e a revisão, e o termo antes do primeiro diagnóstico. `npm test` passa com 658 e `npx tsc --noEmit` sem erros. Falta ver no app com uma conta logada.
- Regras do Firestore de `answers` e `attempts` testadas no emulador (`regras/respostas.test.ts`, 34 testes; `npm run test:regras` passa com 59). As regras não precisaram mudar.
- Decisão do Tiago: o resultado do diagnóstico só aparece no fim da lição, e o XP dele entra no total junto com o da verificação.

**Resolvidas em 09/10**

- Fase 1 do plano, o motor do ciclo da lição (item 30): `estadoDaLicao`, `cicloDaLicao` e `licoesDoAluno` em `src/lib/licao.ts`, `sugestaoDoDia` em `src/lib/sugestao.ts` e `xpDasLicoes` em `src/lib/xp.ts`, com 50 testes novos, entre eles a conta do roteiro antigo lida pelo modelo novo. `npm test` passa com 603 e `npx tsc --noEmit` sem erros. Nenhuma tela mudou.
- Pull request nº 7 integrado ao `main` pelo Tiago (ajustes da exportação, XP à vista, plano e documentos da virada). Fecha a parte de código e de documentos da Fase 0; a Fase 1 parte do `main`, na branch `feat/ciclo-da-licao`.
- Plano do app completo aprovado pelo Tiago (item 30), com D1 e D2 decididas. `AGENTS.md`, os itens 6, 19, 20, 22, 23 e 27 e esta lista foram revistos para a virada.
- Correção do tema na web (item 29) trazida para a branch: ela já estava no `main` remoto, pelo pull request nº 6, e entrou por junção. `npm test` passa com 553 (os 549 de antes e os 4 do projeto "web") e `npx tsc --noEmit` sem erros.
- XP à vista (item 14): a tela da sequência mostra o XP do tópico ao lado dos acertos, "Seu dia 1" diz "XP do pós-teste" e a home ganhou o selo com o total, que só conta bloco medido depois de concluído e tem piso em 0. Coberto por testes (`npm test` com 549). Conferido na web, no Chrome do Tiago, com a conta dele, em tema escuro, em largura de computador e de celular: a home mostra "XP: +10" ao lado da saudação, e "Seu dia 1" mostra "XP do pós-teste" com −18 XP. Os dois números batem com a exportação de 09/10 somada ao UX/UI (−8 + 18 = +10; pós em −18). A tela da sequência não reabre depois do tópico do dia, então fica para o próximo tópico, junto com o iPhone.
- Pull request nº 5 integrado ao `main` pelo Tiago. O trabalho novo parte do `main`, em branch própria.
- Exportação: a pasta leva a data do filtro no nome, e um filtro que não pega ninguém avisa e não grava nada (item 23). Antes, duas rodadas no mesmo dia escreviam uma por cima da outra, e a segunda, vazia, apagou os arquivos da primeira.
- Cartões na cor antiga ao trocar de tema com o app aberto, na web: a causa era o `useColorScheme` do react-native-web, e não o React Compiler. Corrigido no hook da web, com teste (item 29). Fica a conferência com o app logado, acima.

**Resolvidas em 08/10**

- Script de exportação (M7, item 23): `npm run exportar` gera `eventos.csv`, `participantes.csv`, `questoes.csv`, `resumo.md` e a chave do grupo. Rodado contra o banco, só lendo, com as duas contas de teste: 2 participantes, 86 eventos e 70 questões; os acertos e os pontos cegos batem com o que o app mostra para cada conta.
- Tópico da trilha percorrido no app, na web, em tamanho de celular, com a conta do Tiago: cartão do GDD (4 slides), as 6 questões de prática com feedback (visto também no tema claro: rodapé fixo e confiança travada), e a tela da sequência, com "1 dia seguido", "Sequência iniciada!", "Você acertou 5 de 6", as bolinhas de terça (dia do pós) e de quinta cheias e a de quarta vazia, e o próximo tópico com "Libera amanhã". De volta à home: "Feito por hoje. Próximo: UX/UI em jogos. Libera amanhã." e o selo "Sequência: 1 dia". A conta do Tiago ficou com 6 respostas de prática a mais e o GDD concluído em 08/10.
- Seed com o conteúdo novo rodado pelo Tiago (versão `f870c2d83e2b`): 9 lições, com `ordem` e `trilha`, e 70 questões. Conferido no banco.
- Trilha diária vista no app, na web, com a conta do Tiago (pós em 06/10): a home mostra "Tópico de hoje" com "GDD: o documento do jogo" e "Começar", e "Ver meu resultado do dia 1" como botão de contorno; o cartão do GDD abre, com 4 slides; `/cartao/ux_ui_jogos` e `/bloco/pratica?topicId=publicando_steam` voltam para a home.
- Trilha diária no app (item 23): fila de um tópico por dia, sequência de dias, cartão "Tópico de hoje" na home, tela da sequência no fim do tópico e a trava estendida aos tópicos da trilha.
- Home refaz a conta do roteiro quando o app volta do segundo plano (item 22), apontado na revisão automática do pull request nº 5.
- Login num iPhone, pelo Expo Go, em tema escuro (captura do Tiago, 08/10): a logo em SVG aparece, sobre o círculo branco, e a fonte está certa. Ao carregar, o Expo Go mostra o ícone novo, com a logo.
- Tela da pergunta num iPhone, pelo Expo Go, em tema escuro (captura do Tiago, 08/10): fonte Lexend com os pesos certos, cabeçalho abaixo da ilha do aparelho, os três níveis de confiança numa linha só e o Confirmar acima da barra de gestos, sem rolar. O contador "1/12" ficou atrás do botão flutuante de ferramentas do Expo Go, que não existe fora do Expo Go.
- Pull request nº 5 aberto, com o `main` já trazido para a branch. O único conflito foi `assets/images/logo-beast.svg`, criado nos dois lados com o mesmo desenho; ficou a versão com a cor escrita em cada caminho.
- Conteúdo da trilha diária no repositório (veio do `main`): GDD, UX/UI em jogos, Efeitos sonoros, Playtest e iteração e Publicando na Steam, com cartão de 4 slides e 6 questões de prática cada.
- Ordem dos tópicos no dia 1 decidida pelo grupo, gravada no conteúdo no campo `ordem` e usada pelo app (item 23). Passa a valer no app quando o seed novo rodar.
- Tela própria para endereço que não existe, em português, e mapa de rotas do Expo Router desligado (item 7).
- Cálculo de retenção, do pós para o reteste, em função pura (item 23).
- Abertura e ícone do app (item 28): saiu a animação do template, com a logo do Expo; o ícone, o favicon e a tela de abertura passaram a ser a logo da Beast Maragames. Conferido na web (o app abre sem a animação e o favicon novo é servido); ícone e tela de abertura no celular só aparecem num build próprio, que ainda não foi feito.
- Roteiro do dia 1 percorrido com uma conta nova (apelido Tiagopbc), depois da identidade visual e da trava, na web, no Chrome do Tiago, em tema escuro e largura de computador: termo com o mascote, pré-teste (12 questões sem nenhum feedback, com saída no meio pelo X e retomada na questão 6), cartão e prática dos quatro tópicos (feedback de acerto com "+3 XP" e selo Firme; feedback de erro com a escolhida em vermelho, a certa em verde, "−4 XP", selo Ponto cego e as duas explicações; confiança travada no rodapé), pós-teste e espera ("7 dias", de quinta, 15/10, a sábado, 17/10). No estudo do MDA, `/cartao/pixel_art_basico` voltou para a home. No banco: 40 respostas com os onze campos, `correta` igual ao gabarito em todas, pré na forma B e pós na forma A, seis tentativas concluídas, contador em 2.
- Validação de 08/10: `npm test` (394), `npx tsc --noEmit` e `npm run test:regras` (25) passando. Na web, no Chrome do Tiago, em tema escuro e com a conta dele na espera: home com a contagem, "Seu dia 1", saída pelo X, `/cartao/mda_framework`, `/bloco/pratica?topicId=mda_framework` e `/bloco/pratica` voltando para a home, e a tela da pergunta com o rodapé inteiro à vista em 440×956.
- Estado de acessibilidade na web (item 25): alternativa e confiança marcadas, caixa do termo, botão ocupado, barra de progresso e avisos passaram para as props `aria-*`. As antigas não chegavam à página.
- Cadastro e perfil com os botões do tema, que tinham ficado no estilo antigo; as opções de experiência ganharam borda, porque só o fundo quase não se distinguia no tema claro (item 28).
- Protótipo do Figma corrigido (item 28): o Tiago aplicou à mão, no arquivo "MaraGames App - Protótipo do piloto", os ajustes adotados em 06/10, inclusive nos quadros do tema escuro. É o arquivo que vai para o professor em 09/10.

**Resolvidas em 07/10**

- Barra de abas do template: as abas saíram, na web e no celular, e a home ficou direto no `Stack` (item 6).
- Tela de espera do reteste: contagem e datas na home, e o resultado do dia 1 com os tópicos travados em `/dia-1` (item 23). Conferido na web com a conta do Tiago.
- Trava do roteiro: cartão, prática, pré, pós e reteste só abrem na etapa certa, também para quem digita a URL (item 23). Conferido na web com a conta do Tiago, que está na espera: o cartão e a prática do MDA voltaram para a home.
- Aparência do protótipo no app: cores, fonte Lexend, estilo dos componentes, logo no login e mascote no consentimento (item 28).
- Conferência visual na web, com a conta do Tiago: em 375×812 a saudação da home começa a 24 px do topo, sem nada por cima; na pergunta, os três níveis de confiança e o Confirmar ficam à vista no rodapé, e em 320×568 continuam fixos enquanto as alternativas rolam (item 25). Nenhuma resposta foi gravada; abrir o reteste pelo link de desenvolvimento criou uma tentativa de reteste na conta de teste, que entra na limpeza.
- Rodapé fixo, correção de `topicosMedidos` e documentos de 06/10 em commit, na mesma branch (seis commits, sem push).

**Resolvidas em 06/10**

- Mascote: ficam os dois estilos, a logo no login e o lobo em cartum no consentimento e na sequência (item 28).
- Níveis de confiança abaixo da dobra: seletor em linha, fixo no rodapé (item 25).
- Roteiro do dia 1 percorrido com uma conta real, na web em tamanho de celular: termo, pré-teste, cartão e prática dos quatro tópicos, pós-teste e espera do reteste. Ficaram gravados 40 eventos (12 de pré na forma A, 16 de prática, 12 de pós na forma B), todos com os onze campos, horário do servidor e `correta` batendo com o gabarito; seis tentativas concluídas; contador em 1 e forma A no perfil. Sair no meio do pós e voltar retomou na questão certa, na mesma tentativa. Uma resposta ficou com `tempoMs` de 5 minutos porque a questão ficou aberta parada: é a limitação do relógio corrido registrada no item 25.
- Regras do Firestore publicadas no projeto `maragames-mobile`.
- Conteúdo dos quatro tópicos medidos gravado no projeto pelo seed (item 21).
- Trabalho da sessão em commit, na branch `feat/roteiro-do-piloto`.
- XP negativo no bloco (item 14), contador do piloto sem regra e participante escolhendo a própria forma (item 22), cartão de conceito e tela de fim de bloco (itens 22 e 27).

## 25. Interação da questão: alternativa e confiança, em qualquer ordem

Decidido em 05/10. Alternativa e nível de confiança são duas seleções independentes na mesma tela, e o aluno pode marcá-las em qualquer ordem. O botão Confirmar só ativa com as duas marcadas, seguindo Gardner-Medwin, em que cada resposta vem acompanhada do grau de certeza. Não há opção de pular: com "Palpite" valendo 1 no acerto e 0 no erro (item 14), responder sempre compensa, e o tipo `Answer` não precisa de um estado "em branco". Só a confirmação vira evento em `answers`; trocas de seleção antes de confirmar não são gravadas.

Revisto em 06/10 (implementação). A tela ficou em três camadas: regra em função pura (`src/lib/pergunta.ts` e `src/lib/bloco.ts`), dados no hook `src/hooks/use-bloco.ts` e apresentação em `src/components/pergunta/`. A rota é `bloco/[fase]`, com `topicId` opcional na prática. Escolhas que o texto acima não fixava:

- **Feedback na mesma tela, e só depois de gravar.** Na prática, a confirmação grava o evento e então a própria tela mostra certo ou errado, a explicação da alternativa escolhida (e a da correta, se errou), o XP da questão e o selo do quadrante. Uma rota separada para o feedback permitiria voltar e responder de novo. Nos blocos medidos a tela passa direto à questão seguinte, e uma linha fixa avisa que o resultado só aparece no fim.
- **Tempo de resposta em relógio corrido**, de quando a questão aparece até o primeiro toque em Confirmar. Tempo com o app em segundo plano entra na conta (limitação a registrar no paper). Se a gravação falha e a pessoa confirma de novo, vale o tempo da primeira confirmação.
- **Falha de gravação não duplica o evento.** O repositório grava a resposta e depois atualiza a tentativa; se a segunda parte cai, a resposta já existe. Por isso, depois de uma falha, a tela relê as respostas antes de gravar de novo e, se a questão já tem resposta na fase, segue com ela.
- **Sair não é pular.** Um X fecha o bloco, e o gesto de voltar fica desligado nessa tela. Como o progresso sai de `answers`, quem volta retoma na primeira questão sem resposta naquela fase.
- **Strings em `src/constants/textos.ts`**: rótulos de confiança (item 12), rótulos e descrições do quadrante, títulos dos blocos e textos da tela. Os componentes recebem o valor (1, 2, 3; `firme`, `fragil`...) e buscam o texto ali.
- **Estado dito por ícone e por cor.** Alternativa certa, errada e selo do quadrante têm ícone próprio, além das cores novas do tema (`sucesso`, `aviso`, `primaria`), para não depender de distinguir verde de vermelho. Trechos de código entre crases no conteúdo saem em fonte monoespaçada.
- **Quais questões entram em cada fase é uma regra só**, em `src/lib/bloco.ts`, usada pela tela e por `etapaDoRoteiro`.

Revisto em 06/10 (fim do bloco). A tela provisória "Bloco concluído" deu lugar ao resultado do bloco (item 27).

Revisto em 06/10 (rodapé fixo). Os três níveis de confiança passaram a ficar numa linha só, dentro de um rodapé fixo, junto do Confirmar; só o enunciado, as alternativas e o feedback rolam. Antes o seletor era uma lista vertical dentro da área de rolagem. Ao rodar o roteiro numa tela de 375×812, "Tenho certeza" só aparecia rolando, e em enunciado longo "Tenho dúvida" também sumia: um nível que o participante não vê enviesa a própria medida. A linha horizontal veio do protótipo do grupo (item 28); o rodapé fixo é o que garante que ela não desça com uma questão longa. No feedback da prática, a confiança declarada continua à vista no rodapé, travada. O nível marcado muda de borda, de fundo e de peso do texto, para não depender só de cor. Coberto por teste de componente. Visto na web em 07/10, em 375×812 e 320×568; falta um aparelho de verdade (item 24).

Revisto em 08/10 (acessibilidade na web). O estado e o valor que a tela informa ao leitor de tela passaram para as props `aria-*`: `aria-checked` na alternativa, no nível de confiança, na caixa do termo e nas opções de experiência do perfil; `aria-busy` no botão; `aria-valuemin`, `aria-valuemax` e `aria-valuenow` na barra de progresso; `aria-live` nos avisos. O React Native entende essas props no celular, e o react-native-web as entrega ao navegador. As antigas (`accessibilityState`, `accessibilityValue`, `accessibilityLiveRegion`) não chegavam à página: no Chrome, a alternativa marcada saía sem `aria-checked` e a barra, sem `aria-valuenow`, embora o desenho estivesse certo. Papel e rótulo (`accessibilityRole`, `accessibilityLabel`) chegam e continuam como estão. Os testes de tela não pegaram porque rodam no ambiente do iOS; quem pegou foi a conferência no navegador.

## 26. Regras de negócio em funções puras, com testes unitários

Decidido em 06/10. Tudo o que é derivado de `answers` (itens 2 e 13) fica em funções puras em `src/lib`, sem React nem Firebase, uma regra por arquivo: `quadrante.ts` (item 15), `xp.ts` e `dominio.ts` (item 14), `embaralhar.ts` e `roteiro.ts` (item 22). Recebem dados simples e devolvem dados simples, e o horário atual entra como parâmetro. Telas, hooks e os scripts de exportação (M7) usam as mesmas funções, então o número que o aluno vê e o que vai para o paper saem do mesmo código.

O framework de testes é o jest-expo (`npm test`; `npm run test:watch` para ficar observando), com os testes em `src/lib/__tests__/`. É o caminho da documentação do Expo, entende o alias `@/` e serve depois para testar hooks e telas sem trocar de ferramenta. Alternativas descartadas: Vitest, mais rápido, mas fora do ecossistema Expo, o que pediria uma segunda configuração para componentes; e o `node --test`, que não instala nada, mas exige Node 22.18 ou mais novo em todas as máquinas do grupo.

Os testes foram escritos antes do código e cobrem as bordas que mudam a medida: o nível 2 como confiança baixa, os limiares de 50% e 75% do XP, a questão repetida no reteste contando uma vez no domínio, a virada do dia no fuso de São Luís e a janela do reteste.

Revisto em 06/10. A tela da pergunta ganhou teste de componente (`src/components/pergunta/__tests__/`), com `@testing-library/react-native`, que é o caminho da documentação do Expo. O teste monta a tela inteira sobre um repositório em memória (`src/test/repositorio-falso.ts`), que implementa a mesma interface `ProgressRepository`, então exercita hook e componentes sem emulador do Firestore. Cobre o que muda a medida: Confirmar só com as duas seleções, em qualquer ordem; nenhum feedback em pré, pós e reteste; o tempo de resposta; a retomada; e a falha de gravação sem evento duplicado. O relógio entra na tela como parâmetro, como nas funções puras. Na configuração do Jest, imports de `.css` caem num módulo vazio.

Revisto em 06/10 (regras). As regras do consentimento ganharam teste no emulador do Firestore: `npm run test:regras`, com `firebase-tools` e `@firebase/rules-unit-testing` como dependências de desenvolvimento. Fica separado de `npm test` (pasta `regras/`, configuração própria em `jest.regras.config.js`) porque precisa de Java e sobe o emulador; o projeto usado é `demo-maragames`, e o prefixo `demo-` garante que nada chega ao Firebase de verdade. O teste roda a transação real do repositório contra as regras reais e depois tenta cada atalho na mão: escolher a forma, pular posição, mexer no contador sem aceitar, usar data do aparelho, trocar ou apagar depois. Cada condição da regra foi conferida tirando-a e vendo um teste falhar; foi assim que apareceram uma brecha sem teste e a recusa no aceite simultâneo (item 22).

Revisto em 07/10 (navegação). As rotas ganharam teste, em `src/__tests__/navegacao.test.tsx`, com o `renderRouter` do Expo Router sobre a pasta `src/app` de verdade, sessão simulada e o repositório em memória. Cobre o que a retirada das abas mudou (item 6): a home abre direto em `(app)`, nenhum texto do template aparece e `/explore` não leva a tela nenhuma. O teste fica fora de `src/app` porque lá todo arquivo vira rota. Dois detalhes de ferramenta: no Testing Library 14 o render é assíncrono, então o teste espera a promessa devolvida pelo `renderRouter` antes de ler a rota; e o Jest passou a conhecer o alias `@/assets`, que o `tsconfig.json` já tinha. O teste não mede pixels: sobreposição e rolagem continuam sendo conferência visual.

Revisto em 07/10 (aparência). Quatro testes novos guardam a identidade visual (item 28): o contraste de cada par de texto e fundo do tema; nenhuma cor escrita à mão fora de `src/constants/theme.ts`, nem o `Button` do React Native (esse teste é em JavaScript, porque lê arquivos com o Node e os tipos do Node não entram no `tsconfig`); a família de fonte que cada tipo de texto e cada peso recebem; e a tela de login, pelas rotas reais, com a sessão de quem não entrou. Teste não julga se a tela ficou boa: isso continua sendo conferência visual, nos dois temas. O Jest passou a ignorar `.claude/`, onde ficam os worktrees do assistente.

Revisto em 07/10 (trava). A trava do roteiro (item 23) é testada em três alturas: a regra, etapa por etapa, em `passo.test.ts`; o portão, com o repositório em memória (abre, barra, espera a leitura, fecha na falha e não decide duas vezes); e as rotas reais, em `navegacao.test.tsx`, onde quem está na espera e abre `/cartao/mda` ou `/bloco/reteste` termina em `/`. O teste do "decide uma vez" foi conferido tirando a proteção e vendo-o falhar. Como o Jest roda em modo de desenvolvimento, os testes do app do participante desligam `__DEV__` enquanto rodam.

Revisto em 07/10 (espera). A espera do reteste (item 23) tem teste nas mesmas três alturas: as funções puras de data e de texto, incluindo a virada do dia no fuso de São Luís e o "no sábado" e "no domingo"; a tela "Seu dia 1" sobre o repositório em memória (só o pós entra na conta, nenhum enunciado aparece, tópico da trilha não é travado, falha de leitura deixa tentar de novo); e as rotas reais, da home na espera até `/dia-1`, e `/dia-1` antes do pós voltando para a home.

Revisto em 08/10. Mais um teste de varredura, `src/__tests__/acessibilidade-na-web.test.js`: nenhuma tela usa as props de acessibilidade que não chegam à web (item 25). E o Jest das regras passou a ignorar `.claude/`, como o `npm test` já fazia.

Revisto em 08/10 (embaralhamento). `embaralhar.test.ts` ganhou um teste de uniformidade: em 4.000 sorteios por fase, cada alternativa cai em cada posição entre 22% e 28% das vezes. Veio de uma dúvida da validação: uma conta de teste teve a alternativa certa 7 vezes em 12 na posição D, no pós. Era acaso, e agora há teste que diz isso.

Revisto em 08/10 (abertura). O teste de cores ficou sem exceção nenhuma, e entrou `src/__tests__/identidade-do-app.test.js`, que lê o `app.json`: as imagens do ícone, do favicon e da tela de abertura existem, nenhuma é a do template, nenhuma cor é o azul do Expo, e o fundo da tela de abertura é o do tema, no claro e no escuro. O teste de navegação passou a conferir que a tela de abertura só é escondida quando a fonte está pronta.

Revisto em 08/10 (retenção e rotas). `retencao.test.ts` cobre as bordas que mudam o número: pós com zero acertos, reteste pela metade, resposta repetida na mesma fase, questão de fora do bloco e a confiança do reteste não contaminando o quadrante. O teste de navegação ganhou o endereço que não existe, logado e deslogado; o do `app.json` confere que o mapa de rotas está desligado.

Revisto em 08/10 (trilha). A trilha diária (item 23) tem teste nas três alturas de sempre: `trilha.test.ts`, com a fila, a virada do dia em São Luís, o tópico pela metade, a sequência com e sem dia pulado e a semana do piloto; o cartão da home, em cada estado; e as rotas reais, do "Começar" na home à tela da sequência e de volta, mais o tópico de amanhã barrado pela URL. O repositório em memória ganhou `acertarRelogio`, para o teste gravar respostas "hoje": antes ele carimbava tudo em 1970, o que bastava enquanto nada dependia do dia.

Revisto em 08/10 (exportação). `exportacao.test.ts` monta um piloto pequeno, com duas participantes, uma conta de teste e alguém sem termo, e cobre quem entra, o anonimato dos arquivos enviados, cada coluna que muda uma conclusão (ganho normalizado nas bordas, dias até o reteste, fora da janela, reteste ausente) e o formato do CSV. O script em si não tem teste: ele só lê o banco, chama a função e escreve os arquivos; foi conferido rodando contra as contas de teste.

## 27. Resultado do bloco: agrupado nos blocos medidos, por questão só na prática

Decidido em 06/10. No fim de cada bloco, a própria tela do bloco mostra o resultado (M4): XP do bloco, acertos, a contagem dos quatro quadrantes e o que revisar primeiro. Quatro escolhas:

- **Nos blocos medidos, nada aparece por questão.** Pré, pós e reteste mostram, além do XP e dos quadrantes, o acerto por tópico e por nível de confiança (o relatório do item 19), e a revisão vem por tópico ("Escolhendo a Engine Certa: 2 pontos cegos · 1 frágil"). Nenhum enunciado, alternativa ou explicação. O motivo é a medida: o reteste repete as questões do pós, e dizer quais a pessoa errou ensinaria exatamente o que vai ser medido de novo; no pré as questões não se repetem, mas detalhe por questão é feedback, que o item 19 proíbe antes do estudo. Na prática, o feedback já foi dado questão a questão, então a revisão lista as questões, com enunciado e selo.
- **Ordem de revisão: ponto cego, lacuna, frágil.** Segue a leitura do quadrante: o erro com certeza é o equívoco a corrigir primeiro. O que está firme não entra. Os tópicos saem ordenados pelo número de pontos cegos, depois de lacunas, depois de frágeis.
- **A agregação é função pura** (`resultadoDoBloco`, em `src/lib/resultado.ts`), com testes (item 26). Cada questão conta uma vez, pela resposta mais recente da fase, e tudo sai na ordem do bloco. O resultado não é gravado: reabrir um bloco já concluído recalcula e mostra de novo.
- **O resultado é o estado final da tela do bloco, não uma rota.** O hook já tem em mãos as respostas lidas ao abrir e as gravadas na sessão, então o fim do bloco não lê o banco de novo. A apresentação fica num componente separado (`src/components/resultado/`), para o relatório do dia 1 da espera do reteste (M5) reaproveitar.

O XP aparece com o saldo real, inclusive negativo (item 14). O resultado não compara pré com pós: o ganho é da análise (M8), não da tela do aluno.

Revisto em 09/10 (virada, item 30). Com o pré e o pós dentro de cada lição, o plano propõe mostrar o antes e o depois ao aluno no fim da verificação, em contagem ("Antes 1 de 3 → Depois 3 de 3"), o que contraria o último parágrafo acima. É a decisão D5 do plano, confirmada pelo Tiago em 09/10. O resto do item não muda: nada por questão nos blocos sem feedback, a ordem de revisão e a agregação em função pura.

## 28. Protótipo visual do piloto: ajustes adotados e pontos em aberto

Decidido em 06/10. O grupo tem um protótipo de 12 telas (login, consentimento, home com roteiro, pergunta, cartão, feedback da prática, relatório do dia 1, sequência da trilha, espera do reteste e versões em tema escuro). Ele é a direção visual do app. Antes de virar código, oito ajustes foram adotados:

1. **O XP volta a aparecer**: "+3 XP" no feedback da prática e o saldo no relatório. Sem ponto em jogo à vista, nada incentiva declarar a confiança com sinceridade (item 14). O app já mostra os dois; falta no protótipo.
2. **Um X no cabeçalho** da pergunta, do cartão e do feedback. Sair não é pular (item 25). O app já tem; falta no protótipo.
3. **Confiança e Confirmar fixos no rodapé**: só enunciado, alternativas e feedback rolam. Feito no app em 06/10 (item 25); o protótipo precisa mostrar o rodapé fixo.
4. **Contagens no lugar de percentuais**: "1 de 3 → 3 de 3", "6 de 7". Com 3 questões por tópico e poucas respostas por nível, percentual sugere uma precisão que não existe. O app já usa contagens; falta no protótipo.
5. **Uma descrição só para cada quadrante**, igual no claro e no escuro, com "sem certeza" no lugar de "com dúvida": Frágil e Lacuna incluem o Palpite (item 15). O app já tem um texto único, em `src/constants/textos.ts`; falta no protótipo.
6. **Senha com mínimo de 8 caracteres**, como a validação do app (`src/lib/validacao.ts`). Falta no protótipo, que diz 6.
7. **Desenhar os estados que faltam**, ao menos o feedback de resposta errada, que é o mais visto. O app já tem erro, carregando e falha de rede; faltam o desenho no protótipo e a tela do SUS nos dois.
8. **Os dois estilos de lobo ficam, cada um no seu lugar.** A sugestão era usar um só; revisto em 06/10, por decisão do grupo: a logo da Beast Maragames aparece no login, e o mascote em cartum, nas telas de consentimento e de sequência da trilha. A logo identifica a marca; o mascote acompanha os momentos de conversa com o participante. Não há troca a fazer no protótipo.

Sete pontos do protótipo contradizem decisões desta lista e continuam em aberto, para o grupo fechar (item 24):

- **Resultado do pré-teste só no fim do dia 1.** O protótipo tem um relatório único, depois do pós; o app mostra um resultado logo depois do pré (item 27). O protótipo está mais perto do item 19 e é melhor para a medida: dizer "Pixel Art 0 de 3" antes do estudo é feedback antes da intervenção e pode inflar o ganho.
- **Relatório comparando pré e pós por tópico.** O item 27 diz que o resultado não compara os dois.
- **Consentimento logo depois do login, sem "Agora não".** O item 22 o trata como etapa do roteiro, que a pessoa pode recusar e ainda ver a home.
- **Home sem os atalhos travados**, com a lista "Seu roteiro" no lugar. O item 6 pede os atalhos.
- **Ordem dos tópicos** MDA, Pixel Art, Engine, Lógica, a do item 23; o app segue o JSON.
- **Reteste nos "dias 7 a 9"** com o dia 1 sendo o do pós, o que dá pós + 6; o app implementa pós + 7.
- **Termo mais curto**, sem os dados do perfil nem quem é o grupo.

Se o visual for adotado, o que muda no código tem três tamanhos: só aparência (tema e estilo dos componentes, que já estão separados); comportamento (relatório único do dia 1, lista do roteiro na home, tela de espera); e conteúdo (os cartões do protótipo têm diagrama e frase de destaque, e hoje um slide só tem título e texto, então `content/topicos.json` precisa de campos novos).

Revisto em 07/10 (aparência aplicada). A primeira das três partes entrou no app, em quatro passos, cada um com teste antes do código:

- **Cores.** A paleta do protótipo foi para `src/constants/theme.ts`, nos dois temas, com tokens novos: `borda`, `bordaSelecionada`, `botao`, `textoDoBotao`, `fundoDaLogo` e `lacuna` (a Lacuna era cinza e passou ao azul do protótipo). Uma diferença deliberada: no tema escuro, as cores de estado e de quadrante entram clareadas. No protótipo elas são fundos com texto branco; no app são texto, ícone e borda sobre fundo escuro, e ali o azul da Lacuna dava contraste de 1,9 para 1 e o vermelho do Ponto cego, 3 para 1. Um teste calcula o contraste de cada par de texto e fundo usado nas telas e exige 4,5 para 1; outro barra cor escrita à mão fora do tema e o `Button` do React Native, que traz o azul do sistema.
- **Fonte.** Lexend nos pesos 400, 500, 600 e 700, pelo pacote `@expo-google-fonts/lexend`, carregada no layout raiz com `useFonts`, que funciona no Expo Go e na web (o config plugin do `expo-font` exigiria build próprio). A tela de abertura segura até a fonte chegar; se a carga falhar, o app abre com a fonte do aparelho. Com fonte própria cada peso é um arquivo, e no Android `fontWeight` sozinho não troca de arquivo: `ThemedText` transforma o peso pedido na família daquele peso, então nenhuma tela precisa saber o nome das famílias.
- **Componentes.** Botão principal, alternativa (a letra num quadrado, cheio quando selecionada e na cor do estado quando certa ou errada, que continuam com ícone), seletor de confiança, campo de texto, selo e cartões no tratamento do protótipo. Entrou a barra de progresso no cabeçalho da pergunta, contando as questões respondidas.
- **Logo e mascote.** A logo em SVG no login, sobre círculo branco (no escuro é o que a faz aparecer), com a chamada "Pronto pra soltar a fera?"; o mascote em cartum no consentimento, marcado como enfeite para o leitor de tela. O login passou a usar os mesmos campo e botão das outras telas.

Ficou igual ao que já estava decidido, mesmo diferente do PDF de 06/10: o X e o rodapé fixo da pergunta, a senha de 8 caracteres, o botão "Continuar com Google", os atalhos travados da home e o texto do termo. As outras duas partes (comportamento e conteúdo) continuam esperando os pontos em aberto acima.

Conferido na web, em 375×812, nos dois temas: home, pergunta e login. O consentimento com o mascote só foi conferido por teste, porque a conta usada já aceitou o termo. Nada foi visto num aparelho.

Revisto em 08/10. Os ajustes foram aplicados à mão no Figma, pelo Tiago, porque a integração do assistente com o Figma ficou barrada pelo limite de chamadas do plano gratuito. O arquivo usa layout automático com camadas nomeadas, então o "✕" entrou no "Topo" de cada quadro e o rodapé virou um quadro "Rodapé fixo" com traço só em cima. Os pontos em que o protótipo contradiz decisões continuam valendo como estão descritos acima.

Conferido em 08/10 a partir do arquivo `.fig` exportado, lendo a árvore de camadas dos 13 quadros: os textos, o "Rodapé fixo" com traço só em cima nos quadros 04, 06, 06b e no 04 escuro, o selo de XP no feedback e no relatório, as contagens, as descrições dos quadrantes e a senha de 8 caracteres estão como combinado, e não sobrou percentual. As duas sobras cosméticas que havia foram corrigidas no mesmo dia, pela IA do Figma: o "X" de sair virou "✕" em todos os quadros, e o 06b voltou a 390 × 844, com a linha "Resposta certa: alternativa B." e 7 px entre os itens do cartão. A troca do "✕" e a altura foram conferidas num segundo `.fig`; o último ajuste de texto e de espaço vale pelo relato da IA.

Revisto em 08/10 (cadastro e perfil). As duas telas tinham ficado com o botão no estilo antigo, cinza. Passaram a usar o botão principal do tema, e "Continuar com Google" virou um botão secundário, só de contorno (`src/components/botao-secundario.tsx`), o mesmo do login. No perfil, as opções de experiência ganharam borda e peso na marcada, como os níveis de confiança: com a paleta nova, o fundo da marcada (`#F1EDF8`) e o da não marcada (`#F6F4FA`) quase não se distinguiam no tema claro. O cadastro foi conferido na web; o perfil, só por tipos e testes, porque exige uma conta sem perfil.

Revisto em 08/10 (abertura e ícone). A animação de abertura do template saiu inteira (`animated-icon` e as imagens dela): o app passa da tela de abertura do aparelho direto para o conteúdo, e é o layout raiz que manda escondê-la, com `SplashScreen.hide()`, quando a fonte termina de carregar. No `app.json`, o ícone do app, o ícone do Android, o favicon e a tela de abertura passaram a ser a logo da Beast Maragames, em PNGs gerados do SVG do repositório com o `sips` do macOS; a tela de abertura é branca no tema claro e, no escuro, usa o fundo do tema com a logo sobre círculo branco, como no login. O ícone em camadas do iOS (`assets/expo.icon`) e a versão monocromática do Android eram do template e saíram; o iOS usa o ícone comum, e o Android fica sem ícone temático. Limite: no Expo Go, quem aparece ao abrir é o ícone do app, e não a tela de abertura, e a configuração completa só vale num build próprio.

## 29. Esquema de cores na web lido do sistema a cada render

Decidido em 07/10, a partir de um defeito: na web, trocar o tema do sistema com o app aberto deixava parte da tela com as cores do tema anterior (na home, cartão claro com texto claro, ilegível até recarregar).

A causa está no `useColorScheme` do react-native-web 0.21. Ele guarda o esquema em estado e, por ter um efeito sem lista de dependências, remove e registra de novo o ouvinte do `matchMedia` a cada render. O React trata o evento `change` como discreto e redesenha entre um ouvinte e o seguinte. Um componente redesenhado por quem está em volta antes de chegar a vez do ouvinte dele tem esse ouvinte removido no meio do disparo, e o navegador não chama ouvinte removido: o componente perde o aviso e fica com o esquema antigo. Quem fica para trás depende da ordem em que os componentes redesenharam por último, por isso o sintoma variava (ora a tela, ora os filhos). O expo-router põe em volta de cada tela um componente que também lê o esquema, e isso basta para o defeito aparecer. Medido na home: de 20 ouvintes registrados, 16 foram chamados e 4 foram removidos sem serem chamados.

Duas hipóteses foram descartadas com evidência. O React Compiler não é a causa: o código compilado da home depende de `theme.backgroundElement` e recalcula quando o tema muda; ele só decide quais filhos redesenham junto com a tela, isto é, quem fica para trás. O Stack também não: a tela redesenha normalmente.

A decisão: `src/hooks/use-color-scheme.web.ts` deixa de usar o hook do react-native-web e passa a usar `useSyncExternalStore` sobre `Appearance`, com uma assinatura só por componente e o esquema lido do sistema a cada render. É o que o React Native já faz no nativo, onde o defeito não existe (conferido no código do React Native 0.86, não em aparelho). A página estática continua saindo em claro, agora pelo terceiro argumento do `useSyncExternalStore`, no lugar do estado `hasHydrated`. O `_layout.tsx` raiz passou a ler o esquema pelo hook do projeto, e um teste impede novo import direto de `useColorScheme` do `react-native`. É o padrão do item 10: a diferença de plataforma fica no arquivo `.web.ts`.

Para cobrir o defeito, o `npm test` ganhou um segundo projeto do jest, "web" (`jest-expo/web`, com jsdom e react-native-web), que roda os arquivos `*.test.web.tsx`; o projeto "nativo" é o de antes. O teste novo reproduz a ordem de ouvintes que causa o defeito e falha com o hook antigo.

Conferido na web em 07/10, em 375×812, na tela de login, com o hook antigo e com o novo. Visto de novo em 09/10, com a correção reaplicada sobre o `main`: em três trocas seguidas, nenhum componente ficou para trás. Falta ver a home logada com a correção e o Expo Go (item 24).

## 30. Virada para o app completo: lições livres e medição por tópico

Decidido pelo Tiago em 09/10; falta o grupo confirmar. O app deixa de ser o roteiro guiado do piloto e passa a ser o produto completo: o aluno escolhe a lição e a ordem, e Lições, Progresso e Perfil viram telas. O plano, com as fases e as decisões em aberto, está em `docs/plano-do-app-completo.md`, que substitui `docs/rota-recalculada.md` como guia do que construir. Cinco decisões já tomadas:

- **Sem datas.** O cronograma do item 20 está cancelado. Uma fase termina quando a prova dela passa.
- **Medição por tópico.** Pré-teste, pós-teste e reteste deixam de ser três blocos gerais de 12 questões e passam a ser passos de cada lição: 3 questões de diagnóstico ao abrir, cartão e prática, 3 de verificação, e uma revisão 7 dias depois. Foi preferida a manter os blocos gerais como atividade opcional, em que estudar antes do pré contaminaria a medida, e a tirar os blocos sem feedback, que perderia o ganho. O evento não muda: a fase continua `pre`, `pratica`, `pos` ou `reteste`, e as respostas já gravadas são lidas pelo modelo novo sem migração.
- **Trilha diária como sugestão do dia.** Sai a fila de um tópico novo por dia. A home ganha um cartão "Para hoje" que aponta um passo só (revisão vencida, depois lição pela metade, depois a próxima lição nova), sem limite por dia. A sequência continua contando dias com resposta.

- **Diagnóstico obrigatório.** Não dá para pular as 3 questões de abertura de uma lição: sem elas não existe o antes e depois.
- **Entre a verificação e a revisão, a prática da lição fica travada e o cartão fica livre.** Refazer a prática na véspera mudaria o que a revisão mede; reler o cartão não gera evento. É a razão do "travados até o reteste" (item 23), agora valendo só para a lição em espera.

Plano aprovado pelo Tiago em 09/10. Na Fase 0 dele foram revistos os itens 6 (atalhos travados), 19 e 22 (roteiro do piloto), 23 (trava pelo roteiro e trilha com limite), 24 (pendências, agora na ordem das fases) e 27 (antes e depois na tela do aluno), e o `AGENTS.md`. O código ainda é o do roteiro do piloto: cada item diz até que fase a regra antiga vale.

Revisto em 09/10 (Fase 1 do plano: motor do ciclo da lição). As regras viraram funções puras, com teste antes do código, sem mexer em tela nenhuma: a home e os blocos seguem no roteiro antigo até as Fases 2 e 4. Escolhas que o texto acima não fixava:

- **O estado da lição é o primeiro passo incompleto** (`estadoDaLicao`, em `src/lib/licao.ts`): `nova`, `diagnostico`, `estudo`, `verificacao`, `aguardando_revisao`, `revisao` ou `concluida`. Como a ordem dos passos é fixa, o diagnóstico obrigatório sai de graça: prática respondida não adianta a lição com o pré pela metade.
- **Ciclo completo ou curto pelo conteúdo** (`cicloDaLicao`): completo quando o tópico tem questões das formas A e B; curto, só com prática, quando falta uma delas. Tópico sem questão não é lição, e conteúdo sem lição nenhuma é erro, para banco vazio não parecer "tudo concluído".
- **As questões de cada passo saem de `questoesDoBlocoMedido`**, a mesma função do roteiro, chamada com um tópico só. A regra de quem faz A no pré e B no pós continua num lugar.
- **7 dias de calendário, sem fim de janela** (`DIAS_ATE_A_REVISAO`), contados da última resposta da verificação, no fuso fixo de São Luís. Resposta de revisão dada antes da hora não abre a revisão.
- **Sem `formaPre`, a lição de ciclo completo fica em `nova`.** Mandar a pessoa ao termo é decisão da tela (D3 do plano, Fase 2).
- **A sugestão do dia** (`sugestaoDoDia`, em `src/lib/sugestao.ts`) recebe os estados na ordem sugerida do conteúdo e devolve um passo: a revisão liberada há mais tempo; senão, a lição pela metade com a resposta mais recente; senão, a primeira lição nova; senão, "em dia", com a revisão que abre primeiro, ou "tudo concluído". Nos empates vale a ordem das lições.
- **O total de XP pelo modelo novo** é `xpDasLicoes` (`src/lib/xp.ts`): cada tópico fecha os seus blocos sem feedback pelo estado da própria lição. O `xpAcumulado`, que decide pela etapa do roteiro geral, continua servindo à home até a Fase 4; trocá-lo antes faria o selo mudar no meio do pré-teste de 12 questões, a cada tópico fechado.
- **A trava da prática entre a verificação e a revisão** não está aqui: é regra de "o que pode abrir em cada estado" e entra com a trava por lição, na Fase 2.

A prova da fase é um teste que monta uma conta do roteiro antigo (pré, prática e pós gerais, mais dois tópicos da trilha) e a lê pelo modelo novo: os quatro tópicos medidos saem em `aguardando_revisao` e os dois da trilha, em `concluida`, sem migração.

Revisto em 09/10 (D3 e D5). Mais duas decisões do Tiago, as duas conforme a recomendação do plano: o termo de consentimento aparece uma vez, antes do primeiro diagnóstico, porque é o aceite que define a forma A ou B da pessoa; e o fim da verificação mostra o antes e o depois da lição, em contagem. Entram no código na Fase 2.

Revisto em 10/10 (Fase 2 do plano: página da lição e blocos por tópico). A lição ganhou telas, ao lado das do roteiro antigo, que ficam intactas até a Fase 4. Escolhas:

- **Rotas novas, sem mexer nas antigas.** `/licoes/[topicId]` é a página da lição, `/licoes/[topicId]/cartao` o cartão e `/licoes/[topicId]/[passo]` os passos com questões (`diagnostico`, `pratica`, `verificacao`, `revisao`). `/bloco/[fase]`, `/cartao/[topicId]` e `/dia-1` continuam servindo à home até ela mudar; assim o app funciona inteiro a cada fase. A lista de lições é a Fase 3, então por ora a página abre pela URL.
- **O resultado do diagnóstico só aparece no fim da lição** (decisão do Tiago em 10/10). Dizer "acertou 1 de 3" antes do estudo é o feedback que a medida evita (item 19), e o número só ganha sentido ao lado do depois. O fim do diagnóstico mostra "Diagnóstico feito", sem número nenhum. Por coerência, o XP dele também só entra no total (`xpDasLicoes`) quando a verificação termina, junto com o dela.
- **A trava por lição é `podeAbrirNaLicao`** (`src/lib/licao.ts`), usada por um portão só (`src/components/licao/portao-da-licao.tsx`) nas rotas do cartão e dos passos. Cada passo só abre quando é o da vez; o cartão abre do estudo em diante; da verificação até a revisão a prática fica fechada (D2), e volta a abrir com a lição concluída, para rever as questões. Quem digita a URL de um passo fechado volta para a página da lição. O portão decide uma vez, ao abrir, como o do roteiro (item 23).
- **O termo é o primeiro passo de quem ainda não o aceitou** (D3): em lição de ciclo completo, sem `formaPre`, o botão "Começar" abre o termo e a pessoa volta para a lição depois do aceite. Lição de ciclo curto não pede termo.
- **O bloco sem feedback com tópico é um passo de lição.** `useBloco` passa a recortar as questões pelo tópico quando recebe um, o título vira "Diagnóstico · Framework MDA", e a tentativa fica ligada à lição do tópico (`lessonId`), como já era na prática. Sem tópico, continua o bloco geral do roteiro antigo.
- **As regras do Firestore não mudaram.** A de `attempts` já aceitava `lessonId` em qualquer fase, e a de `answers` só confere dono e fase da tentativa. O que entrou foram os testes de emulador das duas (`regras/respostas.test.ts`), pendentes desde o item 24.
- **O fim de cada passo entra no lugar do resultado do bloco**, por uma função que a rota entrega à tela do bloco (`fim`). Diagnóstico: aviso sem número e "Ir para o cartão". Prática: o resultado de sempre e "Fazer a verificação". Verificação e revisão: a sequência de dias, o XP da lição, "Antes 1 de 3 → Depois 3 de 3" (ou "Na verificação 3 de 3 → Hoje 2 de 3"), os quadrantes e a data da revisão, sem nada por questão. No ciclo curto, o fim da prática é o fim da lição.
- **O resultado da lição é função pura** (`resultadoDaLicao`), que devolve nada enquanto a verificação não termina. A página da lição e o fim do passo usam a mesma conta, e as de cada bloco continuam sendo as de `resultadoDoBloco`.
- **Os testes de regras de cada arquivo usam um projeto próprio do emulador.** Os dois arquivos rodam ao mesmo tempo, e o `clearFirestore` de um apagava a tentativa do outro no meio do teste.

Verificação: `npm test` com 658 testes, `npx tsc --noEmit` sem erros e `npm run test:regras` com 59. As telas ainda não foram vistas no app com uma conta logada.

Revisto em 10/10 (decisões D4, D6 e D7, e o conteúdo). Decisões do Tiago antes da rodada das Fases 3 a 8: a navegação fica por atalhos na home, sem barra de abas (D6); o SUS sai do app por ora (D4); a revisão continua uma só, aos 7 dias, e a Fase 7 fica de fora (D7); o Perfil edita tudo, menos o e-mail; as questões de diagnóstico e verificação dos cinco tópicos que só têm prática são escritas pelo assistente, como rascunho para o grupo revisar; o "Correto." sai do começo das explicações; e o seed do conteúdo novo é rodado pelo Tiago.

Revisto em 10/10 (Fases 3 a 6 do plano, feitas numa rodada só, com o Tiago fora). Escolhas de tela tomadas pelo assistente, a confirmar por ele:

- **Um hook para as três telas que mostram todas as lições** (`useLicoes`): a lista, a home e o Progresso recebem as lições na ordem sugerida, a sugestão do dia, o XP, a sequência e as respostas que já podem aparecer.
- **Lista de lições** (`/licoes`): agrupada por módulo, na ordem sugerida, cada linha com a situação ("Nova", "Em andamento", "Revisão em 3 dias", "Revisão disponível", "Concluída") e o domínio em contagem. Qualquer uma abre.
- **Progresso** (`/progresso`): XP total e sequência; os quadrantes, uma vez por questão, pela resposta mais recente; o acerto por confiança, em que cada declaração conta; e "Meu domínio", só com as lições que têm resposta à vista. As contas são de `src/lib/progresso.ts`.
- **Detalhe do tópico** (`/progresso/[topicId]`): domínio, antes e depois, quadrantes, acerto por confiança e o histórico dos passos feitos, com a data e sem o acerto. Só questões da prática são citadas pelo enunciado: as dos blocos sem feedback voltam na revisão (item 27).
- **Perfil** (`/perfil`): edita tudo menos o e-mail, com o mesmo formulário do primeiro preenchimento (`FormularioDoPerfil`) e a mesma validação; mostra a data do aceite do termo e tem o "Sair". Não há tela para reler o texto do termo. As regras da edição ganharam teste de emulador (`regras/perfil.test.ts`).
- **"Feita"**, no resumo do atalho Lições, é a lição que já passou da verificação (ou da prática, no ciclo curto).

Conferido no app em 10/10, no Chrome do Tiago, com a conta de teste dele, em tema escuro e largura de computador: a home ("XP: +10", "Sequência: 2 dias", "Efeitos sonoros" no Para hoje, as quatro revisões agendadas para dali a 3 dias, "6 de 9 feitas"), a lista de lições, a página do Framework MDA aguardando a revisão, `/licoes/mda_framework/pratica` voltando para a lição, o Progresso, o detalhe do GDD e o Perfil, sem erro no console. A lição Efeitos sonoros foi feita até o fim pelo app (cartão de 4 slides e 6 questões, todas em Palpite): terminou em "Lição concluída", com "3 dias seguidos" e "+1 XP", e a home passou a "XP: +11", "7 de 9 feitas" e "Playtest e iteração" no Para hoje. Não foi visto: uma lição de ciclo completo desde o diagnóstico (pede uma conta nova), o tema claro, a largura de celular e um aparelho de verdade.

Verificação: `npm test` com 587 testes, `npx tsc --noEmit` sem erros e `npm run test:regras` com 69.

Revisto em 10/10 (Progresso: o que revisar primeiro). O Tiago viu a tela no iPhone e apontou que ela citava os quadrantes no geral, sem dizer em que assunto a pessoa está pior; a resposta estava em "Meu domínio", no fim da tela e na ordem das lições. Decidido com ele: uma seção "O que revisar primeiro" logo abaixo do XP e da sequência, com as três lições mais fracas, cada uma com o acerto e a contagem por quadrante ("3 pontos cegos · 5 lacunas"), abrindo o detalhe do tópico. A ordem é a do item 27: mais pontos cegos primeiro; no empate, mais lacunas; depois, mais frágeis (`revisaoPorTopico`, em `src/lib/progresso.ts`). Lição em que tudo está firme não entra. "Meu domínio" continua com todas as lições, agora nessa mesma ordem e com a contagem completa. Continua sendo contagem por tópico, sem citar questão dos blocos sem feedback. No cartão da sequência, "3 dias seguidos" virou "3 dias", que cabe numa linha no celular. `npm test` passa com 596.

## 31. Tema escolhido pelo aluno, guardado no aparelho

Decidido com o Tiago em 10/10. O Perfil ganhou a seção "Aparência", com três opções: "Do sistema" (o padrão, que é o comportamento de antes), "Claro" e "Escuro". Escolhas:

- **A preferência fica no aparelho, e não no perfil do banco** (`src/lib/tema.ts`, com o AsyncStorage, que já estava instalado por causa do Firebase Auth; na web ele usa o `localStorage`). É preferência do aparelho, vale também na tela de login, não mexe nas regras do Firestore e não entra no "Salvar alterações". O custo aceito: a escolha não acompanha a conta, e em outro aparelho a pessoa escolhe de novo. Guardar no perfil foi a alternativa descartada.
- **Um valor só para o app inteiro, fora do React.** Todo componente chega às cores por `useColorScheme` (`src/hooks/use-color-scheme.ts` e `.web.ts`) ou por `useTheme`; os dois hooks passaram a assinar a preferência com `useSyncExternalStore` e a devolver a escolha por cima do esquema do aparelho. Por isso a troca vale na hora, em todas as telas, sem recarregar. O teste que impede ler o esquema direto do `react-native` (item 29) garante que nenhuma tela escapa.
- **A preferência é lida antes de a tela de abertura sumir**, junto com a fonte, para o app não abrir num tema e trocar à vista. A leitura não falha: sem conseguir ler, vale o tema do aparelho; sem conseguir guardar, a escolha vale até fechar o app.
- **A barra de status acompanha o tema do app** (`StatusBar`, no layout raiz), e não o do sistema: com o escuro forçado num aparelho em claro, os ícones escuros sumiriam no fundo.
- **Limitação registrada:** o teclado e os avisos nativos do aparelho continuam seguindo o tema do sistema.

Nos testes, o AsyncStorage é trocado pela versão de teste da própria biblioteca, nos dois projetos do jest (`package.json`). Conferido na web, na tela de login, em 375×812: com "claro" guardado e o sistema em escuro, a tela abre clara; com "escuro" guardado e o sistema em claro, abre escura; sem erro no console. A seção no Perfil e a troca ao toque estão cobertas por teste e não foram vistas no app, porque o painel desta conversa não tem login. `npm test` passa com 613.
