// Só a fase diz o que a resposta mede: a mesma questão é pré-teste para metade dos
// participantes e pós-teste para a outra, e o reteste repete as questões do pós.
export type Fase = 'pre' | 'pratica' | 'pos' | 'reteste';

// Valor gravado no evento. Os rótulos ("Palpite", "Tenho dúvida", "Tenho certeza") ficam só na tela.
export type Confianca = 1 | 2 | 3;

// Forma que o participante faz no pré-teste; a outra fica para o pós e o reteste.
export type FormaPre = 'A' | 'B';

export interface Attempt {
    id: string;
    uid: string;
    fase: Fase; // não muda depois de criada
    lessonId: string | null; // null nos blocos pré, pós e reteste, que atravessam os quatro tópicos
    respostas: string[]; // ids das questões já respondidas nesta tentativa
    concluida: boolean;
    createdAt: number;
    // Ausentes nas tentativas anteriores a 12/10/2026.
    plataforma?: string;
    versaoDoApp?: string;
}

// Evento imutável: uma resposta confirmada = um documento em `answers`, nunca atualizado.
// Os campos são exatamente os que `respostaValida()` exige no firestore.rules. Mudou um, muda o outro.
export interface Answer {
    id: string;
    uid: string;
    questionId: string;
    topicId: string;
    attemptId: string;
    fase: Fase;
    escolha: string; // id da alternativa marcada
    ordemExibida: string[]; // ids das 4 alternativas, na ordem em que apareceram na tela
    correta: boolean;
    confianca: Confianca;
    tempoMs: number; // inteiro, do momento em que a questão aparece até o Confirmar
    respondidaEm: number; // horário do servidor, em ms
}

// O que a tela entrega ao confirmar. `id` e `respondidaEm` não vêm do aparelho:
// o Firestore gera o id e o servidor carimba o horário.
export type NovaResposta = Omit<Answer, 'id' | 'respondidaEm'>;

export interface Alternativa {
    id: string;
    texto: string;
    correta: boolean;
    explicacao: string;
}

// forma_a e forma_b são os blocos medidos do piloto (pré, pós e reteste); pratica fica fora do ganho.
export type BlocoQuestao = 'forma_a' | 'forma_b' | 'pratica';

// Hipótese do autor da questão, conferida depois pela taxa de acerto. Não confundir com confiança (1 a 3).
export type Dificuldade = 'basico' | 'intermediario' | 'avancado';

export interface Question {
    id: string;
    lessonId: string;
    topicId: string;
    order: number;
    bloco: BlocoQuestao;
    dificuldade: Dificuldade;
    formato: 'multipla_escolha' | 'completar_codigo' | 'ordenar_etapas';
    enunciado: string;
    alternativas: Alternativa[];
    fonte: string | null;
    versaoConteudo: string; // hash do content/ no momento do seed
}

export interface SlideConceito {
    titulo: string;
    texto: string;
}

export interface Lesson {
    id: string;
    title: string;
    order: number;
    topicId?: string;
    ordem?: number; // ordem de apresentação no piloto (1 a 4 no dia 1, 5 em diante na trilha diária)
    trilha?: 'medido' | 'diaria';
    modulo?: string | null;
    cartao?: SlideConceito[]; // cartão de conceito mostrado antes da prática
}

// Não tem coleção própria: sai da lição do tópico (uma lição por tópico no seed de conteúdo).
export interface Topico {
    id: string; // o `topicId` das questões e das respostas
    titulo: string;
    modulo: string | null;
    ordem: number; // a ordem de apresentação da lição; sem ela, o número da lição
}

export type Experiencia = 'iniciante' | 'intermediario' | 'avancado';

// O app é para maiores de 18 (item 34): não há faixa abaixo disso.
export type FaixaEtaria = '18_24' | '25_34' | '35_44' | '45_mais';
export type SituacaoDeEstudo = 'ensino_medio' | 'graduacao' | 'pos' | 'formado' | 'nao_estudo';

