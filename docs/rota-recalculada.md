# Rota recalculada: app de confiança declarada e aprendizagem

**Substituído em 09/10 por `docs/plano-do-app-completo.md`** (item 30 das decisões): o piloto e as datas abaixo foram cancelados. Fica como registro do plano anterior; a seção "Como medir aprendizagem" continua valendo.

05/10/2026 · Tiago Cavalcanti. Convertido do PDF e atualizado com as decisões da noite de 05/10 (XP, interação da questão, perfil, exportação). Em caso de conflito, vale `docs/decisoes-tecnicas.md`.

O app mede se o aluno aprendeu e se vai lembrar, a partir de cada resposta gravada como evento. O piloto com colegas da UNDB roda entre 30/10 e 10/11 e gera os dados da apresentação de 14/11 e do paper.

## O que mudou

Desde 01/10 o app deixou de ser extensão do maragames.app e virou produto próprio. A Beast Maragames liberou o grupo para decidir o formato e não quer continuidade com o site. A pergunta passa a ser "o aluno aprendeu e vai lembrar?", e não "o aluno concluiu a lição?".

- **Continuidade entre dispositivos saiu do projeto:** a rubrica não exige e a cliente liberou o app do zero. Retomar tentativa em outro aparelho fica fora do escopo.
- **Backend:** o Firebase fica (Auth, regras e repositório prontos). O app não espelha o Supabase da cliente, e o `ProgressRepository` protege contra uma troca futura.
- **Foco:** o do paper, confiança declarada como indicador de aprendizagem, sem reproduzir as telas do site.
- **DRDA v0.0.3** ainda cita Supabase e continuidade, mas já foi entregue e não será alterado. App e paper seguem este doc.
- **Rótulos de confiança:** Palpite, Tenho dúvida e Tenho certeza na tela; no dado, 1, 2 ou 3.
- **Decisões de produto e interface são do grupo**, sem validação com a cliente.
- **Roteiro guiado e trilha diária:** o piloto tem dois encontros medidos (dia 1 e reteste de 7 a 9 dias após o pós) e, entre eles, um tópico novo por dia, fora da medição. O passo a passo está no doc "Como funciona o app: a jornada do Paulo".

## Como medir aprendizagem

Aprendizagem aparece em três leituras, todas calculadas a partir da coleção `answers`: o que o aluno sabe agora (domínio), se sabe o que sabe (calibração) e se ainda sabe dias depois (retenção). Acertar uma questão, sozinho, não mede nenhuma das três.

**O evento.** Cada resposta grava `uid`, `questionId`, `topicId`, `attemptId`, `fase` (`pre`, `pratica`, `pos` ou `reteste`), alternativa escolhida, ordem em que as alternativas apareceram (`ordemExibida`), `correta`, `confianca` (1 a 3), tempo de resposta e horário do servidor. O registro nunca é editado.

**Confiança antes do feedback.** Se o aluno vê o resultado antes de declarar, ele ajusta a confiança ao acerto e o dado perde o valor.

**Quadrante calculado, não gravado.** Cruzando acerto com confiança, cada resposta cai em um de quatro casos. Mudar a regra recalcula tudo sem mexer no banco.

|        | Confiança baixa (Palpite ou Dúvida) | Confiança alta (Certeza) |
|--------|-------------------------------------|--------------------------|
| Acertou | **Frágil**: acertou com dúvida, pode ter sido sorte. Entra na revisão. | **Firme**: sabe e sabe que sabe. Conta cheio no domínio. |
| Errou  | **Lacuna**: sabe que não sabe. Ensinar e reforçar. | **Ponto cego**: errou achando que sabia. Equívoco a corrigir primeiro. |

O ponto cego, erro com certeza, é o quadrante que mais importa. Sem a confiança, Frágil e Ponto cego apareceriam como um simples Acertou ou Errou.

Confiança baixa são os níveis 1 e 2 (Palpite e Tenho dúvida); confiança alta é só o nível 3 (Tenho certeza). Os três níveis continuam gravados e alimentam a calibração.

