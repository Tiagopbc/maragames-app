# Passagem de sessão — 09/10/2026

Resumo para continuar o trabalho em outra conversa, sem depender do histórico da anterior. Em caso de conflito, vale `docs/decisoes-tecnicas.md` (as pendências vivem no item 24).

## Como retomar

Leia nesta ordem: `AGENTS.md`, este arquivo e o item 24 de `docs/decisoes-tecnicas.md`.

Combinados com o Tiago, que valem para toda sessão:

- Atacar as pendências na ordem do item 24 e, a cada item resolvido, atualizar a lista e mostrá-la na resposta.
- Antes de codar qualquer tela ou mudança de comportamento, apresentar o desenho e esperar a aprovação.
- Escrever o teste antes do código e vê-lo falhar.
- Nada que vai para o GitHub leva assinatura ou crédito do assistente: nem em commit, nem em pull request, nem em comentário.
- Perguntar antes de dar push e antes de abrir pull request. A liberação de "pode enviar sempre" valia só para o pull request nº 5, já integrado.
- Não rodar `npm run lint`: ele instala o ESLint e altera `package.json` e o lockfile.

## O que está esperando resposta do Tiago

1. **XP à vista (achado de 09/10, ainda sem código).** O Tiago acertou as 6 questões do tópico UX/UI e não viu o XP mudar. O dado está certo no banco (+18 XP); o que falta é mostrar. Proposta apresentada, aguardando aprovação:
   - Tela da sequência (`src/components/trilha/fim-do-topico.tsx`): mostrar o XP do tópico ao lado dos acertos, por exemplo "Você acertou 6 de 6 questões de UX/UI em jogos · +18 XP".
   - Tela "Seu dia 1": trocar "XP do bloco" por "XP do pós-teste" nessa tela, porque ela é o retrato do pós e não muda com a trilha.
   - Home: um selo com o total acumulado ("XP: +10") ao lado da saudação. A soma já existe em `src/lib/xp.ts` (`somarXp`); falta mostrar. Cuidado: se o grupo decidir esconder o resultado do pré-teste, o selo só aparece depois do pós.
2. **Push e pull request da branch `fix/exportacao-pasta-e-aviso`.** Ela tem commits só locais. Se o XP for aprovado, entra no mesmo pull request.
3. **Testes no emulador das regras de `answers` e `attempts`**, no molde de `regras/consentimento.test.ts`. É o item de código que não depende do grupo.

## Estado do repositório

- **`main`:** tem o pull request nº 5 integrado em 09/10 (roteiro do dia 1, trava, espera do reteste, identidade visual, trilha diária, exportação).
- **Branch atual, só local:** `fix/exportacao-pasta-e-aviso`, saída do `main`. Traz os dois ajustes do script de exportação e a atualização dos docs. Sem push e sem pull request.
- **Outra sessão:** a correção das cores presas ao trocar de tema com o app aberto está na branch `claude/pensive-williamson-7d726f` (cópia em `.claude/worktrees/`), que saiu de um commit antigo e ainda não entrou no `main`.
- **Verificação:** `npm test` passa com 532 testes; `npx tsc --noEmit` sem erros; `npm run test:regras` passa com 25 (precisa de Java; rodado pela última vez em 08/10).
- **Para rodar:** `npm run web` (porta 8081) e, para o celular, `npx expo start --port 8082`.

## Estado do Firebase (projeto `maragames-mobile`)

- **Conteúdo:** seed rodado em 08/10, versão `f870c2d83e2b`: 9 lições (4 medidas e 5 da trilha diária) e 70 questões. Restam 3 questões antigas, sem versão, que só saem com `npm run seed:conteudo -- --prune`.
- **Dados de teste, a apagar antes do piloto:** duas contas. A do Tiago (pós em 06/10) tem 52 respostas, incluindo os tópicos GDD (08/10) e UX/UI (09/10) da trilha, e uma tentativa de reteste aberta. A de apelido Tiagopbc (pós em 08/10) tem 40 respostas. O contador do piloto está em 2.
- **Acesso:** `serviceAccountKey.json` (fora do git) permite ler pelo Admin SDK. O assistente só lê; apagar dados é com o Tiago.

## O que já funciona

O caminho inteiro do participante: cadastro, perfil, termo, pré-teste, cartão e prática dos quatro tópicos, pós-teste, resultado, espera do reteste com contagem e datas, tela "Seu dia 1", trilha diária (um tópico por dia, sequência de dias, tela da sequência) e a trava que só deixa abrir a tela da etapa. O app tem a identidade da Beast Maragames, e `npm run exportar` gera as planilhas do piloto.

Conferido no app de verdade: na web, em tamanho de celular, nos dois temas; num iPhone, pelo Expo Go, em tema escuro (login, home, pergunta, cartão, "Seu dia 1").

## O que falta, por quem

- **Grupo:** as cinco decisões de tela (resultado do pré só no fim, relatório comparando pré e pós, termo logo após o login, lista "Seu roteiro" na home, seção "O que revisar primeiro" na tela do dia 1); texto final do termo; versão em português do SUS; participantes; nome de exibição do app; forma de distribuição, com o professor.
- **Tiago:** testar num Android; ver o mascote no consentimento e o tema claro num aparelho; abrir um CSV exportado no Excel.
- **Código, depois das decisões:** ajustar as telas conforme as cinco respostas; tela do SUS.
- **Véspera do piloto:** tirar os links de desenvolvimento da home e a exceção da trava (`travaVale`); apagar os dados de teste.
- **Depois do piloto:** `npm run exportar -- --desde 2026-10-30`, análise e apresentação.

## Limites do assistente nesta máquina

- Não cria conta nem digita senha em serviço de login externo, e o Firebase Auth é um. O painel do navegador do app guarda a sessão do Tiago em `http://localhost:8081`; a conta Tiagopbc está logada no Chrome dele em `http://127.0.0.1:8081`.
- Não apaga dados em definitivo. Para a limpeza, escreve um script que primeiro lista, e o Tiago roda.
- O protótipo do Figma foi corrigido à mão pelo Tiago em 08/10; a integração do assistente com o Figma estava barrada pelo limite do plano.

## Prazos

- 16/10: relatório de evolução com prints do app.
- 23/10: app completo e conteúdo revisado.
- 30/10: sessão 1 do piloto. Reteste entre 06/11 e 10/11.
- 14/11: apresentação ao cliente, com análise.
