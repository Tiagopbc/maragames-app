# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Projeto maragames-app

App de Programação Mobile (UNDB) para a Beast Maragames. Grupo: Tiago Cavalcanti, Francisco André Santos, Jadson Câmara. Responda e comente em português.

## Escopo

App independente do maragames.app. Não há continuidade de lição entre dispositivos nem integração com o Supabase da cliente. O eixo do produto é medir aprendizagem com confiança declarada. Desde 09/10 o objetivo é o app completo, com lições livres, e não mais o roteiro de um piloto; os prazos foram cancelados e o trabalho segue fases sem data. Decisões de produto e interface são do grupo.

## Fonte da verdade das decisões

`docs/decisoes-tecnicas.md` tem todas as decisões numeradas, com o raciocínio e as pendências. Leia antes de propor arquitetura, modelo de dados, regra de pontuação ou fluxo de telas, e não contradiga um item sem apontar qual e por quê.

`docs/plano-do-app-completo.md` tem a visão de produto: a home, o ciclo de cada lição, a sugestão do dia, as fases com a prova de cada uma e as decisões em aberto. Use para saber o que construir e em que ordem. `docs/rota-recalculada.md` é o plano anterior, do piloto, e fica só como registro.

Quando uma decisão técnica relevante for tomada na sessão, atualize esse arquivo (item novo ou "Revisto em dd/mm" no item existente, e a linha de última atualização no topo) e avise que a lista foi atualizada. Pendências ficam no item 24, na ordem das fases do plano.

## Stack

React Native + Expo SDK 57 (compatível com Expo Go), Expo Router, TypeScript, Firebase (Auth + Firestore). Desenvolvimento em macOS.

## Regras de arquitetura

- Nenhuma tela ou componente importa Firebase. Acesso a dados só pela interface `ProgressRepository` (implementação atual: `FirebaseProgressRepository`).
- Navegação por estado da sessão: `src/app/_layout.tsx` usa `Stack.Protected` (deslogado, logado sem perfil, perfil completo). Não usar `router.push` depois de login ou de salvar perfil.
- O núcleo do perfil é obrigatório: nome, apelido, telefone, faixa etária, sexo (com "Prefiro não informar", item 35), cidade, estado, situação de estudo e experiência em criar jogos; instituição e curso, só de quem faz graduação ou pós. As perguntas de "Sobre você e os jogos" e o aceite de contato são opcionais e nunca barram o uso (item 34). Validação em dobro: `src/lib/validacao.ts` e `src/lib/perfil.ts` (funções puras, UX) e `perfilValido()` no `firestore.rules` (garantia). Mudou uma, muda a outra; `src/__tests__/regras-do-perfil.test.js` compara as listas.
- Comportamento diferente por plataforma vai em arquivo `.web.ts` (ex.: `firebase.ts` / `firebase.web.ts`), nunca `if (Platform.OS)` espalhado.
- Cores sempre do tema (`useTheme`), ícones de `@expo/vector-icons` tipados por `keyof typeof Ionicons.glyphMap`. O esquema de cores vem só de `@/hooks/use-color-scheme`, que aplica a escolha do Perfil (item 31) por cima do sistema; nunca ler `useColorScheme` direto do `react-native`.

## Modelo de dados

- `answers` é evento imutável: uma resposta confirmada = um documento, nunca atualizado. Campos: `uid`, `questionId`, `topicId`, `attemptId`, `fase` (`pre`, `pratica`, `pos`, `reteste`), id da alternativa escolhida, `ordemExibida`, `correta`, `confianca` (1, 2 ou 3), tempo de resposta e horário do servidor.
- Nada derivado é gravado: domínio, quadrante, XP, etapa do roteiro, nível da escada e sequência são calculados a partir de `answers`.
- `questions` é coleção própria, consultável por `topicId`. Conteúdo vem de `content/*.json` e vai ao Firestore só pelo script de seed (ids fixos, `versaoConteudo`). Não editar questões pelo console.
- `users/{uid}`: perfil (núcleo obrigatório, opcionais e `aceitaContato`), `formaPre` (A ou B, imutável depois de gravada) e `consentiuEm`.
- `selfAssessments/{uid}`: a nota de 1 a 5 que a pessoa se dá em cada módulo, antes do primeiro diagnóstico. Gravada uma vez, nunca atualizada.
- `attempts` guarda `plataforma` e `versaoDoApp` na criação, sem perguntar nada.
- O repositório é público: e-mail, telefone ou outro dado de pessoa de verdade não entra em arquivo, teste, commit nem pull request. A única exceção é o contato da seção "Sobre" do Perfil (`CONTATO_DO_GRUPO`), escolhido pelo Tiago.

