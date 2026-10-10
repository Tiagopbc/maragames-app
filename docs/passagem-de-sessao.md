# Passagem de sessão — 10/10/2026

Resumo para continuar o trabalho em outra conversa, sem depender do histórico da anterior. Em caso de conflito, vale `docs/decisoes-tecnicas.md` (as pendências vivem no item 24).

## Como retomar

Leia nesta ordem: `AGENTS.md`, este arquivo, `docs/plano-do-app-completo.md` e os itens 24 e 30 de `docs/decisoes-tecnicas.md`.

Combinados com o Tiago, que valem para toda sessão:

- Atacar as pendências na ordem do item 24, que segue as fases do plano, e, a cada item resolvido, atualizar a lista e mostrá-la na resposta.
- Antes de codar qualquer tela ou mudança de comportamento, apresentar o desenho e esperar a aprovação.
- Escrever o teste antes do código e vê-lo falhar.
- Nada que vai para o GitHub leva assinatura ou crédito do assistente: nem em commit, nem em pull request, nem em comentário.
- Perguntar antes de dar push e antes de abrir pull request. A liberação de "pode enviar sempre" valia só para o pull request nº 5, já integrado.
- Não rodar `npm run lint`: ele instala o ESLint e altera `package.json` e o lockfile.

## Combinado da rodada de 10/10 (Tiago fora, assistente trabalhando sozinho)

- **Escopo:** da prova da Fase 2 até a Fase 8 do plano, na ordem; a Fase 7 fica de fora.
- **Sem commit, sem push, nada no GitHub.** Tudo fica só no computador. À noite o Tiago recebe uma revisão resumida, testa, aprova, e só então se salva.
- **Sem parar para aprovar desenho de tela:** vale o plano e as decisões abaixo. Cada escolha de tela feita no caminho fica anotada em "Escolhas feitas sem o Tiago", mais abaixo, para a revisão.
- **Limite de uso:** conferir o uso do plano a cada fase. Se o limite de 5 horas ou o semanal chegar a 90%, parar, avisar e esperar o ok do Tiago.
- **Decisões tomadas pelo Tiago antes de sair:**
  - Conferência no app: pelo Chrome dele, na conta de teste dele; olhar as telas e fazer a lição Efeitos sonoros até o fim (grava 6 respostas de prática). O ciclo completo desde o começo fica para ele, à noite, com uma conta nova.
  - Navegação (D6): atalhos na home, sem barra de abas.
  - Perfil (Fase 6): edita tudo, menos o e-mail.
  - SUS (D4): sai do app por ora.
  - Fase 7 (D7): pulada por ora; fica uma revisão só, aos 7 dias.
  - Conteúdo (Fase 8): o assistente escreve as 30 questões de diagnóstico e verificação dos cinco tópicos que só têm prática, pesquisando na internet e com o que sabe. Entram como rascunho para o grupo revisar.
  - Explicações (Fase 8): tirar o "Correto." do começo das 70 explicações, no conteúdo.
  - Seed: quem roda é o Tiago, à noite. O assistente deixa o JSON validado com `--dry-run`.

## Resultado da rodada de 10/10

Feito no código, com teste, e **sem commit** (o último commit é o da Fase 1):

- **Fase 2:** página da lição, cartão e passos em `/licoes/[topicId]/...`, trava por lição, termo antes do primeiro diagnóstico, testes de emulador de `answers` e `attempts`.
- **Fase 3:** lista de lições em `/licoes`, por módulo, com situação e domínio.
- **Fase 4:** home nova (Para hoje, revisões agendadas, atalhos liberados). Saíram as rotas `/bloco/[fase]`, `/cartao/[topicId]` e `/dia-1`, o "Seu dia 1", a trilha de um tópico por dia, o portão do roteiro, `passo.ts`, `xpAcumulado` e os textos deles.
- **Fase 5:** Progresso em `/progresso` e detalhe do tópico em `/progresso/[topicId]`.
- **Fase 6:** Perfil em `/perfil`, com o formulário compartilhado com o primeiro preenchimento, e testes de regra da edição.
- **Fase 8:** 30 questões novas de diagnóstico e verificação para os cinco tópicos que só tinham prática, "Correto." fora das 70 explicações, validação do seed ajustada. Seed rodado pelo Tiago em 10/10, sem `--prune` (versão `ebaeb429b051`, 100 questões).
- **Fase 7:** fora, por decisão do Tiago.