export type Ocupacao = 'estudo' | 'tecnologia' | 'outra_area';
export type Engine = 'nenhuma' | 'godot' | 'unity' | 'unreal' | 'gamemaker' | 'outra';
export type Linguagem = 'nenhuma' | 'python' | 'csharp' | 'javascript' | 'gdscript' | 'cpp' | 'outra';
export type EstudoDeGameDesign = 'nunca' | 'sozinho' | 'curso' | 'faculdade';
export type Interesse = 'programacao' | 'arte' | 'game_design' | 'audio' | 'publicacao';
export type Objetivo = 'hobby' | 'carreira' | 'publicar' | 'faculdade';
export type TempoPorSemana = 'ate_1h' | '1_a_3h' | 'mais_de_3h';
export type ComoConheceu = 'instagram' | 'amigo' | 'faculdade' | 'evento' | 'outro';

// As perguntas opcionais de "Sobre você e os jogos" (item 34). Campo ausente = não respondida.
export interface ExtrasDoPerfil {
    ocupacao?: Ocupacao;
    engines?: Engine[];
    linguagens?: Linguagem[];
    estudoDeGameDesign?: EstudoDeGameDesign;
    interesses?: Interesse[];
    objetivo?: Objetivo;
    tempoPorSemana?: TempoPorSemana;
    comoConheceu?: ComoConheceu;
    alunoDoSite?: boolean;
}

export interface Perfil extends ExtrasDoPerfil {
    uid: string;
    nome: string;
    apelido: string; // nome curto de exibição (ranking, saudação)
    email: string;
    telefone: string; // só dígitos, ex.: '11987654321'
    faixaEtaria: FaixaEtaria;
    cidade: string;
    uf: string; // sigla do estado, ex.: 'MA'
    situacaoDeEstudo: SituacaoDeEstudo;
    // Só de quem faz graduação ou pós; nas outras situações, os dois ficam ausentes.
    instituicao?: string;
    curso?: string;
    experiencia: Experiencia; // em criar jogos, e não em jogar
    aceitaContato?: boolean; // aceite de receber mensagens da Beast Maragames; ausente = não
    // Os dois abaixo nascem juntos, no aceite do termo, e não mudam mais (item 22).
    formaPre?: FormaPre; // forma do pré-teste, alternada pelo contador do piloto
    consentiuEm?: number; // horário do servidor, em ms
    criadoEm: number;
    atualizadoEm: number;
}

// O núcleo obrigatório: o que as telas de completar e de editar o perfil preenchem.
// O resto (uid, email, datas) o contexto deriva.
export type DadosPerfil = Pick<
    Perfil,
    | 'nome'
    | 'apelido'
    | 'telefone'
    | 'faixaEtaria'
    | 'cidade'
    | 'uf'
    | 'situacaoDeEstudo'
    | 'instituicao'
    | 'curso'
    | 'experiencia'
>;

// O que se grava fora do núcleo, sem passar pelo formulário: as opcionais e o aceite de contato.
export type ExtrasParaSalvar = ExtrasDoPerfil & Pick<Perfil, 'aceitaContato'>;

// A nota que a pessoa se dá em cada módulo, de 1 a 5, antes do primeiro diagnóstico (item 34).
// É gravada uma vez e não muda: serve para comparar com o que o diagnóstico mede.
export interface Autoavaliacao {
    uid: string;
    notas: Record<string, number>; // id do módulo (`idDoModulo`) -> 1 a 5
    respondidaEm: number; // horário do servidor, em ms
}

// De onde a tentativa foi feita. Gravado na criação dela, sem perguntar nada.
export interface OrigemDaTentativa {
    plataforma: string; // 'web', 'android' ou 'ios'
    versaoDoApp: string;
}

// O que o aceite do termo grava no perfil.
export type Consentimento = Required<Pick<Perfil, 'formaPre' | 'consentiuEm'>>;