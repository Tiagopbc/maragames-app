# Passagem de sessão — 06/10/2026

Resumo para continuar o trabalho em outra conversa, sem depender do histórico desta. Em caso de conflito, vale `docs/decisoes-tecnicas.md` (as pendências vivem no item 24, e o protótipo, no item 28).

## Como retomar

Leia nesta ordem: `AGENTS.md`, o item 24 de `docs/decisoes-tecnicas.md` e este arquivo. Combinado com o Tiago: atacar as pendências na ordem do item 24 e, a cada item resolvido, atualizar a lista e mostrá-la na resposta.

## Estado do repositório

- **Branch:** `feat/roteiro-do-piloto`, com cinco commits desta sessão, sem push e sem pull request.
- **Sem commit:** o rodapé fixo da pergunta (`src/components/pergunta/seletor-confianca.tsx`, `tela-do-bloco.tsx` e o teste), a correção de `topicosMedidos` (`src/lib/bloco.ts` e o teste) e os dois documentos de `docs/`. Falta o Tiago dizer se quer commit a cada item e se pode dar push.
- **Verificação:** `npm test` passa com 253 testes; `npm run test:regras` passa com 25 (precisa de Java; sobe o emulador do Firestore sozinho); `npx tsc --noEmit` sem erros. Não há ESLint configurado.
- **Para rodar na web:** `npm run web` (porta 8081).

## O que já funciona

O dia 1 do roteiro, de ponta a ponta: login, perfil, home com "Continuar estudos" seguindo `etapaDoRoteiro`, termo de consentimento (forma A/B por contador em transação), pré-teste, cartão de conceito e prática de cada tópico, pós-teste, resultado de cada bloco e a linha de espera do reteste.

Foi percorrido em 06/10 com a conta do Tiago, na web em tamanho de celular: 40 eventos gravados (12 de pré na forma A, 16 de prática, 12 de pós na forma B), todos com os onze campos e `correta` batendo com o gabarito.

## Estado do Firebase (projeto `maragames-mobile`)

- **Regras:** publicadas em 06/10.
- **Conteúdo:** seed rodado em 06/10, versão `5d59872c96b3`: 4 lições com cartão e 40 questões.
- **Sobras do seed antigo:** 3 questões sem o campo `bloco` e a lição 5, sem tópico. Não atrapalham.
- **Dados de teste, a apagar antes do piloto:** na conta do Tiago, 40 respostas, 6 tentativas, `formaPre: A` e `consentiuEm`; e `piloto/contador` com `total: 1`. Se não forem apagados, o primeiro participante de verdade recebe a forma B.
- **Acesso:** a CLI do Firebase está logada na conta do Tiago, e `serviceAccountKey.json` (fora do git) permite ler e gravar pelo Admin SDK.

## Limites do assistente nesta máquina

- Não digita senha em serviço externo. Para ver o app logado no painel do navegador, o Tiago precisa entrar ele mesmo, e a sessão do painel não sobrevive entre uma rodada e outra.
- Tem acesso ao Figma pela conta do Tiago, mas em 06/10 a conexão recusou a leitura do arquivo: o plano Starter do Figma atingiu o limite de chamadas da integração. Enquanto isso valer, o assistente não lê nem edita o arquivo.

## Protótipo do Figma: onde corrigir e o quê

O protótipo é o arquivo do Figma "MaraGames App - Protótipo do piloto" (o PDF em `~/Downloads` foi exportado dele). São 12 telas: 1 login, 2 consentimento, 3 home do dia 1, 4 pergunta do pré-teste, 5 cartão, 6 feedback da prática, 7 relatório "Seu dia 1", 8 sequência da trilha, 9 espera do reteste, 10 login escuro, 11 pergunta escura, 12 relatório escuro.

Link do arquivo: https://www.figma.com/design/OPPSR056vzLH6vNTVBOxSi

O assistente tentou abrir o arquivo em 06/10 e foi barrado pelo limite de chamadas do plano Starter, então **nenhuma correção foi aplicada ainda**. Caminhos: aplicar à mão no Figma, seguindo a tabela abaixo; esperar o limite renovar ou mudar de plano; ou pedir ao assistente as telas corrigidas em HTML, para servirem de modelo. As correções, tela a tela:

