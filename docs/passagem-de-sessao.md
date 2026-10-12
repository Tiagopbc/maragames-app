# Passagem de sessão — 12/10/2026

Resumo para continuar o trabalho em outra conversa, sem depender do histórico da anterior. Em caso de conflito, vale `docs/decisoes-tecnicas.md` (as pendências vivem no item 24).

## Como retomar

Leia nesta ordem: `AGENTS.md`, este arquivo, `docs/plano-do-app-completo.md` e os itens 24, 30, 31, 32, 33 e 34 de `docs/decisoes-tecnicas.md`.

Combinados com o Tiago, que valem para toda sessão:

- Atacar as pendências na ordem do item 24, que segue as fases do plano, e, a cada item resolvido, atualizar a lista e mostrá-la na resposta.
- Antes de codar qualquer tela ou mudança de comportamento, apresentar o desenho e esperar a aprovação.
- Escrever o teste antes do código e vê-lo falhar.
- Nada que vai para o GitHub leva assinatura ou crédito do assistente: nem em commit, nem em pull request, nem em comentário.
- Perguntar antes de dar push e antes de abrir pull request. A liberação de "pode enviar sempre" valia só para o pull request nº 5, já integrado.
- `npm run lint` pode rodar à vontade: o ESLint foi configurado em 10/10.
- O repositório é público: nenhum dado de pessoa de verdade (e-mail, telefone) entra em arquivo, commit ou pull request. As contas de teste são citadas pelo apelido.
- O Chrome do Tiago só é usado quando ele pede.

## Resultado da rodada de 10/10

Feito no código, com teste, e integrado ao `main` pelo pull request nº 8:

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

## Feito na tarde de 10/10, a pedido do Tiago

- Pull request nº 9, com a correção do ciclo de quem já praticou (apontamento do Codex no nº 8): integrado em 11/10.
- Lição de ciclo completo percorrida no app desde o diagnóstico (Playtest e iteração, conta de teste do Tiago, pelo Chrome dele) e conferida no banco. A prova da Fase 2 está fechada.
- Fase 9: exportação por lição e por pessoa (`licoes.csv`), e o resto do roteiro do piloto apagado.
- Fase 10, o que dava para fazer no código: nome de exibição "Beast Maragames", duas dependências sem uso removidas, ESLint configurado e sem erro, script `npm run limpar:teste`.
- Os três últimos itens foram para o `main` pelo pull request nº 10, em 11/10.

Limites que valeram: o assistente não cria conta nem apaga dado em definitivo. O `--prune` e a limpeza das contas de teste são comandos para o Tiago rodar; aparelho de verdade e forma de distribuição também são dele.

## Feito em 11/10 e 12/10

- **Pull request nº 10 integrado** (Fase 9 e o acabamento de código da Fase 10).
- **Começo com a conta limpa percorrido no app** (apelido Tiagopbc, no Chrome do Tiago, em `http://127.0.0.1:8081`): aviso do termo na lição, trava pela URL, termo, diagnóstico sem número, saída e retomada. Conferido no banco. O Tiago limpou a conta de novo em seguida.
- **Termo reescrito para o ciclo da lição** (`src/constants/termo.ts`), com teste, e aprovado pelo Tiago. As 30 questões novas seguem como estão, por decisão dele.
- **Distribuição decidida e no ar (item 32):** web na Vercel e APK pelo EAS. `web.output` passou a `single`, entraram o `vercel.json`, o `android.package` (`com.beastmaragames.app`) e o `eas.json`. Projetos criados pelo assistente, com a liberação do Tiago; variáveis do Firebase e domínio autorizado cadastrados por ele.
- **Pull request nº 11 integrado em 12/10.** A revisão do Codex apontou e-mails reais num documento, escritos pelo assistente; os commits foram refeitos sem eles antes da integração. O commit antigo ainda responde no GitHub pelo identificador; o Tiago decidiu não pedir a remoção ao suporte.
- **Web publicada:** `https://maragames-app.vercel.app`, a partir do `main`. Conferida sem entrar em conta.
- **Primeiro APK gerado em 12/10** (build `d11d99c8`, perfil `preview`, versão 1.0.0, `versionCode` 1). O link para baixar está na página do build, no painel do Expo, ou em `npx eas-cli build:list --platform android --limit 1`. Ninguém o instalou ainda.

