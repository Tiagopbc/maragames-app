# Plano do app completo

09/10/2026 · Tiago Cavalcanti. **Aprovado pelo Tiago em 09/10**, com a medição por tópico, a sugestão do dia e as decisões D1, D2, D3 e D5 fechadas; D4, D6, D7 e D8 seguem como recomendação até serem respondidas, e falta o grupo confirmar a virada. Este arquivo guia o projeto no lugar de `docs/rota-recalculada.md`. As decisões técnicas continuam em `docs/decisoes-tecnicas.md` (a virada é o item 30), e o andamento de cada fase fica no item 24.

## 1. O que muda

Até 09/10 o app era o roteiro de um piloto: todo mundo fazia o mesmo caminho, na mesma ordem, em datas marcadas, e o resto da home ficava travado. A partir de agora o objetivo é o app completo.

- **Sem datas.** Todos os prazos do item 20 das decisões estão cancelados. A ordem do trabalho é a das fases da seção 8; uma fase termina quando a prova dela passa, e não num dia marcado.
- **Lições livres.** O aluno escolhe o assunto e percorre as lições na ordem que quiser.
- **Lições, Progresso e Perfil abertos.** Os três atalhos da home deixam de ser cadeados e viram telas de verdade.
- **Home reorganizada.** Saudação, o que fazer hoje e os três atalhos. Saem a "próxima etapa" do roteiro e os links soltos de pré-teste, pós-teste e reteste.
- **Medição por tópico (decidido).** Pré-teste, pós-teste e reteste deixam de ser três blocos gerais e passam a fazer parte de cada lição.
- **Trilha diária como sugestão do dia (decidido).** Deixa de ser uma fila de um tópico por dia e vira um cartão que aponta o melhor próximo passo, sem limite.

O que não muda: o eixo do produto é medir aprendizagem com confiança declarada. O evento em `answers`, a regra do quadrante, o XP de Gardner-Medwin, a tela da pergunta e as regras de arquitetura do `AGENTS.md` ficam como estão.

## 2. Princípios que continuam valendo

1. `answers` é evento imutável, e nada derivado é gravado. O estado de cada lição, a sugestão do dia, o XP, o domínio e a sequência saem das respostas.
2. Nenhuma tela importa Firebase; dados só pelo `ProgressRepository`.
3. Regra de negócio em função pura, com teste antes do código (item 26).
4. Nos blocos sem feedback (diagnóstico, verificação e revisão), nada aparece por questão e o XP só entra no total quando o bloco termina (itens 14, 19 e 27).
5. Textos num único arquivo de strings; cores do tema; comportamento por plataforma em arquivo `.web.ts`.
6. Antes de codar tela ou mudança de comportamento, o desenho é apresentado e aprovado.

## 3. Mapa do app

```
Login / Cadastro / Completar perfil        (já existem)
        |
      Home  ------------------------------------------+
        |  Para hoje  -> abre o passo sugerido        |
        |  Lições     -> lista de lições              |
        |  Progresso  -> meu domínio                  |
        |  Perfil     -> meus dados, sair             |
        |                                             |
   Lições (lista por módulo)                    Progresso
        |                                             |
   Lição (página do tópico)                  Detalhe do tópico
        |
   Diagnóstico -> Cartão -> Prática -> Verificação -> (7 dias) -> Revisão
```

| Tela | Rota | Estado hoje |
|---|---|---|
| Home | `/` | Existe; será redesenhada (seção 4) |
| Lições | `/licoes` | Nova |
| Lição | `/licoes/[topicId]` | Nova |
| Cartão de conceito | `/cartao/[topicId]` | Existe; fica |
| Bloco de questões | `/bloco/[fase]?topicId=` | Existe; os blocos sem feedback passam a exigir o tópico |
| Progresso | `/progresso` | Nova (é o "Meu domínio" do M4) |
| Detalhe do tópico | `/progresso/[topicId]` | Nova (M4) |
| Perfil | `/perfil` | Nova |
| Consentimento | `/consentimento` | Existe; muda de lugar no fluxo (decisão D3) |
| Seu dia 1 | `/dia-1` | Existe; sai (o conteúdo dela vai para Progresso) |

## 4. A home nova

```
+--------------------------------------+
| Olá, Tiago                 [XP: +10] |
| O que vamos estudar hoje?            |
|                                      |
| +----------------------------------+ |
| | Para hoje        [Sequência: 2]  | |
| | Revisão de Framework MDA         | |
| | 3 questões, sem consulta         | |
| | [        Começar            ]    | |
| +----------------------------------+ |
|                                      |
| Revisões agendadas                   |
| Pixel Art Básico · em 3 dias         |
| Engine Certa · em 5 dias             |
|                                      |
| +---------+ +---------+ +---------+  |
| | Lições  | |Progresso| | Perfil  |  |
| | 3 de 9  | | 2 firmes| |         |  |
| +---------+ +---------+ +---------+  |
+--------------------------------------+
```

