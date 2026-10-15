# Plano de análise

Escrito em 15/10/2026, antes de qualquer dado do piloto (item 37 de `docs/decisoes-tecnicas.md`). Diz o que vai ser medido, como, e o que conta como evidência, para a leitura dos dados não ser escolhida depois de vê-los. O que mudar depois que os dados chegarem entra no fim deste arquivo, em "Desvios", com a data e o motivo, sem apagar o texto original.

Os números de "O que a simulação mostrou" vêm da base sintética (itens 35 a 37): turmas de alunos virtuais, com regras conhecidas, que servem para conferir se cada medida acusa efeito quando ele existe e só quando ele existe.

## O que fica fixo

- **Conteúdo**: versão `bd9ca4d71d9b`, gravada no Firestore em 15/10/2026. Uma questão mudada no meio do piloto muda a versão, e as respostas de antes e depois não se somam.
- **Quem entra**: quem aceitou o termo a partir do dia em que o piloto começar (`npm run relatorio -- --desde AAAA-MM-DD`), sem as contas de teste do grupo.
- **Unidade**: a pessoa. Toda conta de intervalo e de teste reamostra ou permuta pessoas, e não respostas, porque as respostas de uma mesma pessoa não são independentes.
- **Lição que conta**: a de ciclo completo, com o diagnóstico e a verificação completos. A revisão conta quando tem as três questões.
- **Cortes**: um percentual sobre menos de 10 respostas vira contagem (`AMOSTRA_MINIMA`); um grupo do "Por perfil" com menos de 5 pessoas vira contagem (`MINIMO_DE_PESSOAS_POR_GRUPO`). O ganho do resumo segue o mesmo corte.
- **Intervalos**: 95%, percentil, 2000 reamostras de pessoas, semente 1. Com menos de 30 pessoas, a página o chama de aproximado: a simulação mostrou que, com 15, ele exclui o zero mais vezes do que deveria.
- **Nível do teste**: 5%, bicaudal.

## Pergunta principal: a turma aprende?

**Medida.** O ganho de Hake da turma: do que faltava acertar no diagnóstico, a parte que passou a ser acertada na verificação, calculado sobre as somas de acertos da turma (item 35). A média do ganho de cada pessoa aparece ao lado, como leitura secundária, porque oscila mais com poucas questões por pessoa.

**Teste.** Permutação de sinais, pareado por pessoa (`testePorPermutacaoDeSinais`, em `src/lib/estatistica.ts`). A diferença de cada pessoa é o acerto na verificação menos o acerto no diagnóstico, nas lições com os dois. Se a lição não faz efeito, cada diferença tem a mesma chance de sair positiva ou negativa; o p é a fração das trocas de sinal com média tão longe de zero quanto a observada. Até 16 pessoas, todas as combinações; acima, 10 mil sorteios com semente fixa.

**O que conta como evidência.** Há evidência de que a turma aprende se o teste der p < 0,05. O ganho e o intervalo dizem o tamanho; o teste diz se há efeito. Sem grupo de controle, isso não separa o efeito da lição do efeito de ter feito o diagnóstico (ver "Limitações").

**O que a simulação mostrou** (100 réplicas de 100 alunos, sementes 1000 a 1099; 200 réplicas de 15 alunos, com 6 dias de estudo e uma lição nova por dia, sementes 20261014 em diante):

| | 100 alunos | 15 alunos |
|---|---|---|
| Falso positivo do teste (cenário nulo) | 2% | 5% |
| Poder do teste (cenário base) | 95% | 25% |
| Intervalo do ganho excluindo o zero no nulo | 3% | 9% |

Com 15 pessoas, o teste mantém o falso positivo no nominal, mas acha o ganho em uma de cada quatro turmas. O piloto de 15 é um estudo de viabilidade: um ganho, se aparecer, é indício.

## Perguntas secundárias

### A confiança diz alguma coisa? (calibração)

**Medida.** Na verificação, o acerto com confiança alta ("Tenho certeza") menos o acerto com confiança baixa ("Palpite" e "Tenho dúvida"), com intervalo. É o destaque da consciência do próprio saber, ao lado das barras de acerto por nível.

**Limite conhecido.** A calibração da turma mistura duas coisas: dentro de cada pessoa, a certeza acompanha o saber; entre pessoas, quem marca mais certeza pode saber mais ou menos. No cenário em que a certeza não depende de saber (confiança cega), com 100 alunos, o intervalo ainda exclui o zero em 19% das réplicas, e não em 5%. A leitura é descritiva: uma calibração grande (como os +23 pontos da base) diz que a confiança informa; uma pequena não diz nada.

### A certeza protege do esquecimento? (retenção corrigida pelo chute)

**Por que corrigir.** A comparação direta, Firmes contra Frágeis na revisão, dava, em média, +17 pontos em 20 turmas nulas de 100 alunos, em que ninguém esquece nada. Os Frágeis carregam os acertos no chute, que não têm o que reter e só se repetem por acaso, porque as alternativas mudam de ordem na revisão.

