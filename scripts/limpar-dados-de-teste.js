// Limpa os dados de teste de contas escolhidas, para o app começar do zero com elas.
//
// Por padrão, SÓ LISTA: mostra cada conta, com quantas respostas e tentativas tem, e não
// apaga nada. Para apagar, é preciso dizer de quais contas, pelo e-mail, e pedir com --apagar:
//
//   node scripts/limpar-dados-de-teste.js
//   node scripts/limpar-dados-de-teste.js --email a@exemplo.com --email b@exemplo.com
//   node scripts/limpar-dados-de-teste.js --email a@exemplo.com --apagar
//   node scripts/limpar-dados-de-teste.js --email a@exemplo.com --apagar-conta --apagar
//
// O que --apagar faz, só nas contas citadas: apaga as respostas (`answers`), as tentativas
// (`attempts`) e as notas por módulo (`selfAssessments`) delas e tira do perfil o aceite do termo
// (`formaPre` e `consentiuEm`). O perfil e o login continuam. Sem as notas, quem aceitar o termo de
// novo com a conta dá as notas de novo, antes do primeiro diagnóstico (item 34).
//
// Com --apagar-conta, além disso, a conta some inteira: o perfil (`users/{uid}`) e o login (Firebase
// Auth). A lista mostra também quem só tem o login, sem perfil, para essas contas poderem ser
// apagadas. Com --zerar-contador, apaga também `piloto/contador`, para a próxima pessoa
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

/**
 * O que cada conta tem, a partir do que foi lido do banco. `notas` são os uids com notas por módulo
 * (o id de cada documento de `selfAssessments`); `logins`, os usuários do Firebase Auth. Uma conta
 * entra na lista se tem perfil, login ou os dois. Função pura, para poder ser testada.
 */
function resumirContas(usuarios, respostas, tentativas, notas = [], logins = []) {
    const contar = (lista, uid) => lista.filter((x) => x.uid === uid).length;
    const perfis = new Map(usuarios.map((u) => [u.uid, u]));
    const login = new Map(logins.map((l) => [l.uid, l]));
    const uids = [...new Set([...perfis.keys(), ...login.keys()])];
    return uids
        .map((uid) => {
            const u = perfis.get(uid);
            return {
                uid,
                email: u?.email ?? login.get(uid)?.email ?? '',
                apelido: u?.apelido ?? '',
                temPerfil: u !== undefined,
                temLogin: login.has(uid),
                aceitouOTermo: u?.consentiuEm !== undefined && u?.consentiuEm !== null,
                deuAsNotas: notas.includes(uid),
                respostas: contar(respostas, uid),
                tentativas: contar(tentativas, uid),
            };
        })
        .sort((a, b) => a.email.localeCompare(b.email));
}

/** Apagar, de qualquer jeito, só com as contas ditas pelo e-mail. */
function validarOpcoes({ emails, apagar, apagarConta }) {
    if ((apagar || apagarConta) && emails.length === 0) throw new Error('Para apagar, diga de quais contas: --email a@exemplo.com');
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
    const { getAuth } = require('firebase-admin/auth');
    const { FieldValue, getFirestore } = require('firebase-admin/firestore');

    const emails = argumentos('email');
    const apagar = process.argv.includes('--apagar');
    const zerarContador = process.argv.includes('--zerar-contador');
    const apagarConta = process.argv.includes('--apagar-conta');
    validarOpcoes({ emails, apagar, apagarConta });

    initializeApp({ credential: cert(JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'))) });
    const db = getFirestore();
    const auth = getAuth();

    // Todos os logins, de mil em mil.
    const logins = [];
    let pagina;
    do {
        const lote = await auth.listUsers(1000, pagina);
        logins.push(...lote.users.map((u) => ({ uid: u.uid, email: u.email ?? '' })));
        pagina = lote.pageToken;
    } while (pagina);

    const [usuarios, respostas, tentativas, notas, contador] = await Promise.all([
        db.collection('users').get(),
        db.collection('answers').get(),
        db.collection('attempts').get(),
        db.collection('selfAssessments').get(),
        db.doc('piloto/contador').get(),
    ]);
    const contas = resumirContas(
        usuarios.docs.map((d) => ({ uid: d.id, ...d.data() })),
        respostas.docs.map((d) => d.data()),
        tentativas.docs.map((d) => d.data()),
        notas.docs.map((d) => d.id),
        logins
    );

    console.log(`Contas no banco: ${contas.length} · contador do termo: ${contador.exists ? contador.data().total : 'não existe'}`);
    for (const c of contas) {
        console.log(
            `  ${(c.email || '(sem e-mail)').padEnd(34)} ${c.apelido.padEnd(14)} ${c.temPerfil ? '' : 'sem perfil · '}${c.temLogin ? '' : 'sem login · '}termo: ${c.aceitouOTermo ? 'sim' : 'não'} · notas: ${c.deuAsNotas ? 'sim' : 'não'} · respostas: ${c.respostas} · tentativas: ${c.tentativas}`
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
    const refsDeNotas = notas.docs.filter((d) => uids.has(d.id)).map((d) => d.ref);

    console.log(`\nContas escolhidas: ${escolhidas.map((c) => c.email).join(', ')}`);
    console.log(`  respostas a apagar:  ${refsDeRespostas.length}`);
    console.log(`  tentativas a apagar: ${refsDeTentativas.length}`);
    console.log(`  notas por módulo a apagar: ${refsDeNotas.length}`);
    if (!apagarConta) console.log(`  aceite do termo a tirar do perfil: ${escolhidas.filter((c) => c.aceitouOTermo).length}`);
    if (apagarConta) {
        console.log(`  perfis a apagar: ${escolhidas.filter((c) => c.temPerfil).length}`);
        console.log(`  logins a apagar: ${escolhidas.filter((c) => c.temLogin).length}`);
    }
    if (zerarContador) console.log('  contador do termo: será apagado');

    if (!apagar) {
        console.log('\nNada foi apagado. Se a lista está certa, rode de novo com --apagar.');
        return;
    }

    await apagarEmLotes(db, [...refsDeRespostas, ...refsDeTentativas, ...refsDeNotas]);
    for (const conta of escolhidas) {
        const perfil = db.doc(`users/${conta.uid}`);
        if (apagarConta) {
            if (conta.temPerfil) await perfil.delete();
            if (conta.temLogin) await auth.deleteUser(conta.uid);
        } else if (conta.temPerfil) {
            await perfil.update({ formaPre: FieldValue.delete(), consentiuEm: FieldValue.delete() });
        }
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

module.exports = { resumirContas, escolherContas, validarOpcoes };