De cima para baixo:

1. **Saudação**, com o selo do XP total (já existe).
2. **Para hoje**: um cartão só, com um botão só. É a trilha diária. O que ele mostra segue a ordem da seção 6. O selo da sequência fica nele.
3. **Revisões agendadas**: só aparece quando há lição esperando revisão. Uma linha por lição, com os dias que faltam. Não tem botão: a revisão que venceu sobe para o "Para hoje".
4. **Atalhos**: Lições, Progresso e Perfil, liberados, cada um com um número pequeno que resume a área. Continuam saindo do array tipado `ATALHOS` (item 6).

O que sai da home: o cartão "Próxima etapa", o botão "Ver meu resultado do dia 1", os links de desenvolvimento para pré, pós e reteste, e o "Sair" no rodapé, que vai para o Perfil.

## 5. O ciclo de uma lição

Cada lição é um tópico. O pré-teste, o pós-teste e o reteste continuam existindo no dado com os mesmos nomes de fase (`pre`, `pos`, `reteste`), então nada do que já foi gravado perde sentido. Na tela, ganham nomes que dizem para que servem.

| Passo | Fase no dado | O que é | Feedback |
|---|---|---|---|
| Diagnóstico | `pre` | 3 questões de uma forma (A ou B), ao abrir a lição pela primeira vez | Nenhum |
| Cartão | (sem evento) | Os slides de conceito | — |
| Prática | `pratica` | As questões de prática do tópico | Completo, por questão |
| Verificação | `pos` | 3 questões da outra forma | Nenhum por questão; resultado da lição no fim |
| Revisão | `reteste` | As mesmas 3 da verificação, reembaralhadas, 7 dias depois | Nenhum por questão; retenção no fim |

**Estado da lição**, calculado das respostas do tópico:

| Estado | Quando | O que a página da lição oferece |
|---|---|---|
| Nova | Nenhuma resposta | "Começar" (abre o diagnóstico) |
| Diagnóstico | Diagnóstico pela metade | "Continuar o diagnóstico" |
| Estudo | Diagnóstico feito, prática por terminar | Cartão ou prática, pelo mesmo corte de hoje |
| Verificação | Prática feita, verificação por terminar | "Fazer a verificação" |
| Aguardando revisão | Verificação feita há menos de 7 dias | Resultado da lição e a data da revisão |
| Revisão disponível | 7 dias ou mais desde a verificação | "Fazer a revisão" |
| Concluída | Revisão feita | Resultado completo, com a retenção; prática livre |

**Resultado da lição.** No fim da verificação, a tela mostra o antes e o depois em contagem ("Antes 1 de 3 → Depois 3 de 3"), o XP da lição, os quadrantes e o que revisar. Isso revê o item 27, que deixava a comparação pré e pós só para a análise: com o ciclo dentro da lição, o antes e depois é a recompensa de terminar (decisão D5).

**Lições sem formas A e B.** Hoje só os quatro tópicos medidos têm questões de diagnóstico e verificação. Os outros cinco (GDD, UX/UI, Efeitos sonoros, Playtest, Publicando na Steam) têm só prática. Enquanto não ganharem as questões, o ciclo deles é curto: cartão e prática, e a lição fica concluída. A página da lição não mostra passo que o conteúdo não tem. Escrever essas questões é a Fase 8.

**A forma de cada pessoa.** Continua uma por participante (`formaPre`), valendo para todas as lições: quem tem A faz A no diagnóstico e B na verificação. Mantém o contrabalanceamento entre pessoas sem campo novo.

**O que continua travado.** Dentro de uma lição a ordem dos passos não se pula: a trava do roteiro (item 23) deixa de olhar o roteiro geral e passa a olhar o estado da lição. Entre lições não há trava nenhuma.

## 6. Para hoje: a regra da sugestão

Função pura, recebe o estado de todas as lições e a ordem sugerida do conteúdo (`ordem`). Devolve um passo só, o primeiro que existir nesta lista:

1. Uma revisão disponível, a mais antiga primeiro.
2. Uma lição começada e não terminada (diagnóstico, estudo ou verificação pela metade), a mexida mais recentemente.
3. A próxima lição nova, na ordem sugerida.
4. Nada: "Tudo em dia", com a data da próxima revisão, ou "Você concluiu todas as lições".

Não há limite por dia: terminar o passo sugerido recalcula e mostra o seguinte. A sequência conta os dias de calendário com pelo menos uma resposta, como hoje (`sequenciaDeDias`).

## 7. O que se aproveita e o que sai