## O que está esperando resposta do Tiago

1. **Ver no app o que entrou em 12/10**, que pede conta logada e não foi visto: completar o perfil (conta nova e conta antiga), o Perfil com o cabeçalho, as seções e o "Sobre", "Sobre você e os jogos", o aceite de contato, as notas por módulo antes do primeiro diagnóstico e o termo para reler. E confirmar que o link de redefinição troca a senha. As regras do Firestore estão publicadas, na versão do `main`.
4. **Gerar um APK novo**, agora que o item 34 está no `main` e as regras estão publicadas (`npx eas-cli build -p android --profile preview`), instalar num Android e conferir o login por e-mail e uma lição. Os dois builds de 12/10 não têm o perfil novo.
5. **Ver as revisões no app.** A conta principal do Tiago tem quatro lições com a revisão abrindo em 13/10, uma em 17/10 e uma em 19/10. Ela vai cair antes na tela de completar o perfil, por causa do item 34. É a única parte do ciclo ainda não vista no app: o "Para hoje" deve sugerir a revisão, e o fim dela mostra "Na verificação X de 3 → Hoje Y de 3". Depois disso as contas de teste podem ser limpas, com o contador do termo (`--zerar-contador`).
6. **Conferir no iPhone e num Android**, nos dois temas, com a seção "Aparência" do Perfil. A troca de tema do sistema com o app aberto e logado e a tela do termo já foram vistas pelo Tiago, em 12/10.

## Estado do repositório

- **`main`:** tem os pull requests nº 5 a nº 16 integrados. O nº 8 trouxe o app do ciclo da lição; o nº 9, a correção do ciclo de quem já praticou; o nº 10, a Fase 9 e o acabamento de código da Fase 10; o nº 11, o termo novo e a configuração da distribuição; o nº 13, o olho na senha, a redefinição, o Perfil em seções e o termo para reler; o nº 15, os dados do perfil (item 34); o nº 16, as correções da revisão do nº 15; o nº 12 e o nº 14, documentos.
- **Branch atual:** `feat/perfil-resumo-e-sobre`, em cima do `main` (que já tem o pull request nº 16), com o cabeçalho do Perfil, a seção "Sobre", a coluna estreita e os documentos, em pull request aberto em 12/10. Não mexe nas regras do Firestore.
- **Cópia de trabalho da correção do tema:** em `.claude/worktrees/pensive-williamson-7d726f`, na branch `fix/tema-na-web`, já integrada. Pode ser apagada pelo Tiago.
- **Verificação:** `npm test` passa com 749 testes (745 no projeto "nativo" e 4 no "web"; o número caiu duas vezes porque os testes do roteiro antigo saíram com ele); `npx tsc --noEmit` sem erros; `npm run lint` sem erro nem aviso; `npm run test:regras` passa com 120 (precisa de Java; rodado em 12/10). Na primeira rodada depois de mudar a configuração do jest, 4 testes falharam e passaram na rodada seguinte, sem mudança de código; a causa provável é o cache frio estourando o tempo do primeiro teste de cada suíte, mas isso não foi confirmado.
- **Para rodar:** `npm run web` (porta 8081; depois da troca de `web.output` no `app.json`, reiniciar o servidor) e, para o celular, `npx expo start --port 8082`.
- **Distribuição:** a Vercel (projeto `maragames-app`) publica a produção a cada push no `main` e uma prévia a cada push de branch. O APK sai com `npx eas-cli build -p android --profile preview`, do projeto `@tiagopbc/maragames-app`. As variáveis `EXPO_PUBLIC_FIREBASE_*` ficam fora do git: na Vercel, só em Production (as prévias abrem sem Firebase, de propósito), e no ambiente `preview` do EAS.