Conferido no Chrome do Tiago, com a conta de teste dele: as telas novas e a lição Efeitos sonoros feita até o fim pelo app (6 respostas de prática gravadas, todas em Palpite; XP de +10 para +11, sequência em 3 dias).

Depois da revisão do Tiago no iPhone, em 10/10: o Progresso ganhou a seção "O que revisar primeiro", com as três lições mais fracas (item 30). Também a pedido dele, o Perfil ganhou a seção "Aparência" (do sistema, claro ou escuro), guardada no aparelho (item 31).

### Escolhas feitas sem o Tiago, para a revisão

- **Para hoje abre o passo direto**, mas empilha a página da lição por baixo: sair do passo volta para a lição, e não para a home. Sem termo aceito, abre só a página da lição.
- **"Feita"**, no atalho Lições ("3 de 9 feitas"), é a lição que já passou da verificação (ou da prática, no ciclo curto).
- **Os atalhos ficaram três lado a lado**, menores que os cartões antigos, e só Lições tem resumo.
- **O domínio, o XP e o Progresso só contam o que já pode aparecer** (`respostasAVista`): com o diagnóstico feito e a lição pela metade, nada dele vira número em tela nenhuma.
- **Lista de lições agrupada por módulo**, na ordem sugerida; módulo com uma lição só vira um grupo de uma linha.
- **Progresso:** XP total e sequência no topo, quadrantes (uma vez por questão, pela resposta mais recente), acerto por confiança (cada declaração conta) e "Meu domínio" só com as lições que têm resposta à vista.
- **Detalhe do tópico:** o histórico diz quais passos foram feitos e quando, sem acerto; só questões da prática são citadas pelo enunciado.
- **Perfil:** o termo aparece só como data do aceite, sem tela para reler o texto. O "Sair" saiu da home e ficou só aqui.
- **Depois do aceite do termo**, a pessoa volta para a página da lição e toca em "Começar" de novo.
- **`useBloco` ainda aceita o bloco geral** (sem tópico), que nenhuma rota usa mais; ficou para uma limpeza à parte, porque os testes da tela da pergunta dependem dele.
- **As 30 questões novas entraram direto em `content/questoes.json`**, com a fonte de cada uma, e não num arquivo de rascunho à parte: assim o seed já deixa os nove tópicos com o ciclo completo. A revisão do grupo fica como pendência no item 24.
- **O campo `trilha` do conteúdo não mudou** (`medido` ou `diaria`): virou rótulo de origem, sem efeito no app.
- **A lição Efeitos sonoros foi respondida em Palpite**, escolhendo sempre a primeira alternativa da tela: 1 acerto em 6.

## O que está esperando resposta do Tiago

1. **Revisar e aprovar a rodada de 10/10**, com a lista de escolhas acima, e testar no app.
2. **Commit, push e pull request** da branch `feat/ciclo-da-licao`: só depois da aprovação.
3. **Decidir sobre o `--prune`**: o seed de 10/10 gravou as 100 questões e manteve as 3 antigas que estão fora do JSON.
4. **Criar uma conta nova** para percorrer uma lição de ciclo completo desde o diagnóstico: é a parte da prova da Fase 2 que falta.
5. **O grupo:** confirmar a virada e revisar as 30 questões novas.

## Estado do repositório