## Regras de negócio

- Confiança: valor 1, 2, 3 no dado; rótulos "Palpite", "Tenho dúvida", "Tenho certeza" só na tela, num único arquivo de strings.
- Questão: alternativa e confiança são seleções independentes, em qualquer ordem; Confirmar só ativa com as duas. Sem opção de pular.
- Quadrante: confiança alta = nível 3; níveis 1 e 2 = baixa. Firme, Frágil, Lacuna, Ponto cego.
- XP (Gardner-Medwin): acerto 1/2/3, erro 0/−1/−4 por nível de confiança. Nos blocos pré, pós e reteste, nenhum feedback nem XP por questão; tudo aparece só no fim do bloco, e o total da home só conta o bloco depois de concluído.
- Domínio por tópico = acerto simples, sem peso de confiança.
- O app é para maiores de 18 anos: as faixas etárias começam em "18 a 24", e o termo diz isso.
- Antes do primeiro diagnóstico, depois do termo, a pessoa se dá a nota por módulo (autoavaliação). Não há como pular uma área.
- Blocos medidos: só múltipla escolha, 4 alternativas, uma correta. Alternativas embaralhadas por semente (uid + questão + fase).
- Ciclo da lição (item 30): cada tópico tem o seu pré, pós e reteste, de 3 questões cada. Na tela chamam-se diagnóstico, verificação e revisão; no dado, a fase continua `pre`, `pos` e `reteste`. A ordem é diagnóstico (obrigatório), cartão, prática, verificação e, 7 dias depois, revisão. Tópico sem questões das formas A e B faz só cartão e prática. O resultado do diagnóstico só aparece no fim da lição, ao lado do da verificação; o XP dele também.
- Lições livres: qualquer lição abre, em qualquer ordem. A trava vale só dentro da lição: os passos não se pulam e, entre a verificação e a revisão, a prática daquela lição fica fechada e o cartão, livre.
- Home: saudação, um cartão "Para hoje" com um passo só (revisão vencida, depois lição pela metade, depois a próxima lição nova, sem limite por dia), as revisões agendadas e os atalhos Lições, Progresso e Perfil, em array tipado (`ATALHOS`).

## Estado do código

O app já é o do ciclo da lição: home com "Para hoje", lista de lições, página da lição com os passos em `/licoes/[topicId]`, Progresso e Perfil. As regras ficam em `src/lib/licao.ts`, `src/lib/sugestao.ts` e `src/lib/progresso.ts`, e as três telas que mostram todas as lições leem de `useLicoes`. O roteiro do piloto saiu inteiro, das telas e das regras: todo bloco de questões é um passo da lição de um tópico, e a exportação (`npm run exportar`) mede por lição e por pessoa, para a análise do grupo. O que vai para a Beast Maragames é o relatório (`npm run relatorio`): uma página com os números em conjunto, sem dado de pessoa nenhuma (item 23). Com `--simulado 100`, ele sorteia uma turma de alunos virtuais de tipos variados em vez de ler o banco (item 35), e a página diz no topo que os dados são sintéticos, para validação do app: simulado e real nunca se misturam, e nada simulado é gravado no Firestore. `npm run lint` roda com o ESLint do Expo. Antes de mexer numa tela, confira no item 24 o que está pendente.

## Fora de escopo por ora

Escada adaptativa, offline, segundo formato de questão, notificações push, painel de admin, validação de resposta no servidor.
