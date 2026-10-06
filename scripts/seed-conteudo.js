// Espelha o conteúdo versionado em content/ no Firestore.
//
//   content/topicos.json   tópicos do piloto, a lição de cada um e o cartão de conceito
//   content/questoes.json  banco de questões (forma A, forma B e prática)
//
// O JSON é a fonte da verdade: para mudar uma questão, edite o JSON, faça commit e rode
// o script de novo. Os ids são fixos, então rodar duas vezes atualiza em vez de duplicar.
//
// Uso:
//   node scripts/seed-conteudo.js --dry-run   só valida e mostra o que faria (não precisa de credencial)
//   node scripts/seed-conteudo.js             valida e grava
//   node scripts/seed-conteudo.js --prune     grava e apaga questões que não estão mais no JSON
//
// Sem --prune, questões antigas são só listadas: apagar uma questão que já tem respostas
// em `answers` deixaria essas respostas sem a questão de origem.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const BLOCOS = ['forma_a', 'forma_b', 'pratica'];
const DIFICULDADES = ['basico', 'intermediario', 'avancado'];
const ALTERNATIVAS = ['a', 'b', 'c', 'd'];
const TRILHAS = ['medido', 'diaria']; // medido: pré, pós e reteste; diaria: um tópico por dia, só prática
const MIN_PRATICA_DIARIA = 5;

function lerJson(nome) {
    const bruto = fs.readFileSync(path.join(CONTENT_DIR, nome), 'utf8');
    return { dados: JSON.parse(bruto), bruto };
}