## Estado do Firebase (projeto `maragames-mobile`)

- **Conteúdo no banco:** seed rodado em 10/10, versão `ebaeb429b051`: 9 lições e 100 questões, as mesmas do repositório. As 3 questões antigas saíram em 11/10, com `--prune`.
- **Dados de teste:** três contas a tratar. A principal do Tiago (apelido Tiago): 82 respostas, termo aceito, revisões para 13/10 e 17/10; fica até elas serem vistas no app. A que entra pelo Google (apelido Tiagopbc), criada em 12/10 na web publicada: 10 respostas, termo aceito, revisão do Framework MDA para 19/10. A que entra por e-mail e senha, também de apelido Tiagopbc: limpa. O contador do termo está em 4.
- **Acesso:** `serviceAccountKey.json` (fora do git) permite ler pelo Admin SDK. O assistente só lê; apagar dados é com o Tiago.

## O que já funciona

Cadastro, perfil obrigatório, home com "Para hoje", lista de lições, página da lição com diagnóstico, cartão, prática, verificação e revisão, Progresso com o detalhe de cada tópico, Perfil com edição e "Sair", e `npm run exportar`, com ganho e retenção por lição e por pessoa. O app tem a identidade da Beast Maragames e está publicado em `https://maragames-app.vercel.app`.

Conferido no app de verdade: em 10/10, na web, em largura de computador e tema escuro, com a conta de teste do Tiago; em 11/10, o começo com o termo, com a conta limpa; em 12/10, o endereço publicado, sem entrar em conta. Antes disso, num iPhone pelo Expo Go, só as telas que não mudaram (login, pergunta, cartão).

## O que falta

Está no item 24 de `docs/decisoes-tecnicas.md`, na ordem das fases do plano. Em resumo, só a Fase 10: o login testado na web publicada, o APK instalado num aparelho, as revisões de 13/10 e 17/10 vistas no app, a conferência em iPhone e Android nos dois temas, a limpeza da conta de teste que resta e a prova da fase, com uma pessoa de fora.

## Limites do assistente nesta máquina

- Não cria conta nem digita senha em serviço de login externo, e o Firebase Auth é um.
- **Sessão logada no painel do navegador.** A sessão do painel do navegador não passa de uma conversa para outra: em 09/10, numa conversa nova, `http://localhost:8081` abriu no login. A saída foi o Chrome do Tiago, pela extensão, onde a conta principal dele (apelido Tiago) está logada em `http://localhost:8081` e a conta Tiagopbc, em `http://127.0.0.1:8081`. Antes de conferir qualquer tela logada, abrir o painel e ver se cai na home ou no login; se cair no login, pedir ao Tiago para entrar, e não tentar entrar por conta própria.
- Para ver o login sem deslogar ninguém, abrir `http://127.0.0.1:8081` no painel: é outro endereço para o navegador, então não enxerga a sessão de `localhost`.
- Não apaga dados em definitivo. Para a limpeza, escreve um script que primeiro lista, e o Tiago roda.
- O repositório é público: e-mail, telefone ou outro dado de pessoa de verdade não entra em documento, teste, commit nem pull request. As contas são citadas pelo apelido. A única exceção é o e-mail de contato da seção "Sobre" do Perfil, escolhido pelo Tiago em 12/10 (`CONTATO_DO_GRUPO`).
- O protótipo do Figma foi corrigido à mão pelo Tiago em 08/10; a integração do assistente com o Figma estava barrada pelo limite do plano.

## Prazos

Cancelados em 09/10, por decisão do Tiago. O projeto passou a seguir `docs/plano-do-app-completo.md`: app completo, com lições livres e medição por tópico, em fases sem data. O plano foi aprovado pelo Tiago no mesmo dia.