| Leitura | Pergunta que responde | Como calcular | Quando existe |
|---|---|---|---|
| Domínio por tópico | O que o aluno sabe agora? | Taxa de acerto simples nas últimas respostas do tópico, sem peso por confiança | Após a primeira prática do tópico |
| Calibração | O aluno sabe quando sabe? | Taxa de acerto em cada nível de confiança | Após dezenas de respostas |
| Retenção | Ainda sabe dias depois? | Acerto no reteste dividido pelo acerto no pós-teste | No piloto, reteste de 7 a 9 dias após o pós; no produto, revisão em intervalos crescentes |
| Ganho (paper) | O app ensinou? | Ganho normalizado de Hake: (pós − pré) ÷ (100 − pré), com pré e pós no dia 1 | Só no piloto |

**XP pela pontuação por certeza (revisto em 05/10, noite).** O domínio continua sem peso de confiança, mas o XP segue o esquema de Gardner-Medwin para mais de duas opções: 1, 2 e 3 pontos por acerto em Palpite, Tenho dúvida e Tenho certeza, e 0, −1 e −4 por erro (o original, 0, −2 e −6, é para verdadeiro ou falso). Declarar Dúvida compensa a partir de 50% de chance de acerto, e Certeza a partir de 75%; abaixo disso, Palpite rende mais e nunca perde ponto. O palpite puro em 4 alternativas acerta 25%. Diferente de pesos em que certeza nunca rende menos (regra "não motivadora", Gardner-Medwin; Gahan, 2003), esse esquema incentiva a sinceridade, então a limitação anterior ("sem ponto em jogo, nada incentiva a sinceridade") deixa de valer.

O XP é calculado a partir de `answers`, não gravado. Nos blocos medidos (pré, pós e reteste), só aparece no fim do bloco, porque mostrá-lo a cada questão revelaria o acerto. Limitações para o paper: o XP vale pouco fora do app (incentivo real, mas fraco), e a confiança deixa de ser independente da regra. A calibração continua visível para o aluno e no relatório.

**Taxa de acerto ajustada (paper):** percentual de acertos firmes (corretos com Tenho certeza) sobre o total, comparado à taxa comum.

**Questões dos blocos medidos:** cada tópico medido tem 10 questões (3 da forma A, 3 da forma B e 4 de prática), todas de múltipla escolha com 4 alternativas e uma correta. Pré, pós e reteste usam questões fixas e a mesma mistura de dificuldades, porque uma escada adaptativa levaria todo aluno a cerca de 70% de acerto e apagaria o sinal.

## Marcos

Oito marcos, ordenados para a medição existir cedo e o piloto ter tempo de rodar. M2 a M5 e as questões revisadas, incluindo a trilha diária, precisam estar prontos até 23/10. O conteúdo (M6) anda em paralelo e já tem rascunho.

**M1: Fundação (concluído).** Firebase, Auth, perfil no Firestore (todos os campos obrigatórios), rotas protegidas e home.
Prova: o aluno entra, completa o perfil e vê a home.

**M2: Motor de lição e roteiro do piloto (cerca de um terço).** Múltipla escolha, tentativa criada ao iniciar, cada resposta gravada como evento em `answers` e resultado ao final.
Prova: um bloco completo gera um evento por questão no Firestore.
Depende de: M1.
Já existe no main (último commit em 25/09): tipos `Attempt`, `Answer` e `Question`; `ProgressRepository` com implementação em Firebase só de escrita (criar tentativa, gravar resposta, concluir); regras com `answers` imutável. Na branch `feat/conteudo-piloto`: pasta `content/` completa e `seed-conteudo.js`, que substitui o seed antigo de 3 questões.
Falta: leitura de lições e questões, roteiro do piloto, tela da pergunta, tempo de resposta, retomar tentativa, resultado e ligar os atalhos da home, que hoje só fazem `console.log`. Nenhuma tela usa o repositório ainda.
Atualizado em 06/10: o repositório lê lições, questões e respostas; a tela da pergunta (rota `bloco/[fase]`) grava um evento por confirmação, com tempo de resposta, e retoma de onde parou; "Continuar estudos" na home segue `etapaDoRoteiro`; a primeira etapa, o consentimento, tem tela e regras testadas no emulador; o estudo de cada tópico abre pelo cartão de conceito; e cada bloco termina no resultado (M4).

