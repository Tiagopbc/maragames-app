// Limpa os dados de teste de contas escolhidas, para o app começar do zero com elas.
//
// Por padrão, SÓ LISTA: mostra cada conta, com quantas respostas e tentativas tem, e não
// apaga nada. Para apagar, é preciso dizer de quais contas, pelo e-mail, e pedir com --apagar:
//
//   node scripts/limpar-dados-de-teste.js
//   node scripts/limpar-dados-de-teste.js --email a@exemplo.com --email b@exemplo.com
//   node scripts/limpar-dados-de-teste.js --email a@exemplo.com --apagar
//
// O que --apagar faz, só nas contas citadas: apaga as respostas (`answers`) e as tentativas
// (`attempts`) delas e tira do perfil o aceite do termo (`formaPre` e `consentiuEm`). O perfil e
// o login continuam. Com --zerar-contador, apaga também `piloto/contador`, para a próxima pessoa
// a aceitar o termo receber a forma A; só faz sentido quando nenhuma conta de verdade aceitou.
//
// Apagar não tem volta. Usa a chave de serviço (serviceAccountKey.json, fora do git).

const { readFileSync } = require('fs');
const { join } = require('path');

function argumentos(nome) {
    const valores = [];
    process.argv.forEach((arg, i) => {
        if (arg === `--${nome}` && process.argv[i + 1]) valores.push(process.argv[i + 1]);
    });
    return valores;
}

/** O que cada conta tem, a partir do que foi lido do banco. Função pura, para poder ser testada. */
function resumirContas(usuarios, respostas, tentativas) {
    const contar = (lista, uid) => lista.filter((x) => x.uid === uid).length;
    return usuarios
        .map((u) => ({
            uid: u.uid,
            email: u.email ?? '',
            apelido: u.apelido ?? '',
            aceitouOTermo: u.consentiuEm !== undefined && u.consentiuEm !== null,
            respostas: contar(respostas, u.uid),
            tentativas: contar(tentativas, u.uid),
        }))
        .sort((a, b) => a.email.localeCompare(b.email));
}

/** As contas pedidas pelo e-mail. E-mail que não é de ninguém é erro: nada é apagado por engano. */
function escolherContas(contas, emails) {
    const pedidos = emails.map((e) => e.trim().toLowerCase());
    const desconhecidos = pedidos.filter((e) => !contas.some((c) => c.email.toLowerCase() === e));
    if (desconhecidos.length > 0) throw new Error(`Nenhuma conta com o e-mail: ${desconhecidos.join(', ')}`);
    return contas.filter((c) => pedidos.includes(c.email.toLowerCase()));
}

async function apagarEmLotes(db, refs) {
    // O Firestore aceita até 500 escritas por lote.
    for (let i = 0; i < refs.length; i += 400) {
        const lote = db.batch();
        refs.slice(i, i + 400).forEach((ref) => lote.delete(ref));
        await lote.commit();
    }
}

async function main() {
    const { cert, initializeApp } = require('firebase-admin/app');
    const { FieldValue, getFirestore } = require('firebase-admin/firestore');

    const emails = argumentos('email');
    const apagar = process.argv.includes('--apagar');
    const zerarContador = process.argv.includes('--zerar-contador');
    if (apagar && emails.length === 0) throw new Error('Para apagar, diga de quais contas: --email a@exemplo.com');

    initializeApp({ credential: cert(JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'))) });
    const db = getFirestore();

    const [usuarios, respostas, tentativas, contador] = await Promise.all([
        db.collection('users').get(),
        db.collection('answers').get(),
        db.collection('attempts').get(),
        db.doc('piloto/contador').get(),
    ]);
    const contas = resumirContas(
        usuarios.docs.map((d) => ({ uid: d.id, ...d.data() })),
        respostas.docs.map((d) => d.data()),
        tentativas.docs.map((d) => d.data())
    );

    console.log(`Contas no banco: ${contas.length} · contador do termo: ${contador.exists ? contador.data().total : 'não existe'}`);
    for (const c of contas) {
        console.log(
            `  ${(c.email || '(sem e-mail)').padEnd(34)} ${c.apelido.padEnd(14)} termo: ${c.aceitouOTermo ? 'sim' : 'não'} · respostas: ${c.respostas} · tentativas: ${c.tentativas}`
        );
    }

    if (emails.length === 0) {
        console.log('\nNada foi apagado. Para limpar contas, passe --email e, depois de conferir, --apagar.');
        return;
    }

    const escolhidas = escolherContas(contas, emails);
    const uids = new Set(escolhidas.map((c) => c.uid));
    const refsDeRespostas = respostas.docs.filter((d) => uids.has(d.data().uid)).map((d) => d.ref);
    const refsDeTentativas = tentativas.docs.filter((d) => uids.has(d.data().uid)).map((d) => d.ref);

    console.log(`\nContas escolhidas: ${escolhidas.map((c) => c.email).join(', ')}`);
    console.log(`  respostas a apagar:  ${refsDeRespostas.length}`);
    console.log(`  tentativas a apagar: ${refsDeTentativas.length}`);
    console.log(`  aceite do termo a tirar do perfil: ${escolhidas.filter((c) => c.aceitouOTermo).length}`);
    if (zerarContador) console.log('  contador do termo: será apagado');

    if (!apagar) {
        console.log('\nNada foi apagado. Se a lista está certa, rode de novo com --apagar.');
        return;
    }

    await apagarEmLotes(db, [...refsDeRespostas, ...refsDeTentativas]);
    for (const uid of uids) {
        await db.doc(`users/${uid}`).update({ formaPre: FieldValue.delete(), consentiuEm: FieldValue.delete() });
    }
    if (zerarContador && contador.exists) await contador.ref.delete();
    console.log('\nLimpeza concluída.');
}

if (require.main === module) {
    main().then(
        () => process.exit(0),
        (e) => {
            console.error(e.message);
            process.exit(1);
        }
    );
}

module.exports = { resumirContas, escolherContas };