| # | Ajuste | Telas | O que mudar |
|---|---|---|---|
| 1 | XP à vista | 6, 7, 12 | No feedback, "+3 XP" ao lado do selo. No relatório, o saldo real do pós-teste, que pode ser negativo: com os números da tela, "+18 XP". O jeito mais simples é um selo ao lado do título "Seu dia 1", copiado do selo "Sequência: 1 dia" da tela 3 |
| 2 | X para sair | 4, 5, 6, 11 | Um "✕" à esquerda do cabeçalho |
| 3 | Rodapé fixo | 4, 6, 11 | "Quanto você confia?", os três níveis em linha e o botão ficam presos embaixo, separados por uma linha fina; só enunciado, alternativas e feedback rolam. No feedback, o nível marcado fica travado no rodapé, com "Próxima questão" |
| 4 | Contagens | 7, 12 | Por tópico: MDA "1 de 3 → 3 de 3", Pixel Art "1 de 3 → 2 de 3", Engine "0 de 3 → 2 de 3", Lógica "1 de 3 → 2 de 3". Por confiança: Tenho certeza "6 de 7", Tenho dúvida "2 de 3", Palpite "1 de 2". Esses números fecham com os quadrantes da tela (6, 3, 2, 1) |
| 5 | Descrições do quadrante | 7, 12 | Iguais nos dois temas: Firme "Acertou com certeza", Frágil "Acertou sem certeza", Lacuna "Errou sem certeza", Ponto cego "Errou com certeza" |
| 6 | Senha | 1, 10 | "Mínimo 8 caracteres" |
| 7 | Estado de erro | tela nova | Feedback de resposta errada na prática: a escolhida em vermelho com "✕", a certa em verde, cartão "Você errou" com o selo "Ponto cego", "−4 XP", a explicação da escolha e "Resposta certa: …". Dá para duplicar a tela 6 e marcar a alternativa A como a escolhida errada: "Essa é a ordem do designer. Ele parte das regras; quem joga parte do que sente." |
| 8 | Logo e mascote | nenhuma | Nada a trocar. Decidido em 06/10: ficam os dois estilos, a logo no login (telas 1 e 10) e o lobo em cartum no consentimento e na sequência (telas 2 e 8) |

A logo em SVG está no artefato "Protótipo Maragames Mobile" do claude.ai (constante `LOGO`), nas cores `#3c2782`, `#b9201f` e `#beb1d7`. O mascote em cartum está em `~/Downloads/mascote-beast.png`. Quando o visual for para o app, entram os dois.

## Pendências, na ordem

### Antes de qualquer coisa

1. **[Tiago]** Aplicar à mão os ajustes no Figma (sete, já que o da logo virou "ficam os dois"), porque o arquivo do Figma é o que vai para o professor em 09/10 e a integração está barrada pelo limite do plano. O passo a passo foi dado na conversa de 06/10; a tabela da seção do protótipo tem a tela e o texto de cada ajuste.
2. **[Tiago]** Decidir sobre commits, push e pull request.
3. **[Tiago]** Entrar no painel do navegador para a conferência visual do rodapé fixo.

### Para a sessão 1 (app até 23/10, sessão até 30/10)

4. **[grupo]** Fechar os quatro pontos em que o protótipo contradiz decisões registradas:
   - Resultado do pré-teste só no fim do dia 1. O app mostra um resultado logo depois do pré (item 27). Recomendação: seguir o protótipo, porque feedback antes do estudo pode inflar o ganho. Se aprovado: o pré termina numa tela "Pré-teste concluído", sem números, e o relatório do dia 1 aparece depois do pós.
   - Relatório comparando pré e pós por tópico. O item 27 diz que não compara.
   - Consentimento logo depois do login, sem "Agora não". O item 22 o trata como etapa do roteiro, que a pessoa pode recusar.
   - Home sem os atalhos travados, com a lista "Seu roteiro" no lugar. O item 6 e o `AGENTS.md` pedem os atalhos.
5. **[código]** Aplicar no app o visual do protótipo, depois dos itens 1 e 4. Três tamanhos:
   - Aparência: paleta roxa e fonte Lexend em `src/constants/theme.ts`; estilo de `botao-principal.tsx`, `alternativa-item.tsx`, `seletor-confianca.tsx`, `selo-quadrante.tsx`; logo nas telas de login e de consentimento.
   - Comportamento: lista "Seu roteiro" na home, relatório único do dia 1, tela de espera.
   - Conteúdo: os cartões do protótipo têm diagrama e frase de destaque; hoje `SlideConceito` só tem `titulo` e `texto`, então `content/topicos.json`, o tipo e o seed precisam de campos novos.
