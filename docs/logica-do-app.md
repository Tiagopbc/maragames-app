# A lógica do app, do toque na tela ao relatório

Guia do grupo, para explicar o app por dentro na apresentação. Cada capítulo diz onde a regra mora no código e em que item de `docs/decisoes-tecnicas.md` está o porquê. A mesma coisa, em forma de página, está em `docs/logica-do-app.html` (abrir no navegador). Retrato de 16/10/2026, com o conteúdo na versão `21c7b805a024`; o que mudar no app muda aqui também.

O app se apoia em três ideias:

- **Guardar o que aconteceu.** Cada resposta confirmada vira um registro que nunca muda. O app não guarda resultado pronto.
- **Calcular tudo na hora.** XP, domínio, quadrante, passo da lição e sequência saem sempre das respostas, toda vez que a tela abre.
- **Regras em funções puras.** Cada regra é uma função sem tela e sem banco, com teste. A tela só mostra o que a função devolve.

## 1. As camadas

O app é um só código em React Native com Expo, que vira app de verdade no Android e no iPhone e também roda no navegador. Por dentro, são quatro andares, e cada um só fala com o de baixo:

| Andar | O que é |
|---|---|
| Telas | O que a pessoa vê e toca. Ficam em `src/app`, uma pasta por endereço (Expo Router). Não calculam nada importante. |
| Regras | Funções puras em `src/lib`: recebem respostas e devolvem números ou estados. Sem tela, sem banco, sem relógio escondido. |
| Repositório | A interface `ProgressRepository` é a única porta para os dados. Hoje a implementação é `FirebaseProgressRepository`. |
| Firebase | Auth para o login e Firestore para os dados. As regras de segurança (`firestore.rules`) conferem tudo no servidor. |

Regra do time: nenhuma tela importa Firebase. Se um dia a Beast Maragames liberar a API dela, troca-se só o repositório.

No código: itens 1, 3 e 26.

## 2. Quem vê qual tela

O app não manda a pessoa para outra tela depois do login. Ele olha o estado da sessão e mostra só o grupo de telas permitido; ao entrar ou salvar o perfil, o estado muda e a tela certa aparece sozinha.

- **Sem login:** `sign-in` e `sign-up`, com redefinição de senha por e-mail.
- **Com login e sem perfil:** `complete-profile`. O núcleo é obrigatório; as perguntas de "Sobre você e os jogos", não.
- **Perfil completo:** home, Lições, Progresso e Perfil, mais o termo e a autoavaliação na primeira lição.

O perfil é conferido duas vezes: no aparelho, para avisar na hora (`validacao.ts` e `perfil.ts`), e no servidor, para garantir (`perfilValido()` nas regras). Um teste compara as duas listas de campos.

No código: `src/app/_layout.tsx`, com `Stack.Protected`; itens 7, 8, 9 e 34.

## 3. O ciclo da lição

O app não grava "a pessoa está na verificação". Toda vez que a lição abre, a função olha as respostas daquele tópico e descobre um de sete estados:

nova → **diagnóstico** → estudo (cartão e prática) → **verificação** → aguardando revisão → **revisão** → concluída

Os estados em negrito são os medidos: 3 questões cada, sem resposta certa nem XP até o fim do passo.

- **Como o estado é descoberto.** Sem respostas do tópico, é nova. Se faltam questões do diagnóstico, é diagnóstico; depois vem a prática, depois a verificação. Com a verificação completa, contam-se 7 dias de calendário a partir dela: antes, é "aguardando revisão"; depois, "revisão". Com a revisão completa, é concluída.
- **As travas.** As lições são livres: qualquer uma abre, em qualquer ordem. Dentro da lição, os passos não se pulam. Entre a verificação e a revisão, a prática fecha e o cartão continua aberto, porque refazer a prática na véspera mudaria o que a revisão mede.
- **O que se vê no fim.** O resultado do diagnóstico só aparece no fim da lição, ao lado do da verificação.
- **Ciclo curto.** Um tópico sem as duas formas de questões faria só cartão e prática. Hoje os 9 tópicos têm o ciclo completo.

No código: `licao.ts` (estado e passo) e `bloco.ts` (questões de cada passo); itens 19, 22 e 30.

## 4. Uma questão

- **Alternativa e confiança** são duas escolhas separadas, em qualquer ordem: a alternativa e o quanto a pessoa confia nela (Palpite, Tenho dúvida, Tenho certeza). Confirmar só ativa com as duas, e não há como pular. No dado, a confiança é 1, 2 ou 3; os nomes ficam só na tela, num arquivo de textos.
- **A ordem das alternativas** é embaralhada por uma semente feita do código da pessoa, da questão e da fase. A mesma pessoa vê a mesma ordem em qualquer aparelho, e a ordem muda entre a verificação e a revisão.
- **O que vai para o banco** quando a pessoa confirma: quem respondeu, a questão, o tópico, a tentativa, a fase (`pre`, `pratica`, `pos` ou `reteste`), a alternativa escolhida, a ordem em que as alternativas apareceram, se acertou, a confiança, o tempo até confirmar e o horário do servidor. Esse registro nunca é alterado nem apagado pelo app.