**M3: Confiança declarada.** Seletor Palpite, Tenho dúvida e Tenho certeza, obrigatório antes de confirmar e antes do feedback. Textos num único arquivo de strings. Precisa rodar até 16/10, para os prints do relatório de evolução.
Prova: todo evento novo tem acerto e confiança.
Depende de: M2.
Atualizado em 06/10: implementado. O seletor, o feedback da prática (certo ou errado, explicação, XP e selo do quadrante) e os textos em `src/constants/textos.ts` estão no código, cobertos por teste. Regras publicadas e conteúdo no banco em 06/10, e o roteiro do dia 1 foi percorrido com uma conta real: os 40 eventos gravados têm acerto e confiança. Os níveis de confiança, que ficavam abaixo da dobra em tela de celular, foram para um rodapé fixo; falta conferir no aparelho (item 24 das decisões).

**M4: Diagnóstico do aluno.** Resultado com os quatro quadrantes, domínio por tópico, detalhe do tópico com calibração e lista de pontos cegos, e XP. A agregação é função pura, coberta por testes unitários.
Prova: o app mostra aprendizado, não só conclusão, que é a dor da cliente.
Depende de: M3.
Atualizado em 06/10: o resultado do bloco está implementado (quadrantes, XP com saldo real, acerto por tópico e por confiança nos blocos medidos, e o que revisar primeiro), com a agregação em função pura e testada. Faltam "Meu domínio" e "Detalhe do tópico".

**M5: Retenção e trilha diária.** Reteste dos quatro tópicos medidos de 7 a 9 dias após o pós, com esses tópicos travados até lá, e cálculo de retenção. Trilha diária nos dias 2 a 6: um tópico novo por dia de calendário, sequência de dias que zera se o aluno pular um dia (o tópico continua esperando) e tela "volte amanhã". A fila "Revisar hoje" fica para depois do piloto.
Prova: o app mede se o aluno ainda lembra, o que separa aprendizagem de desempenho na sessão.
Depende de: M4.
Atualizado em 07/10: a trava está no código. Cartão, prática, pré, pós e reteste só abrem na etapa certa do roteiro, também para quem digita a URL na web (item 23 das decisões). A espera também: a home mostra a contagem e as datas do reteste, e `/dia-1` mostra o resultado do pós-teste com os tópicos travados. Atualizado em 08/10: o cálculo de retenção está em `src/lib/retencao.ts`, com testes, e o conteúdo dos cinco tópicos da trilha veio do `main`. A trilha diária também está no app (fila de um tópico por dia, sequência e tela da sequência no fim do tópico), coberta por teste; falta vê-la com o conteúdo de verdade, depois do seed novo.

**M6: Banco de conteúdo (rascunho pronto).** Nove tópicos. Os quatro medidos, na ordem MDA, Pixel Art Básico, Escolhendo a Engine Certa e Lógica de Programação, têm 10 questões cada. Os cinco da trilha (GDD, UX/UI em jogos, Efeitos sonoros, Playtest e iteração, Publicando na Steam) têm 6 questões de prática cada. Cada questão tem dificuldade de 1 a 3 (hipótese do autor) e explicação por alternativa; cada tópico tem um cartão de conceito. O conteúdo fica em `content/*.json`, e `npm run seed:conteudo` valida e espelha no Firestore.
Prova: há questões suficientes para a métrica ter sinal.
Depende de: nada. Falta a revisão do grupo, até 23/10.

**M7: Relatório e exportação.** Visão agregada por tópico e por questão (por exemplo, as questões com mais pontos cegos), gerada fora do app, e CSV por script com Admin SDK, com um código no lugar de nome e contato. O grupo exporta e envia à cliente; não há painel nem papel de administrador no app.
Prova: dado real e consultável para o paper e para a cliente.
Depende de: M4.
Atualizado em 08/10: o script existe (`npm run exportar`) e gera os CSVs de eventos, participantes e questões, o resumo em texto e a chave do grupo. Falta rodar com os dados de verdade e incluir o SUS.