**Fica como está:** tela da pergunta, seletor de confiança, feedback da prática, cartão de conceito, resultado do bloco, `xp.ts`, `quadrante.ts`, `dominio.ts`, `retencao.ts`, `embaralhar.ts`, `resultado.ts`, `ProgressRepository`, login, cadastro, perfil obrigatório, tema e identidade visual, script de seed, formato do conteúdo.

**Muda:**

| Onde | O que muda |
|---|---|
| `src/lib/bloco.ts` | `questoesDoBlocoMedido` passa a recortar por tópico |
| `src/lib/roteiro.ts` | `etapaDoRoteiro` dá lugar a `estadoDaLicao`; as contas de dia de calendário ficam |
| `src/lib/trilha.ts` | `estadoDaTrilha` dá lugar a `sugestaoDoDia`; `sequenciaDeDias` fica |
| `src/lib/passo.ts` | A trava passa a perguntar ao estado da lição |
| `src/lib/xp.ts` | `xpAcumulado` passa a decidir "bloco concluído" por tópico, e não pela etapa geral |
| `src/hooks/use-bloco.ts` | Diagnóstico, verificação e revisão recebem o tópico e gravam a tentativa na lição dele |
| `src/hooks/use-roteiro.ts` | Vira o hook que entrega os estados das lições e a sugestão |
| `src/app/(app)/index.tsx` | A home da seção 4 |
| `src/lib/exportacao.ts` | Ganho e retenção por tópico e por pessoa |
| `firestore.rules` | Conferir se a tentativa por lição nos blocos sem feedback passa; testes de emulador para `answers` e `attempts` |

**Sai:** a tela "Seu dia 1" e o `use-dia-1`, a espera geral do reteste, a fila da trilha de um tópico por dia, os links de desenvolvimento da home e a exceção `travaVale`, e a etapa `sus` do roteiro (decisão D4).

**Dados já gravados.** As respostas das duas contas de teste foram gravadas com fase e tópico, então o modelo novo as lê sem migração: quem fez o pré e o pós dos quatro tópicos aparece com as quatro lições em "Aguardando revisão".

## 8. Fases

Sem datas. Cada fase tem uma prova; só começa a seguinte quando a prova passa. Dentro de cada fase vale o combinado: desenho aprovado, teste antes do código, verificação no app.

**Fase 0 — Virar os documentos e fechar o que está aberto.**
Atualizar `AGENTS.md` (escopo, regras da home, fora de escopo), rever nas decisões os itens 6, 19, 20, 22, 23 e 27, e reescrever o item 24 na ordem destas fases. Decidir push e pull request da branch `fix/exportacao-pasta-e-aviso`. Conferir se a branch `fix/tema-na-web` resolve o tema preso e trazê-la.
Prova: quem ler `AGENTS.md` e o item 24 entende o projeto novo sem ler este arquivo.
Andamento em 09/10: concluída, com o pull request nº 7 integrado. Falta só o grupo confirmar a virada.

**Fase 1 — Motor do ciclo da lição.**
Funções puras, sem tela: `estadoDaLicao`, `sugestaoDoDia`, o recorte de questões por tópico e fase, e o `xpAcumulado` por tópico.
Prova: os testes cobrem os sete estados, a ordem da sugestão e uma conta de teste antiga lida pelo modelo novo.
Depende de: Fase 0.
Andamento em 09/10: concluída. O total novo ficou com o nome `xpDasLicoes`, e o `xpAcumulado` segue servindo à home até a Fase 4.

**Fase 2 — Página da lição e blocos por tópico.**
Rota `/licoes/[topicId]`, com os passos e o estado; diagnóstico, verificação e revisão abrindo pelo tópico; resultado da lição com antes e depois; a trava por lição; regras do Firestore conferidas e testadas no emulador.
Prova: uma conta nova percorre uma lição inteira de um tópico medido e uma de um tópico só com prática, e o banco fica com os eventos certos.
Depende de: Fase 1.

**Fase 3 — Lista de lições.**
Rota `/licoes`: lições agrupadas por módulo, cada uma com o estado e o domínio; qualquer uma abre.
Prova: o aluno começa por uma lição que não é a primeira da ordem sugerida, e nada o impede.
Depende de: Fase 2.

**Fase 4 — Home nova.**
A home da seção 4, com "Para hoje", revisões agendadas e os atalhos liberados. Remoção do roteiro antigo, do "Seu dia 1" e dos links de desenvolvimento.
Prova: na home não sobra nenhum texto de pré-teste, pós-teste ou reteste, e o botão do "Para hoje" leva ao passo certo em cada um dos quatro casos da seção 6.
Depende de: Fase 3. O atalho de Progresso e o de Perfil abrem telas simples até as Fases 5 e 6.

**Fase 5 — Progresso.**
"Meu domínio": por tópico, domínio em contagem, antes e depois, retenção e pontos cegos; no topo, XP total, sequência e acerto por nível de confiança. Detalhe do tópico com o histórico.
Prova: os números da tela batem com a exportação da mesma conta.
Depende de: Fase 2.

