# Passagem de sessão — 09/10/2026

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

## O que está esperando resposta do Tiago

1. **Push e pull request da branch `fix/exportacao-pasta-e-aviso`.** É o que falta para fechar a Fase 0 do plano. A branch tem os ajustes da exportação, o XP à vista, o plano do app completo e os documentos revistos, já com o `main` do pull request nº 6.
2. **Começar a Fase 1** (motor do ciclo da lição, só funções puras): antes do código, apresentar o desenho de `estadoDaLicao` e `sugestaoDoDia`.
3. **Decisões D3 a D8** do plano (seção 10). Nenhuma trava a Fase 1; D3 (lugar do termo) e D5 (antes e depois na tela do aluno) precisam de resposta na Fase 2.
4. **O grupo confirmar a virada.** Ela foi fechada só com o Tiago.

## Estado do repositório

- **`main` remoto:** tem os pull requests nº 5 (roteiro do piloto) e nº 6 (correção do tema na web), os dois integrados em 09/10. O `main` local ainda está no nº 5.
- **Branch atual, só local:** `fix/exportacao-pasta-e-aviso`. Traz os ajustes da exportação, o XP à vista, o plano e os documentos da virada, e já recebeu o `main` remoto por junção. Sem push e sem pull request.
- **Cópia de trabalho da correção do tema:** em `.claude/worktrees/pensive-williamson-7d726f`, na branch `fix/tema-na-web`, já integrada. Pode ser apagada pelo Tiago.
- **Verificação:** `npm test` passa com 553 testes (549 no projeto "nativo" e 4 no "web"); `npx tsc --noEmit` sem erros; `npm run test:regras` passa com 25 (precisa de Java; rodado pela última vez em 08/10). Na primeira rodada depois de mudar a configuração do jest, 4 testes falharam e passaram na rodada seguinte, sem mudança de código; a causa provável é o cache frio estourando o tempo do primeiro teste de cada suíte, mas isso não foi confirmado.
- **Para rodar:** `npm run web` (porta 8081) e, para o celular, `npx expo start --port 8082`.

## Estado do Firebase (projeto `maragames-mobile`)

- **Conteúdo:** seed rodado em 08/10, versão `f870c2d83e2b`: 9 lições (4 medidas e 5 da trilha diária) e 70 questões. Restam 3 questões antigas, sem versão, que só saem com `npm run seed:conteudo -- --prune`.
- **Dados de teste:** duas contas, que ficam até a Fase 2 do plano (decisão D8). A do Tiago (pós em 06/10) tem 52 respostas, incluindo os tópicos GDD (08/10) e UX/UI (09/10) da trilha, e uma tentativa de reteste aberta. A de apelido Tiagopbc (pós em 08/10) tem 40 respostas. O contador do piloto está em 2.
- **Acesso:** `serviceAccountKey.json` (fora do git) permite ler pelo Admin SDK. O assistente só lê; apagar dados é com o Tiago.

## O que já funciona

O caminho do roteiro do piloto, que é o que o código ainda implementa: cadastro, perfil, termo, pré-teste, cartão e prática dos quatro tópicos, pós-teste, resultado, espera do reteste, tela "Seu dia 1", trilha de um tópico por dia e a trava do roteiro. O XP aparece na home, no "Seu dia 1" e na tela da sequência. O app tem a identidade da Beast Maragames, e `npm run exportar` gera as planilhas.

Conferido no app de verdade: na web, em tamanho de celular, nos dois temas; num iPhone, pelo Expo Go, em tema escuro (login, home, pergunta, cartão, "Seu dia 1"). O selo de XP da home e o "XP do pós-teste" foram vistos na web em 09/10; a tela da sequência com o XP, só em teste.

## O que falta

Está no item 24 de `docs/decisoes-tecnicas.md`, na ordem das fases do plano. Em resumo: a Fase 0 fecha com o push; as Fases 1 a 4 trocam o roteiro pelo ciclo da lição, a lista de lições e a home nova; as Fases 5 e 6 são Progresso e Perfil; a Fase 8, de conteúdo, pode andar em paralelo.

## Limites do assistente nesta máquina

- Não cria conta nem digita senha em serviço de login externo, e o Firebase Auth é um.
- **Sessão logada no painel do navegador.** A sessão do painel do navegador não passa de uma conversa para outra: em 09/10, numa conversa nova, `http://localhost:8081` abriu no login. A saída foi o Chrome do Tiago, pela extensão, onde a conta dele está logada em `http://localhost:8081` (a conta Tiagopbc estava em `http://127.0.0.1:8081`). Antes de conferir qualquer tela logada, abrir o painel e ver se cai na home ou no login; se cair no login, pedir ao Tiago para entrar, e não tentar entrar por conta própria.
- Para ver o login sem deslogar ninguém, abrir `http://127.0.0.1:8081` no painel: é outro endereço para o navegador, então não enxerga a sessão de `localhost`.
- Não apaga dados em definitivo. Para a limpeza, escreve um script que primeiro lista, e o Tiago roda.
- O protótipo do Figma foi corrigido à mão pelo Tiago em 08/10; a integração do assistente com o Figma estava barrada pelo limite do plano.

## Prazos

Cancelados em 09/10, por decisão do Tiago. O projeto passou a seguir `docs/plano-do-app-completo.md`: app completo, com lições livres e medição por tópico, em fases sem data. O plano foi aprovado pelo Tiago no mesmo dia.