**Medida.** Para cada nível de confiança (alta e baixa), sai do acerto na verificação a fração sabida, k = (acerto − 0,25) / 0,75. O que se sabia e se manteve continua certo; o que se sabia e se esqueceu vira chute; o acerto no chute só se repete por acaso. Daí a retenção r só do que se sabia, de `mantidos / respostas = k·(r + (1 − r)·0,25) + (1 − k)·0,25²` (`retencaoCorrigida`). O número não é cortado em 0 e 100%. A medida é a diferença entre a retenção corrigida da confiança alta e a da baixa, com intervalo.

**O que a simulação mostrou.** Com 100 alunos, o intervalo da diferença exclui o zero em 5% das réplicas no nulo, 3% na base e 3% na confiança cega: a correção tirou o viés. No cenário em que a certeza protege de verdade (quem sabe e marca certeza esquece 70% menos), exclui o zero em só 15%, com 100 alunos; com 15, em 11%, igual ao nulo.

**Conclusão de antemão.** O piloto não responde a esta pergunta. A página mostra a estimativa e o intervalo, e o paper a declara como limite do desenho, a retomar com uma turma muito maior ou mais revisões por pessoa.

### A nota que a pessoa se dá bate com o que ela sabe? (autoavaliação)

**Medida.** Por módulo, a nota média de 1 a 5, de quem a deu antes do primeiro diagnóstico e fez o diagnóstico de alguma lição do módulo, ao lado do acerto dessas mesmas pessoas no diagnóstico, numa régua que começa no acaso (25%). Descritiva, sem teste.

## Análises exploratórias

Servem para levantar perguntas, e não para responder. Não têm teste, não têm correção para comparações múltiplas e não entram como resultado no paper.

- **Perfis de resposta** (`src/lib/perfis-de-resposta.ts`). Os limites atuais, a revisar depois do piloto: menos de 6 respostas, "poucas respostas"; mediana de tempo abaixo de 6 s e acerto até 40%, "responde no chute"; erro com certeza em 25% ou mais, "confiante demais"; acerto a partir de 75% com metade de acerto com certeza, "domina"; acerto a partir de 55% com certeza abaixo de 20%, "sabe, mas duvida"; acerto abaixo de 45%, "com dificuldade"; o resto, "em progresso".
- **Por perfil**: sexo, faixa etária, experiência, situação de estudo e aluno do site, com o ganho, a retenção e o ponto cego de cada grupo.
- **Conteúdo**: a lista de questões a rever, julgadas pelo acerto na verificação, com o distrator mais escolhido; e, à parte, as questões em que uma alternativa errada levou 80% ou mais dos erros do diagnóstico e da verificação, com pelo menos 8 erros (erros concentrados). Nas turmas com defeitos plantados (`--defeitos`, cinco turmas de 100, sementes 1250808581 e 1 a 4), o gabarito trocado ficou em 1º nas questões a rever todas as vezes; a questão ambígua, entre o 2º e o 8º, e fora da lista em alguns cenários da semente 1250808581; o distrator irresistível, que pesa em quem não sabe e mexe pouco no acerto da verificação, entrou nos erros concentrados em 4 das 5 turmas (na outra, a questão teve só 6 erros). Sem defeito plantado, de 0 a 3 questões por turma entram nos erros concentrados, por distratores que atraem mais por natureza: a lista é para conferir, e não um veredito.

## Limitações

- **Sem grupo de controle.** O ganho mistura o efeito da lição com o de ter feito o diagnóstico. As formas A e B, alternadas entre as pessoas, impedem que a mesma questão seja vista duas vezes, mas não substituem um controle.
- **Cada pessoa escolhe as lições.** O número de um tópico mistura a lição com quem a escolheu; a comparação justa é a de cada pessoa com ela mesma.
- **Amostra pequena.** Ver as tabelas acima.
- **O chute igual entre as alternativas.** A correção da retenção supõe que quem não sabe escolhe ao acaso entre as quatro. Um distrator que atrai mais quebra essa conta.
- **A revisão pelo relógio do aparelho.** O app libera a revisão pelo relógio do celular; a exportação conta, pelo horário do servidor, quantas foram feitas antes dos 7 dias.

## Depois do piloto

- Rever os limites dos perfis de resposta com os dados de verdade.
- Decidir se a calibração passa a ser medida dentro de cada pessoa, para não misturar pessoas (por ora, fica a da turma, decidido em 15/10).
- Rever o corte dos erros concentrados (80% e 8 erros) com os dados de verdade.

## Como reproduzir

```
npm run relatorio -- --simulado 100 --semente 1250808581            # as cinco páginas
npm run relatorio -- --simulado 100 --semente 1250808581 --defeitos # com os defeitos plantados
npm run relatorio -- --simulado 100 --semente 1000 --replicas 100   # as réplicas de 100
npm run relatorio -- --simulado 15 --semente 20261014 --replicas 200 --dias-de-estudo 6 --limite-diario
npm run relatorio -- --desde AAAA-MM-DD                              # os dados de verdade
```

## Desvios

Nenhum até agora.