**M8: Piloto e análise.** Sessão 1 (cerca de 30 min): consentimento, pré-teste sem feedback, estudo com cartão e prática, pós-teste sem feedback e relatório. Sessão 2, de 7 a 9 dias após o pós (cerca de 10 min): reteste com as mesmas questões do pós, alternativas reembaralhadas, e SUS. Formas A e B contrabalanceadas; respostas de prática marcadas e fora do ganho.
Prova: resultados reais, com as limitações de amostra declaradas.
Depende de: M5, M6 e M7. Sessão 1 até 30/10 (no máximo 03/11), reteste entre 06/11 e 10/11 e análise até 13/11, para a apresentação de 14/11.

**Opcionais, depois do piloto:** modo offline com fila local; segundo formato de questão, só na prática; escada de dificuldade no modo prática. A escada sobe com 2 acertos firmes seguidos, não conta acerto com palpite ou dúvida, e um erro com certeza desce um nível e manda a questão para a revisão.

## Telas

A tela que decide se o projeto mede aprendizagem é a da pergunta. Alternativa e confiança são duas seleções independentes, marcadas em qualquer ordem; o botão Confirmar só habilita com as duas escolhidas, e só então o aluno vê o resultado. Não há opção de pular. No pré e no pós, nem isso: o resultado só aparece no relatório do fim.

```
+--------------------------------+
| Framework MDA            3/10  |
|--------------------------------|
| Qual modelo descreve mecânica, |
| dinâmica e estética?           |
|                                |
| ( ) A. ...                     |
| (x) B. MDA                     |
| ( ) C. ...                     |
| ( ) D. ...                     |
|                                |
| Quanto você confia?            |
| [ Palpite ]                    |
| [ Tenho dúvida ]               |
| [ Tenho certeza ]              |
|                                |
| [ Confirmar ]                  |
+--------------------------------+
```

Na prática, o feedback mostra certo ou errado, a explicação, o XP da questão e um selo do quadrante: Firme, Frágil, Lacuna ou Ponto cego, rótulos definidos pelo grupo.

A tela de domínio responde à dor da cliente (valores ilustrativos):

```
+--------------------------------+
| Meu domínio                    |
|--------------------------------|
| Framework MDA  #######---  72% |
|   retenção 80% · calibrado     |
| Engine         ####------  41% |
|   2 pontos cegos               |
| Pixel Art      ##--------  18% |
|   ainda sem reteste            |
+--------------------------------+
```

| Tela | O que mostra | Marco |
|---|---|---|
| Login, cadastro, completar perfil | Já existem; perfil só avança com todos os campos | M1 |
| Consentimento de pesquisa | Termo e aceite; define a forma inicial (A ou B) | M8 |
| Home | Atalhos no formato de trilha livre, com botão principal "Continuar estudos" para a próxima etapa do roteiro e as demais trilhas travadas em cinza claro; sequência de dias. Depois do piloto: Revisar hoje, Meu domínio, Lições, Perfil | M1, M5 |
| Roteiro do piloto | Pré-teste, cartão e prática por tópico e pós-teste em sequência, retomando de onde parou | M2, M8 |
| Cartão de conceito | Slides curtos antes da prática de cada tópico | M6 |
| Pergunta | Enunciado, alternativas embaralhadas, seletor de confiança, Confirmar | M2, M3 |
| Feedback da questão | Certo ou errado, explicação, XP e selo do quadrante (só na prática) | M3 |
| Resultado | Contagem dos quatro quadrantes, XP do bloco e o que revisar primeiro | M4 |
| Meu domínio | Barra de domínio, retenção e alertas por tópico | M4 |
| Detalhe do tópico | Acerto por nível de confiança, pontos cegos e histórico | M4 |
| Tópico do dia | Cartão curto, 6 práticas com feedback e "volte amanhã" com a sequência | M5 |
| Espera do reteste | Relatório do dia 1, contagem até o reteste e tópicos medidos travados | M5 |
| Reteste e SUS | As 12 questões do pós sem feedback, depois o questionário SUS | M5, M8 |
| Trilha de lições | Lições por tópico com selo de domínio (depois do piloto) | M2 |
| Revisar hoje | Fila de questões frágeis e pontos cegos (depois do piloto) | M5 |

Toda tela só lê `answers`: nenhuma guarda um número calculado que não possa ser refeito.

## Relatório

