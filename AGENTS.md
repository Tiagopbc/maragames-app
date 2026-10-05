# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Projeto maragames-app

App de Programação Mobile (UNDB) para a Beast Maragames. Grupo: Tiago Cavalcanti, Francisco André Santos, Jadson Câmara. Responda e comente em português.

## Escopo

App independente do maragames.app. Não há continuidade de lição entre dispositivos nem integração com o Supabase da cliente. O eixo do produto é medir aprendizagem com confiança declarada, validado num piloto antes de 14/11. Decisões de produto e interface são do grupo.

## Stack

React Native + Expo SDK 57 (compatível com Expo Go), Expo Router, TypeScript, Firebase (Auth + Firestore). Desenvolvimento em macOS.

## Regras de arquitetura

- Nenhuma tela ou componente importa Firebase. Acesso a dados só pela interface `ProgressRepository` (implementação atual: `FirebaseProgressRepository`).
- Navegação por estado da sessão: `src/app/_layout.tsx` usa `Stack.Protected` (deslogado, logado sem perfil, perfil completo). Não usar `router.push` depois de login ou de salvar perfil.
- Perfil completo é obrigatório, todos os campos. Validação em dobro: `src/lib/validacao.ts` (funções puras, UX) e `perfilValido()` no `firestore.rules` (garantia). Mudou uma, muda a outra.
- Comportamento diferente por plataforma vai em arquivo `.web.ts` (ex.: `firebase.ts` / `firebase.web.ts`), nunca `if (Platform.OS)` espalhado.
- Cores sempre do tema (`useTheme`), ícones de `@expo/vector-icons` tipados por `keyof typeof Ionicons.glyphMap`.

## Modelo de dados

- `answers` é evento imutável: uma resposta confirmada = um documento, nunca atualizado. Campos obrigatórios incluem `confianca` (1, 2 ou 3), `fase` (`pre`, `pratica`, `pos`, `reteste`), id da alternativa escolhida, `ordemExibida` e horário do servidor.
- Nada derivado é gravado: domínio, quadrante, XP, etapa do roteiro, nível da escada e sequência são calculados a partir de `answers`.
- `questions` é coleção própria, consultável por `topicId`. Conteúdo vem de `content/*.json` e vai ao Firestore só pelo script de seed (ids fixos, `versaoConteudo`). Não editar questões pelo console.
- `users/{uid}`: perfil, `formaPre` (A ou B, imutável depois de gravada), `consentiuEm`, dados do SUS.

## Regras de negócio

- Confiança: valor 1, 2, 3 no dado; rótulos "Palpite", "Tenho dúvida", "Tenho certeza" só na tela, num único arquivo de strings.
- Questão: alternativa e confiança são seleções independentes, em qualquer ordem; Confirmar só ativa com as duas. Sem opção de pular.
- Quadrante: confiança alta = nível 3; níveis 1 e 2 = baixa. Firme, Frágil, Lacuna, Ponto cego.
- XP (Gardner-Medwin): acerto 1/2/3, erro 0/−1/−4 por nível de confiança. Nos blocos pré, pós e reteste, nenhum feedback nem XP por questão; tudo aparece só no fim do bloco.
- Domínio por tópico = acerto simples, sem peso de confiança.
- Blocos medidos: só múltipla escolha, 4 alternativas, uma correta. Alternativas embaralhadas por semente (uid + questão + fase).
- Home: atalhos em array tipado (`ATALHOS`), formato de trilha livre, com botão principal "Continuar estudos" para a próxima etapa do roteiro; demais trilhas travadas em cinza claro durante o piloto.

## Fora de escopo por ora

Escada adaptativa, offline, segundo formato de questão, notificações push, painel de admin, validação de resposta no servidor.