function textoOk(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

function validar(topicos, questoes) {
    const erros = [];

    const topicIds = new Set();
    const ordens = new Set();
    const posicoes = new Set();
    const trilhaDoTopico = {};
    for (const t of topicos) {
        if (!textoOk(t.topicId)) erros.push('tópico sem topicId');
        if (topicIds.has(t.topicId)) erros.push(`topicId repetido: ${t.topicId}`);
        topicIds.add(t.topicId);
        if (!Number.isInteger(t.lessonOrder)) erros.push(`${t.topicId}: lessonOrder deve ser inteiro`);
        if (ordens.has(t.lessonOrder)) erros.push(`lessonOrder repetido: ${t.lessonOrder}`);
        ordens.add(t.lessonOrder);
        if (!textoOk(t.titulo)) erros.push(`${t.topicId}: sem título`);
        if (!Number.isInteger(t.ordem)) erros.push(`${t.topicId}: ordem de apresentação deve ser inteiro`);
        if (posicoes.has(t.ordem)) erros.push(`ordem de apresentação repetida: ${t.ordem}`);
        posicoes.add(t.ordem);
        if (!TRILHAS.includes(t.trilha)) erros.push(`${t.topicId}: trilha inválida (${t.trilha})`);
        trilhaDoTopico[t.topicId] = t.trilha;
        if (!Array.isArray(t.cartao) || t.cartao.length === 0) {
            erros.push(`${t.topicId}: cartão vazio`);
        } else {
            t.cartao.forEach((s, i) => {
                if (!textoOk(s.titulo) || !textoOk(s.texto)) erros.push(`${t.topicId}: slide ${i + 1} sem título ou texto`);
            });
        }
    }

    const ids = new Set();
    for (const q of questoes) {
        const tag = q.id || '(sem id)';
        if (!/^[a-z0-9_]+$/.test(q.id || '')) erros.push(`${tag}: id deve ter só minúsculas, números e _`);
        if (ids.has(q.id)) erros.push(`id repetido: ${q.id}`);
        ids.add(q.id);
        if (!topicIds.has(q.topicId)) erros.push(`${tag}: topicId desconhecido (${q.topicId})`);
        if (!BLOCOS.includes(q.bloco)) erros.push(`${tag}: bloco inválido (${q.bloco})`);
        if (trilhaDoTopico[q.topicId] === 'diaria' && q.bloco !== 'pratica') {
            erros.push(`${tag}: tópico da trilha diária só tem questões de prática`);
        }
        if (!DIFICULDADES.includes(q.dificuldade)) erros.push(`${tag}: dificuldade inválida (${q.dificuldade})`);
        if (q.formato !== 'multipla_escolha') erros.push(`${tag}: no piloto só há multipla_escolha`);
        if (!textoOk(q.enunciado)) erros.push(`${tag}: enunciado vazio`);

        const alts = Array.isArray(q.alternativas) ? q.alternativas : [];
        const letras = alts.map((a) => a.id).sort().join('');
        if (letras !== ALTERNATIVAS.join('')) erros.push(`${tag}: precisa das alternativas a, b, c e d (tem "${letras}")`);
        const corretas = alts.filter((a) => a.correta === true).length;
        if (corretas !== 1) erros.push(`${tag}: precisa de exatamente 1 correta (tem ${corretas})`);
        alts.forEach((a) => {
            if (typeof a.correta !== 'boolean') erros.push(`${tag}/${a.id}: correta deve ser booleano`);
            if (!textoOk(a.texto) || !textoOk(a.explicacao)) erros.push(`${tag}/${a.id}: sem texto ou explicação`);
        });
    }

    // Desenho do piloto: nos tópicos medidos, as formas A e B são paralelas, uma questão de
    // cada dificuldade. Nos tópicos da trilha diária, só prática, com um mínimo por dia.
    for (const t of topicIds) {
        const doTopico = questoes.filter((q) => q.topicId === t);
        if (trilhaDoTopico[t] === 'diaria') {
            const n = doTopico.filter((q) => q.bloco === 'pratica').length;
            if (n < MIN_PRATICA_DIARIA) erros.push(`${t}: trilha diária precisa de pelo menos ${MIN_PRATICA_DIARIA} questões (tem ${n})`);
            continue;
        }
        for (const bloco of ['forma_a', 'forma_b']) {
            const difs = doTopico.filter((q) => q.bloco === bloco).map((q) => q.dificuldade).sort().join(',');
            if (difs !== [...DIFICULDADES].sort().join(',')) {
                erros.push(`${t}: ${bloco} deve ter uma questão básica, uma intermediária e uma avançada (tem: ${difs || 'nenhuma'})`);
            }
        }
        if (!doTopico.some((q) => q.bloco === 'pratica')) erros.push(`${t}: sem questões de prática`);
    }

    return erros;
}

function resumo(topicos, questoes) {
    for (const t of [...topicos].sort((a, b) => a.ordem - b.ordem)) {
        const qs = questoes.filter((q) => q.topicId === t.topicId);
        const conta = (b) => qs.filter((q) => q.bloco === b).length;
        console.log(
            `  ${t.ordem}. ${t.titulo} (${t.trilha}, lição ${t.lessonOrder}): ${t.cartao.length} slides, ` +
            `${conta('forma_a')} forma A, ${conta('forma_b')} forma B, ${conta('pratica')} prática`,
        );
    }
}

async function gravar(topicos, questoes, versao, prune) {
    const { initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore, FieldValue } = require('firebase-admin/firestore');
    const serviceAccount = require('../serviceAccountKey.json');

    initializeApp({ credential: cert(serviceAccount) });
    const db = getFirestore();

    // Lições: acha pela ordem; cria se não existir.
    const snap = await db.collection('lessons').get();
    const porOrdem = new Map(snap.docs.map((d) => [d.data().order, d.ref]));
    const lessonIdDoTopico = {};

    for (const t of topicos) {
        let ref = porOrdem.get(t.lessonOrder);
        if (!ref) {
            ref = db.collection('lessons').doc();
            await ref.set({ order: t.lessonOrder, createdAt: FieldValue.serverTimestamp() });
            console.log(`  lição ${t.lessonOrder} não existia: criada (${ref.id})`);
        }
        await ref.set(
            {
                title: t.titulo,
                topicId: t.topicId,
                ordem: t.ordem,
                trilha: t.trilha,
                modulo: t.modulo || null,
                cartao: t.cartao,
                versaoConteudo: versao,
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
        lessonIdDoTopico[t.topicId] = ref.id;
    }

    // Questões: id fixo vindo do JSON; set() sem merge substitui o documento inteiro.
    const ordemNoTopico = {};
    let batch = db.batch();
    let pendentes = 0;
    for (const q of questoes) {
        ordemNoTopico[q.topicId] = (ordemNoTopico[q.topicId] || 0) + 1;
        batch.set(db.collection('questions').doc(q.id), {
            lessonId: lessonIdDoTopico[q.topicId],
            topicId: q.topicId,
            order: ordemNoTopico[q.topicId],
            bloco: q.bloco,
            dificuldade: q.dificuldade,
            formato: q.formato,
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            fonte: q.fonte || null,
            versaoConteudo: versao,
            updatedAt: FieldValue.serverTimestamp(),
        });
        if (++pendentes === 400) {
            await batch.commit();
            batch = db.batch();
            pendentes = 0;
        }
    }
    if (pendentes > 0) await batch.commit();
    console.log(`  ${questoes.length} questões gravadas`);

    // Questões no banco que saíram do JSON.
    const noJson = new Set(questoes.map((q) => q.id));
    const todas = await db.collection('questions').get();
    const orfas = todas.docs.filter((d) => !noJson.has(d.id));
    if (orfas.length === 0) return;

    console.log(`  ${orfas.length} questão(ões) no Firestore fora do JSON: ${orfas.map((d) => d.id).join(', ')}`);
    if (!prune) {
        console.log('  (mantidas; rode com --prune para apagar)');
        return;
    }
    for (const d of orfas) {
        const respostas = await db.collection('answers').where('questionId', '==', d.id).limit(1).get();
        if (!respostas.empty) {
            console.log(`  ${d.id}: tem respostas registradas, NÃO apagada`);
            continue;
        }
        await d.ref.delete();
        console.log(`  ${d.id}: apagada`);
    }
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const prune = process.argv.includes('--prune');

    const topicos = lerJson('topicos.json');
    const questoes = lerJson('questoes.json');

    const erros = validar(topicos.dados, questoes.dados);
    if (erros.length > 0) {
        console.error(`Conteúdo inválido (${erros.length} problema(s)):`);
        erros.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
    }

    // Versão = hash do conteúdo. Fica gravada em cada documento, para o paper poder
    // dizer exatamente qual versão das questões o piloto usou.
    const versao = crypto
        .createHash('sha256')
        .update(topicos.bruto)
        .update(questoes.bruto)
        .digest('hex')
        .slice(0, 12);

    console.log(`Conteúdo válido · versão ${versao}`);
    resumo(topicos.dados, questoes.dados);

    if (dryRun) {
        console.log('Dry run: nada foi gravado.');
        return;
    }
    await gravar(topicos.dados, questoes.dados, versao, prune);
    console.log('Seed de conteúdo concluído.');
}

if (require.main === module) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { validar };