- **`main`:** tem os pull requests nº 5 (roteiro do piloto), nº 6 (correção do tema na web) e nº 7 (XP à vista, exportação, plano e documentos da virada), todos integrados em 09/10.
- **Branch atual, só local:** `feat/ciclo-da-licao`, saída do `main`. A Fase 1 está em commit; as Fases 2 a 6 e 8 estão prontas e fora de commit, à espera da revisão do Tiago.
- **Cópia de trabalho da correção do tema:** em `.claude/worktrees/pensive-williamson-7d726f`, na branch `fix/tema-na-web`, já integrada. Pode ser apagada pelo Tiago.
- **Verificação:** `npm test` passa com 613 testes (609 no projeto "nativo" e 4 no "web"; são menos que os 658 de antes porque os testes do roteiro antigo saíram com ele); `npx tsc --noEmit` sem erros; `npm run test:regras` passa com 69 (precisa de Java; rodado em 10/10). Na primeira rodada depois de mudar a configuração do jest, 4 testes falharam e passaram na rodada seguinte, sem mudança de código; a causa provável é o cache frio estourando o tempo do primeiro teste de cada suíte, mas isso não foi confirmado.
- **Para rodar:** `npm run web` (porta 8081) e, para o celular, `npx expo start --port 8082`.

## Estado do Firebase (projeto `maragames-mobile`)

- **Conteúdo no banco:** seed rodado em 10/10, versão `ebaeb429b051`: 9 lições e 100 questões, as mesmas do repositório. Restam 3 questões antigas, sem versão, que só saem com `npm run seed:conteudo -- --prune`.
- **Dados de teste:** duas contas, que ficam até a Fase 2 do plano (decisão D8). A do Tiago (pós em 06/10) tem 58 respostas, incluindo GDD (08/10), UX/UI (09/10) e Efeitos sonoros (10/10, feita pelo assistente), e uma tentativa de reteste aberta. A de apelido Tiagopbc (pós em 08/10) tem 40 respostas. O contador do piloto está em 2.
- **Acesso:** `serviceAccountKey.json` (fora do git) permite ler pelo Admin SDK. O assistente só lê; apagar dados é com o Tiago.

## O que já funciona

Cadastro, perfil obrigatório, home com "Para hoje", lista de lições, página da lição com diagnóstico, cartão, prática, verificação e revisão, Progresso com o detalhe de cada tópico, Perfil com edição e "Sair", e `npm run exportar` (ainda pelo desenho do piloto). O app tem a identidade da Beast Maragames.

Conferido no app de verdade em 10/10: na web, em largura de computador e tema escuro, com a conta de teste do Tiago. Antes disso, num iPhone pelo Expo Go, só as telas que não mudaram (login, pergunta, cartão).

## O que falta

Está no item 24 de `docs/decisoes-tecnicas.md`, na ordem das fases do plano. Em resumo: revisão e commit da rodada de 10/10, seed do conteúdo, a lição de ciclo completo com uma conta nova, a exportação por tópico (Fase 9) e o acabamento (Fase 10).

## Limites do assistente nesta máquina

- Não cria conta nem digita senha em serviço de login externo, e o Firebase Auth é um.
- **Sessão logada no painel do navegador.** A sessão do painel do navegador não passa de uma conversa para outra: em 09/10, numa conversa nova, `http://localhost:8081` abriu no login. A saída foi o Chrome do Tiago, pela extensão, onde a conta dele está logada em `http://localhost:8081` (a conta Tiagopbc estava em `http://127.0.0.1:8081`). Antes de conferir qualquer tela logada, abrir o painel e ver se cai na home ou no login; se cair no login, pedir ao Tiago para entrar, e não tentar entrar por conta própria.
- Para ver o login sem deslogar ninguém, abrir `http://127.0.0.1:8081` no painel: é outro endereço para o navegador, então não enxerga a sessão de `localhost`.
- Não apaga dados em definitivo. Para a limpeza, escreve um script que primeiro lista, e o Tiago roda.
- O protótipo do Figma foi corrigido à mão pelo Tiago em 08/10; a integração do assistente com o Figma estava barrada pelo limite do plano.

## Prazos

Cancelados em 09/10, por decisão do Tiago. O projeto passou a seguir `docs/plano-do-app-completo.md`: app completo, com lições livres e medição por tópico, em fases sem data. O plano foi aprovado pelo Tiago no mesmo dia.