No código: `embaralhar.ts`, `pergunta.ts` e `src/constants/textos.ts`; itens 12, 18 e 25.

## 5. XP, quadrante e domínio

**XP: a certeza honesta rende mais** (pontuação de Gardner-Medwin).

| Confiança | Acertou | Errou |
|---|---|---|
| Palpite | +1 | 0 |
| Tenho dúvida | +2 | −1 |
| Tenho certeza | +3 | −4 |

Em média, compensa marcar Tenho dúvida acima de 50% de chance de acertar, e Tenho certeza acima de 75%. Na prática o XP aparece a cada questão; nos passos medidos, só no fim, e a home só soma o passo concluído.

**Quadrante: o acerto cruzado com a certeza.** "Com certeza" é só o nível 3; Palpite e Tenho dúvida contam como sem certeza.

| | Com certeza | Sem certeza |
|---|---|---|
| Acertou | Firme | Frágil |
| Errou | Ponto cego | Lacuna |

- **Domínio:** percentual de acerto simples no tópico, sem peso da confiança. É o número do Progresso.
- **Sequência:** dias de calendário seguidos com pelo menos uma resposta. Um dia inteiro sem responder zera.
- **Resultado:** acertos, XP, quadrantes e o que revisar primeiro, recalculados sempre que o passo reabre.

No código: `xp.ts`, `quadrante.ts`, `dominio.ts`, `sequencia.ts` e `resultado.ts`; itens 14, 15 e 27.

## 6. A home e o Progresso

O cartão "Para hoje" da home escolhe um passo só, nesta ordem:

1. Uma revisão vencida, porque ela tem prazo.
2. Uma lição pela metade.
3. A próxima lição nova. Não há limite de lições por dia.

Sem nada para fazer, ele mostra quando abre a próxima revisão. Abaixo do cartão ficam as revisões marcadas e os atalhos.

O Progresso mostra o domínio de cada tópico e, em "O que revisar primeiro", os pontos cegos antes das lacunas. Só entram respostas que a pessoa já pode ver: as do diagnóstico ficam escondidas até a lição chegar ao fim. As três telas que mostram todas as lições (home, Lições e Progresso) leem da mesma fonte, para nunca se contradizerem.

No código: `sugestao.ts`, `progresso.ts` e `useLicoes`; itens 6 e 30.

## 7. Formas A e B

Cada lição tem duas formas de 3 questões, com uma básica, uma intermediária e uma avançada em cada. Quem faz o diagnóstico na forma A faz a verificação e a revisão na B, e vice-versa. Assim ninguém acerta a verificação só por lembrar do diagnóstico.

A forma não é sorteada: segue a ordem de chegada. Um contador no banco (`piloto/contador`) sobe de um a cada aceite do termo; a 1ª pessoa pega A, a 2ª pega B, a 3ª pega A, e assim por diante. Se uma forma for mais fácil que a outra, metade da turma começa por cada uma e o efeito se compensa. A forma fica gravada no perfil e não muda depois.

No código: `participante.ts` (`formaDoParticipante`) e `formaDoContador` nas regras; itens 19 e 22.

## 8. O banco e a segurança

| Coleção | O que guarda | Quem pode o quê |
|---|---|---|
| `users` | O perfil, a forma (A ou B) e a hora do aceite do termo | Só o dono lê. O perfil passa por `perfilValido()`; a forma não muda depois de gravada |
| `selfAssessments` | A nota de 1 a 5 em cada módulo | Gravada uma vez; ninguém altera nem apaga pelo app |
| `attempts` | Cada passo de lição começado, com o aparelho e a versão do app | Só o dono lê e atualiza a sua |
| `answers` | Uma resposta confirmada | Só o dono lê. Ninguém altera nem apaga, nem o dono |
| `questions` | As 100 questões | Quem está logado lê. Ninguém grava pelo app, só o script de seed |
| `piloto/contador` | Quantas pessoas aceitaram o termo | Só sobe de um em um, no aceite |

Os scripts do grupo (seed, exportação, relatório e limpeza) usam a chave de administrador, que fica só no computador do Tiago e nunca vai para o repositório.

No código: `firestore.rules`, com os testes em `regras/`, rodando no emulador; itens 2, 4, 5 e 21.

## 9. O conteúdo

São 6 módulos, 9 tópicos e 100 questões: 54 medidas (formas A e B) e 46 de prática.

1. **Arquivo.** Os tópicos, os cartões e as questões ficam em `content/*.json`, com a fonte de cada questão.
2. **Conferência.** Cada tópico precisa das formas A e B completas, toda explicação fecha com ponto e a correta não pode ser a mais longa em mais de 30% das questões.
3. **Gravação.** `npm run seed:conteudo` grava no Firestore com uma versão, que é a impressão digital do conteúdo (hoje, `21c7b805a024`).

Ninguém edita questão pelo console. Mudou uma vírgula, muda a versão, e respostas de versões diferentes não se somam na análise.

No código: `scripts/seed-conteudo.js` e `src/__tests__/conteudo.test.js`; itens 17 e 21.