**Fase 6 — Perfil.**
Ver e editar os dados do cadastro (e-mail só leitura), ver o termo aceito e sair. A validação continua em dobro: `validacao.ts` e `perfilValido()`.
Prova: editar o apelido muda a saudação da home, e um campo vazio é recusado na tela e na regra.
Depende de: nada além da Fase 0; pode andar em paralelo.

**Fase 7 — Revisão em intervalos crescentes.**
Depois da primeira revisão, as questões frágeis e os pontos cegos voltam em intervalos maiores. É a fila "Revisar hoje" prevista para depois do piloto.
Prova: uma questão errada com certeza na revisão reaparece no "Para hoje" no intervalo definido.
Depende de: Fases 4 e 5. Entra só se a decisão D7 pedir.

**Fase 8 — Conteúdo.**
Questões de diagnóstico e verificação (formas A e B) para os cinco tópicos que só têm prática; revisão das explicações que começam com "Correto."; conferência dos módulos.
Prova: os nove tópicos fazem o ciclo completo.
Depende de: nada; anda em paralelo desde a Fase 1.

**Fase 9 — Exportação.**
`npm run exportar` com ganho e retenção por tópico e por pessoa.
Prova: os CSVs de uma conta de teste batem com a tela de Progresso.
Depende de: Fase 5.

**Fase 10 — Acabamento.**
Conferência em iPhone e Android, nome de exibição do app, dependências sem uso, ESLint, limpeza dos dados de teste e forma de distribuição.
Prova: uma pessoa de fora instala, cria conta e conclui uma lição sem ajuda.

## 9. Para onde vão as pendências do item 24

| Pendência de hoje | Destino |
|---|---|
| XP na tela da sequência e no iPhone | Fase 2 (a tela da sequência passa a ser o fim da lição) e Fase 10 |
| Conferir num aparelho de verdade | Fase 10 |
| Resto do visual do protótipo | Substituído pelas seções 4 e 5 deste plano |
| Tema preso ao trocar com o app aberto | Corrigido (Fase 0); a conferência com o app logado fica na Fase 10 |
| Dados de teste e limpeza da véspera | Fase 10 (os links de desenvolvimento saem na Fase 4) |
| Sobras do seed antigo | Fase 8 |
| Tela do SUS | Decisão D4 |
| Telas "Meu domínio" e "Detalhe do tópico" | Fase 5 |
| Exportação com dados de verdade | Fase 9 |
| Testes de emulador de `answers` e `attempts` | Fase 2 |
| ESLint e dependências sem uso | Fase 10 |
| Atalhos travados | Fases 3 a 6 |
| Decisões do grupo sobre o protótipo e o piloto | Caem, menos o texto do termo (D3) e a redação das explicações (Fase 8) |
| Distribuição e Incubators | Fase 10; a data do Incubators deixa de ser acompanhada |

## 10. Decisões em aberto

A D1, a D2, a D3 e a D5 foram decididas pelo Tiago em 09/10, conforme a recomendação. As outras têm uma recomendação e podem esperar a fase em que aparecem.

| | Pergunta | Recomendação |
|---|---|---|
| D1 | O diagnóstico é obrigatório ou dá para pular? | **Decidido: obrigatório.** São 3 questões, e sem ele não há antes e depois. |
| D2 | Entre a verificação e a revisão, a lição fica travada? | **Decidido: a prática fica travada e o cartão fica livre.** Refazer a prática na véspera mudaria o que a revisão mede; reler o cartão não gera evento. É a mesma razão do "travados até o reteste" de hoje, agora só para a lição em espera. |
| D3 | Onde fica o termo de consentimento? | **Decidido: uma vez, antes do primeiro diagnóstico.** É ele que cria a `formaPre`. Se o app deixar de ser pesquisa, vira aviso de privacidade e a forma nasce no perfil. |
| D4 | O SUS continua? | Sai do fluxo. Era o fecho do piloto; sem piloto, não tem momento natural. Pode voltar como "Avaliar o app" no Perfil. |
| D5 | Mostrar antes e depois no fim da lição? | **Decidido: sim, em contagem.** Revê o item 27. |
| D6 | Navegação por atalhos na home ou barra de abas? | Atalhos na home, como pedido. A barra de abas volta à discussão quando as quatro áreas existirem. |
| D7 | Uma revisão aos 7 dias ou intervalos crescentes? | Uma, por ora. Os intervalos são a Fase 7. |
| D8 | As duas contas de teste: apagar ou manter? | Manter até a Fase 2, porque servem de prova de que os dados antigos são lidos pelo modelo novo. |

Falta também o grupo confirmar a virada: pelo `AGENTS.md`, decisão de produto é do grupo, e este plano foi fechado com o Tiago.
