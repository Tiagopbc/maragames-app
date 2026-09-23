const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// index 0..4 = order 1..5, na sequência do protótipo:
// 1 Game Design | 2 Game Engines | 3 Programação | 4 Arte | 5 Áudio
const QUESTOES = {
    1: {
        lessonTitle: 'O framework MDA',
        topicId: 'mda_framework',
        enunciado: 'O designer constrói um jogo em uma ordem, e o jogador o experimenta na ordem inversa. Qual sequência descreve a experiência de quem joga?',
        alternativas: [
            { id: 'a', texto: 'Estética → Dinâmica → Mecânica', correta: true, explicacao: 'Correto. O jogador sente primeiro a emoção (tensão, descoberta), depois percebe os padrões de jogo que a causam, e só então entende as regras por trás.' },
            { id: 'b', texto: 'Mecânica → Dinâmica → Estética', correta: false, explicacao: 'Essa é a ordem do designer, não a do jogador. Ele parte das regras; quem joga parte do que sente.' },
            { id: 'c', texto: 'Dinâmica → Mecânica → Estética', correta: false, explicacao: 'A dinâmica é o comportamento que emerge das regras durante a partida, então nunca vem antes delas na construção nem primeiro na percepção.' },
            { id: 'd', texto: 'Mecânica → Estética → Dinâmica', correta: false, explicacao: 'Inverte as duas pontas. A estética é o resultado final da cadeia, não um passo do meio.' },
        ],
    },
    2: {
        lessonTitle: 'Escolhendo a engine certa',
        topicId: 'escolha_de_engine',
        enunciado: 'Você vai desenvolver sozinho um jogo 2D em pixel art, quer publicar direto na web e não pode pagar licença nem royalties. Qual engine atende melhor esse cenário?',
        alternativas: [
            { id: 'a', texto: 'Unreal Engine', correta: false, explicacao: 'Voltada para 3D de alta fidelidade, pesada para um dev solo, e cobra royalty sobre a receita acima de um limite.' },
            { id: 'b', texto: 'Godot', correta: true, explicacao: 'Correto. É open source sob licença MIT, sem royalties, tem nós 2D de primeira classe e exporta para HTML5 sem camada extra.' },
            { id: 'c', texto: 'Unity', correta: false, explicacao: 'Exporta para web, mas o runtime é pesado para pixel art simples e o licenciamento passou por mudanças que geram insegurança em projeto pequeno.' },
            { id: 'd', texto: 'CryEngine', correta: false, explicacao: 'Não tem fluxo de trabalho 2D consolidado e é a opção menos indicada para pixel art.' },
        ],
    },
    4: {
        lessonTitle: 'Escala e integridade do pixel',
        topicId: 'escala_de_sprites',
        enunciado: 'Seu sprite foi desenhado em 32×32 e precisa aparecer maior na tela. Por que a escala deve ser feita em múltiplos inteiros, como 2x ou 3x?',
        alternativas: [
            { id: 'a', texto: 'Porque reduz o tamanho do arquivo final', correta: false, explicacao: 'A escala acontece na hora de desenhar na tela e não altera o arquivo do sprite.' },
            { id: 'b', texto: 'Porque escala fracionária faz alguns pixels virarem retângulos e quebra a grade da arte', correta: true, explicacao: 'Correto. Em 1,5x um pixel vira um bloco de 1,5 pixel, que não existe. A GPU arredonda de forma desigual e o resultado é uma imagem com pixels de tamanhos diferentes.' },
            { id: 'c', texto: 'Porque a GPU só aceita potências de 2', correta: false, explicacao: 'Essa restrição valia para texturas em hardware antigo, e mesmo lá tratava da dimensão da textura, não do fator de escala.' },
            { id: 'd', texto: 'Porque múltiplos inteiros aumentam a taxa de quadros', correta: false, explicacao: 'O ganho de desempenho é irrelevante. O motivo é visual, não de performance.' },
        ],
    },
};

async function seed() {
    const snap = await db.collection('lessons').orderBy('order').get();

    if (snap.size !== 5) {
        console.warn(`Esperava 5 lições, encontrei ${snap.size}. Confere a coleção antes de continuar.`);
    }

    for (const doc of snap.docs) {
        const order = doc.data().order;
        const q = QUESTOES[order];

        if (!q) {
            console.log(`Lição order=${order} (${doc.id}): sem questão múltipla-escolha disponível ainda (formato pertence ao M6). Pulando.`);
            continue;
        }

        // atualiza o título da lição pro nome real do módulo
        await doc.ref.update({ title: q.lessonTitle });

        // insere a questão na coleção separada, com id determinístico pro seed ser idempotente
        await db.collection('questions').doc(`${doc.id}_${q.topicId}`).set({
            lessonId: doc.id,
            topicId: q.topicId,
            order: 1,
            formato: 'multipla_escolha',
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`Lição order=${order} (${doc.id}): título atualizado e questão inserida.`);
    }

    console.log('Seed de questions concluído.');
}

seed();