## 10. Do banco ao relatório

- **`npm run exportar`** gera as tabelas do grupo: participantes, lições, respostas, questões e notas, com cada pessoa trocada por um código (P01, P02…). A lista que liga código e nome não sai do grupo.
- **`npm run relatorio`** gera a página da turma, só com números em conjunto. Um percentual sobre menos de 10 respostas vira contagem, e um grupo com menos de 5 pessoas mostra só quantas tem.

Os dois usam as mesmas funções do app, então o número da tabela é o mesmo da tela. Com `--desde 2026-10-16`, entra só quem aceitou o termo a partir do início do uso aberto.

| Pergunta | Medida | Em palavras simples |
|---|---|---|
| A turma aprende? | Ganho de Hake e teste pareado | Do que faltava acertar no diagnóstico, quanto passou a ser acertado na verificação. O teste troca ao acaso o sinal da melhora de cada pessoa milhares de vezes e vê se a melhora real é rara nesse sorteio. |
| Quanto confiar no número? | Intervalo de 95% | Sorteia de novo as pessoas 2000 vezes e vê quanto o número varia. Com menos de 30 pessoas, a página o chama de aproximado. |
| A certeza informa? | Calibração | Acerto de quem marcou Tenho certeza menos o de quem não marcou, na verificação. |
| Quem tem certeza esquece menos? | Retenção corrigida | Quanto da verificação continuou certo na revisão, descontando o que se acerta por sorte. O plano já diz que um piloto pequeno não responde a isso. |
| Que questão está ruim? | Conteúdo | As que poucos acertam na verificação e as que têm uma alternativa errada atraindo 80% ou mais dos erros. |

O que conta como evidência foi escrito antes de qualquer dado, em `docs/plano-de-analise.md`. O que mudar depois entra lá como desvio, com data e motivo.

No código: `exportacao.ts`, `relatorio.ts` e `estatistica.ts`; itens 23 e 37.

## 11. A turma virtual

Antes de medir gente, conferimos a régua com alunos inventados. O simulador cria alunos virtuais com regras conhecidas, como quem domina, quem chuta, quem se acha mais sabido do que é e quem desiste, e as respostas deles passam pelo mesmo caminho do relatório. Como sabemos a verdade, dá para ver se cada medida acusa o efeito quando ele existe, e só quando ele existe.

- **Cinco cenários:** base, nulo, confiança cega, forma B difícil e certeza protege. No nulo ninguém aprende, e o teste não pode acusar ganho; na confiança cega a certeza é sorteada, e a calibração tem que sumir.
- **Réplicas:** repetir a turma centenas de vezes mostra o poder do teste. Com 100 pessoas, ele acha o ganho em 95% das vezes; com 15, em 25%.
- **Defeitos:** `--defeitos` planta um gabarito trocado, um distrator irresistível e uma questão ambígua, para ver se a tabela de conteúdo acha.

Nada simulado é gravado no Firestore, e a página simulada avisa no topo que os dados são sintéticos.

No código: `simulacao.ts` e `scripts/gerar-relatorio.ts`; itens 35 e 36.

## 12. Onde o app roda

- **Web, em `maragames-app.vercel.app`:** projeto da Vercel ligado ao GitHub; cada pull request integrado ao `main` publica o app sozinho.
- **Android:** APK gerado na nuvem da Expo com `eas build` e instalado direto no aparelho.
- **Relatório, em `maragames-relatorio.vercel.app`:** projeto separado e sem ligação com o GitHub. Só recebe o que o Tiago publica à mão.

No código: `vercel.json` e `eas.json`; itens 23 e 32.

## 13. Como sabemos que funciona

- **988 testes em 53 arquivos**, todos passando em 16/10 (`npm test`).
- **Teste antes do código:** toda regra nova começa por um teste que falha; só depois vem o código que o faz passar.
- **Regras de segurança no emulador:** `npm run test:regras` tenta, num Firestore de mentira, o que alguém mal-intencionado tentaria, como editar uma resposta ou ler a de outra pessoa.
- **Revisão automática:** cada pull request passa pela revisão do Codex, e os apontamentos ficam registrados nos itens das decisões.
- **Conferência em aparelho:** as telas foram vistas no iPhone, pelo Expo Go e pela web, nos dois temas. Falta o Android.

No código: `npm test` e `npm run lint`; item 26.

## 14. Se perguntarem…

| Pergunta | Onde está a resposta |
|---|---|
| Por que é híbrido, se não usa WebView? | item 1 |
| Por que guardar cada resposta, e não só a nota final? | item 2 |
| Por que Firebase, e não o Supabase do site da cliente? | item 11 |
| Por que três níveis de confiança, e por que essa pontuação? | itens 12 e 14 |
| Por que só múltipla escolha nas questões medidas? | item 18 |
| Por que o resultado do diagnóstico fica escondido? | itens 27 e 30 |
| O que acontece com os dados de quem participa? | item 34 |
| Como vocês sabem que as medidas funcionam? | itens 36 e 37 |
| O que ainda falta? | item 24 |
