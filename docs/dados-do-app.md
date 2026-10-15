# O que o app grava e como vira relatório

Explicação curta do caminho dos dados, de quem responde até a página da Beast Maragames. As decisões e o raciocínio estão em `docs/decisoes-tecnicas.md` (itens 23, 34, 35 e 36).

## O que uma pessoa grava ao usar o app

São quatro coleções no Firestore. Nada além disso é gravado: domínio, quadrante, XP, ganho, retenção e sequência são sempre calculados a partir delas.

1. **`users/{uid}`**, ao completar o perfil e aceitar o termo: o núcleo do perfil (nome, apelido, telefone, faixa etária, sexo, cidade, UF, situação de estudo, experiência em criar jogos; instituição e curso de quem faz graduação ou pós), as respostas opcionais de "Sobre você e os jogos", o aceite de contato, a forma do diagnóstico (`formaPre`, A ou B) e o horário do aceite (`consentiuEm`).
2. **`selfAssessments/{uid}`**, uma vez, antes do primeiro diagnóstico: a nota de 1 a 5 que a pessoa se dá em cada um dos 6 módulos.
3. **`attempts`**, uma por passo de lição (diagnóstico, prática, verificação, revisão): o tópico, a fase, as questões já respondidas, se terminou, a plataforma (web, android, ios) e a versão do app.
4. **`answers`**, uma por questão confirmada, que nunca muda: questão, tópico, tentativa, fase (`pre`, `pratica`, `pos`, `reteste`), alternativa escolhida, a ordem em que as alternativas apareceram, se acertou, a confiança (1 Palpite, 2 Tenho dúvida, 3 Tenho certeza), o tempo até confirmar e o horário do servidor.

Exemplo de uma resposta (da turma virtual):

```json
{ "uid": "virtual-001", "questionId": "escolha_de_engine_02", "topicId": "escolha_de_engine",
  "fase": "pos", "escolha": "b", "ordemExibida": ["a", "b", "c", "d"],
  "correta": true, "confianca": 1, "tempoMs": 11377, "respondidaEm": 1787766273288 }
```

## Das coleções às tabelas

`npm run exportar` lê as quatro coleções e, com as mesmas funções que o app usa (`src/lib/exportacao.ts`), monta as tabelas da análise do grupo. Cada pessoa vira um código (P01, P02...); `chave.csv` liga o código ao nome e não sai do grupo.

| Tabela | Uma linha por | O que traz |
|---|---|---|
| `participantes.csv` | pessoa | o perfil, as lições começadas, verificadas e revisadas, os acertos antes e depois, o ganho, Firmes e Frágeis, as respostas da verificação revisada com confiança alta e baixa, os dias ativos |
| `licoes.csv` | pessoa e lição | antes, depois, revisão, ganho, retenção, Firmes e Frágeis daquela lição |
| `eventos.csv` | resposta | a resposta com o quadrante, o XP, a posição escolhida na tela e a plataforma |
| `questoes.csv` | questão | o acerto geral e por fase (diagnóstico e verificação), os pontos cegos e o distrator mais escolhido |
| `autoavaliacao.csv` | nota | o módulo, a nota e se ela veio antes do primeiro diagnóstico |
| `resumo.md` | — | os números em conjunto, em texto |

## Das tabelas ao relatório

`npm run relatorio` parte das mesmas tabelas e monta uma página só, com números em conjunto e sem dado de pessoa nenhuma: aprendizagem (antes, depois e revisão, com o ganho da turma, o intervalo de 95% e o teste pareado), consciência do próprio saber (acerto por confiança, calibração e quadrantes), retenção (Firmes e Frágeis, e a retenção corrigida pelo chute em cada nível de confiança), perfis de resposta, autoavaliação, resultados por perfil (grupo com menos de 5 pessoas mostra só a contagem), engajamento, conteúdo (questões a rever, julgadas na verificação) e quem respondeu.

## O banco fictício

A turma de alunos virtuais passa pelo mesmo caminho, sem tocar o Firestore:

- `npm run exportar -- --simulado 100 --semente 1250808581` grava em `exportacao/simulado-1250808581/` as mesmas tabelas e `dados-brutos.json`, com as quatro coleções no formato do app.
- `npm run relatorio -- --simulado 100 --semente 1250808581` gera a página dessa mesma turma.

Em `dados-brutos.json`, cada perfil em `users` tem o núcleo obrigatório do app, com valores que não são de ninguém: telefone com DDD 20, que não existe no Brasil, "Cidade virtual" e, para quem faz graduação ou pós, "Instituição virtual" e "Curso virtual". A mesma semente dá sempre os mesmos alunos e as mesmas respostas. Na semente 1250808581: 100 perfis, 100 autoavaliações, 1.015 tentativas e 3.632 respostas (882 de diagnóstico, 1.436 de prática, 822 de verificação e 492 de revisão).