6. **[código]** Barra de abas do template na web: flutua sobre o topo da home e cobre a saudação; ainda traz "Expo Starter", a aba "Explore" e o link "Docs". Está em `src/components/app-tabs.web.tsx`. Só afeta a web.
7. **[código]** Trava dos tópicos medidos entre o pós e o reteste (item 23). As rotas `cartao/[topicId]` e `bloco/pratica` abrem para quem digitar a URL, e também fora da ordem do roteiro. Sugestão: as duas rotas consultarem `etapaDoRoteiro` e só abrirem na etapa `estudo` daquele tópico.
8. **[código]** Tela de espera do reteste: relatório do dia 1, reaproveitando `src/components/resultado/resultado-do-bloco.tsx`, contagem dos dias e a lista de tópicos travados com o motivo, como na tela 9 do protótipo. Hoje a home só mostra "O reteste abre em N dias".
9. **[código]** Limpeza antes do piloto: tirar os links de desenvolvimento da home (`BLOCOS_MEDIDOS` em `src/app/(app)/(tabs)/index.tsx`) e apagar os dados de teste listados acima.
10. **[grupo]** Sobras do seed antigo: rodar ou não `npm run seed:conteudo -- --prune`.

### Para a sessão 2 (reteste entre 06/11 e 10/11)

11. **[código]** Tela do SUS. `susRespondidoEm` e as notas entram no tipo `Perfil`, em `participanteDoRoteiro` e nas regras; `destinoDaEtapa` ganha o destino da etapa `sus`. Depende de o grupo escolher a versão em português e decidir se há pergunta aberta.
12. **[código]** Cálculo de retenção, acerto no reteste dividido pelo acerto no pós, em função pura com teste.

### Trilha diária, dias 2 a 6 (M5, item 23)

13. **[conteúdo]** Os cinco tópicos (GDD, UX/UI em jogos, Efeitos sonoros, Playtest e iteração, Publicando na Steam), com cartão curto e 5 a 6 questões de prática cada. `content/` só tem os quatro medidos.
14. **[código]** Limite de um tópico por dia de calendário, sequência de dias que zera se pular um dia e tela "volte amanhã", como na tela 8 do protótipo.

### Restante do M4

15. **[código]** Telas "Meu domínio" e "Detalhe do tópico". `dominioPorTopico` já existe em `src/lib/dominio.ts`.

### Exportação (M7)

16. **[código]** Script com Admin SDK que gera o CSV de eventos com um código no lugar de nome e contato, e os indicadores agregados do item 23.

### Qualidade

17. **[código]** Testes de emulador para as regras de `answers` e `attempts`, no molde de `regras/consentimento.test.ts`.
18. **[código]** Configurar o ESLint (`npm run lint` hoje não roda).
19. **[código]** Destino dos atalhos Lições, Progresso e Perfil, para depois do piloto.

### Decisões do grupo

20. Ordem dos tópicos no dia 1: o protótipo e o item 23 dizem MDA, Pixel Art, Engine, Lógica; o app segue o `lessonOrder` de `content/topicos.json` (MDA, Engine, Lógica, Pixel Art). Mudar é editar o JSON e rodar o seed.
21. Dias do reteste: o app implementa 7 a 9 dias depois do dia do pós; o protótipo sugere um dia antes. São duas constantes em `src/lib/roteiro.ts`.
22. Texto do termo (`src/constants/termo.ts` é rascunho; o do protótipo é mais curto) e se ele promete apagar os dados de quem sair.
23. Quem escreve e quem revisa o conteúdo, até 23/10.
24. Participantes (meta de 15), SUS em português e pergunta aberta.

### Dependem de fora

25. Distribuição do app (Expo Go, build web ou EAS): consultar o professor.
26. Data do Incubators.

## Prazos

- 09/10: protótipo no Figma.
- 16/10: relatório de evolução com prints do app.
- 23/10: app com M2 a M5 e conteúdo revisado.
- 30/10: sessão 1 do piloto. Reteste entre 06/11 e 10/11.
- 14/11: apresentação ao cliente, com análise.
