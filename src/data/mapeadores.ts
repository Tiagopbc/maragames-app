// Converte documentos do Firestore nos tipos de domínio e põe as listas na ordem de exibição.
// Funções puras: recebem o id e os dados já lidos, sem importar Firebase, então a mesma
// conversão serve a outra implementação do repositório e roda em teste sem emulador.

import type { Answer, Lesson, Perfil, Question, Topico } from '../types/domain';

type Dados = Record<string, any>;

// Campo a campo, e não `...d`: os carimbos do seed (`updatedAt`, `createdAt`) são Timestamp
// do Firestore e não entram nos tipos de domínio.
export function paraLesson(id: string, d: Dados): Lesson {
    return {
        id,
        title: d.title,
        order: d.order,
        topicId: d.topicId,
        modulo: d.modulo ?? null,
        cartao: d.cartao ?? [],
    };
}

export function paraQuestion(id: string, d: Dados): Question {
    return {
        id,
        lessonId: d.lessonId,
        topicId: d.topicId,
        order: d.order,
        bloco: d.bloco,
        dificuldade: d.dificuldade,
        formato: d.formato,
        enunciado: d.enunciado,
        alternativas: d.alternativas,
        fonte: d.fonte ?? null,
        versaoConteudo: d.versaoConteudo,
    };
}

export function paraAnswer(id: string, d: Dados): Answer {
    return {
        id,
        uid: d.uid,
        questionId: d.questionId,
        topicId: d.topicId,
        attemptId: d.attemptId,
        fase: d.fase,
        escolha: d.escolha,
        ordemExibida: d.ordemExibida,
        correta: d.correta,
        confianca: d.confianca,
        tempoMs: d.tempoMs,
        respondidaEm: d.respondidaEm.toMillis(),
    };
}

// `criadoEm` e `atualizadoEm` são números gravados pelo aparelho; `consentiuEm` é Timestamp do
// servidor e vira ms. Forma e consentimento só entram no objeto quando existem no documento.
export function paraPerfil(d: Dados): Perfil {
    const perfil: Perfil = {
        uid: d.uid,
        nome: d.nome,
        apelido: d.apelido,
        email: d.email,
        telefone: d.telefone,
        instituicao: d.instituicao,
        curso: d.curso,
        experiencia: d.experiencia,
        criadoEm: d.criadoEm,
        atualizadoEm: d.atualizadoEm,
    };
    if (d.formaPre) perfil.formaPre = d.formaPre;
    if (d.consentiuEm) perfil.consentiuEm = d.consentiuEm.toMillis();
    return perfil;
}

// O tópico não tem coleção própria: o seed grava uma lição por tópico, e é dela que ele sai.
// Lição sem `topicId` (anterior ao seed de conteúdo) não vira tópico.
export function topicosDasLicoes(
    licoes: readonly Pick<Lesson, 'title' | 'order' | 'topicId' | 'modulo'>[]
): Topico[] {
    return ordenarLicoes(licoes).flatMap((l) =>
        l.topicId ? [{ id: l.topicId, titulo: l.title, modulo: l.modulo ?? null, ordem: l.order }] : []
    );
}

export function ordenarLicoes<T extends Pick<Lesson, 'order'>>(licoes: readonly T[]): T[] {
    return [...licoes].sort((a, b) => a.order - b.order);
}

// `order` é a posição da questão dentro do tópico, então a lista sai agrupada por tópico.
// A ordem entre tópicos aqui é só alfabética; a do roteiro é parâmetro de `etapaDoRoteiro`.
export function ordenarQuestoes<T extends Pick<Question, 'topicId' | 'order'>>(questoes: readonly T[]): T[] {
    return [...questoes].sort((a, b) => {
        if (a.topicId !== b.topicId) return a.topicId < b.topicId ? -1 : 1;
        return a.order - b.order;
    });
}

export function ordenarRespostas<T extends Pick<Answer, 'respondidaEm'>>(respostas: readonly T[]): T[] {
    return [...respostas].sort((a, b) => a.respondidaEm - b.respondidaEm);
}