O mesmo conjunto de eventos alimenta três relatórios, cada um para um leitor. Só o do aluno aparece no app; os outros saem por exportação feita pelo grupo, para não expor respostas de uma pessoa a outra.

| Leitor | O que recebe | Formato | Marco |
|---|---|---|---|
| Aluno | Acerto por tópico, quadrantes, acerto por nível de confiança, XP, retenção e a sequência de dias da trilha; depois do piloto, o que revisar hoje | Telas do app | M4, M5 |
| Cliente (Jeane) | Aprendizagem (ganho e retenção), consciência do próprio saber (calibração, taxa de ponto cego, acerto simples × firme), engajamento (dias ativos, sequência, adesão ao reteste), qualidade do conteúdo (acerto e ponto cego por questão, distrator mais escolhido, dificuldade real × prevista) e SUS | Resumo agregado e CSV com código no lugar de nome e contato, exportados e enviados pelo grupo | M7 |
| Paper e professor | Tabela de eventos com código no lugar do participante, ganho normalizado, retenção, calibração agregada, transições de quadrante entre pré, pós e reteste, SUS | CSV e gráficos | M8 |

**Pergunta central:** respostas Firmes no pós são mais lembradas no reteste do que as Frágeis? Se sim, a confiança declarada prevê o esquecimento, o que a plataforma atual não consegue medir.

Com cerca de 15 pessoas e sem grupo de controle, os números descrevem e não provam causa. A amostra pequena entra na seção de limitações do paper.

## Pontos em aberto

Abertos (ainda travam o piloto):

- [ ] Distribuição do app para os participantes (Expo Go, build web na Vercel ou build EAS com APK/TestFlight): consultar o professor.
- [ ] Quem escreve e quem revisa cada tópico (proposta: revisor diferente do autor, revisão até 23/10, incluindo a trilha diária).
- [ ] Número e perfil dos participantes (proposta: pelo menos 15 colegas da UNDB, voluntários e sem nota).
- [ ] Versão em português do SUS e se haverá pergunta aberta.
- [ ] Data exata do Incubators.

Decididos em 04/10 e 05/10:

- [x] Prazos: 09/10 protótipo no Figma, 16/10 relatório de evolução, 14/11 apresentação ao cliente com análise, 27/11 paper final. Piloto: sessão 1 até 30/10 (no máximo 03/11), reteste entre 06/11 e 10/11, análise até 13/11.
- [x] Continuidade entre dispositivos saiu do projeto; o Firebase fica; o DRDA entregue não será alterado.
- [x] Domínio por acerto simples; confiança baixa são Palpite e Dúvida.
- [x] XP pela pontuação por certeza de Gardner-Medwin (1/2/3 e 0/−1/−4), exibido só no fim dos blocos medidos.
- [x] XP negativo (06/10): o saldo do bloco aparece como é; o piso em 0 vale só para o total acumulado.
- [x] Pergunta: alternativa e confiança em qualquer ordem, Confirmar só com as duas, sem pular.
- [x] Perfil completo obrigatório; código anônimo só na exportação.
- [x] Home: formato de trilha livre, botão "Continuar estudos", demais trilhas travadas em cinza claro.
- [x] Exportação: o grupo gera e envia o CSV; sem painel no app.
- [x] Comitê de ética e LGPD deixados de lado por ora (público controlado de colegas adultos).
- [x] Rótulos Firme, Frágil, Lacuna e Ponto cego definidos pelo grupo, sem validação com a Jeane.
- [x] Tópicos medidos (MDA, Pixel Art Básico, Escolhendo a Engine Certa, Lógica de Programação), 10 questões cada, só múltipla escolha nos blocos medidos.
- [x] Desenho do piloto: duas sessões, pré e pós sem feedback, formas A e B contrabalanceadas, reteste de 7 a 9 dias após o pós, chamada pelo grupo da turma.
- [x] Fluxo do participante: fase gravada em cada resposta, forma alternada por contador, etapa calculada pelas respostas, alternativas embaralhadas por participante e fase.
- [x] Trilha diária nos dias 2 a 6 com cinco tópicos fora da medição e tópicos medidos travados até o reteste.
- [x] Conteúdo em JSON versionado com um único script de seed; rascunho pronto.
