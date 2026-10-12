import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BotaoPrincipal } from '@/components/botao-principal';
import { CampoTexto } from '@/components/campo-texto';
import { Caixa, Opcoes } from '@/components/opcoes';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
    DESCRICAO_DA_EXPERIENCIA,
    ROTULO_DA_EXPERIENCIA,
    ROTULO_DA_FAIXA_ETARIA,
    ROTULO_DA_SITUACAO_DE_ESTUDO,
    TEXTOS_DO_PERFIL,
} from '@/constants/textos';
import { EXPERIENCIAS, FAIXAS_ETARIAS, SITUACOES_DE_ESTUDO, pedeInstituicaoECurso } from '@/lib/perfil';
import {
    formatarTelefone,
    somenteDigitos,
    tudoValido,
    validarEscolha,
    validarTelefone,
    validarTexto,
    validarUf,
    type Erro,
} from '@/lib/validacao';
import type { DadosPerfil, Experiencia, FaixaEtaria, SituacaoDeEstudo } from '@/types/domain';

// O que a pessoa vê e mexe. As escolhas começam sem valor, e os textos, vazios.
type Campos = {
    nome: string;
    apelido: string;
    telefone: string;
    faixaEtaria: FaixaEtaria | null;
    cidade: string;
    uf: string;
    situacaoDeEstudo: SituacaoDeEstudo | null;
    instituicao: string;
    curso: string;
    experiencia: Experiencia;
};

type FormularioDoPerfilProps = {
    // O que já existe: nada, na conta nova; os campos antigos, na conta de antes de 12/10/2026;
    // o perfil inteiro, na edição.
    inicial: Partial<DadosPerfil>;
    rotuloDoBotao: string;
    // O aceite de contato só vem quando a caixa é mostrada (`comAceiteDeContato`).
    aoSalvar: (dados: DadosPerfil, aceitaContato?: boolean) => Promise<void>;
    // Na edição, salvar sem ter mudado nada não faz sentido: o botão espera uma mudança.
    soComMudanca?: boolean;
    // O aviso depois de salvar. No primeiro preenchimento não há: a navegação troca de tela.
    mensagemDeSucesso?: string;
    // No primeiro preenchimento, a caixa do aceite de contato vai junto. Na edição ela fica na
    // seção Conta do Perfil.
    comAceiteDeContato?: boolean;
};

function camposDe(inicial: Partial<DadosPerfil>): Campos {
    return {
        nome: inicial.nome ?? '',
        apelido: inicial.apelido ?? '',
        telefone: formatarTelefone(inicial.telefone ?? ''),
        faixaEtaria: inicial.faixaEtaria ?? null,
        cidade: inicial.cidade ?? '',
        uf: inicial.uf ?? '',
        situacaoDeEstudo: inicial.situacaoDeEstudo ?? null,
        instituicao: inicial.instituicao ?? '',
        curso: inicial.curso ?? '',
        experiencia: inicial.experiencia ?? 'iniciante',
    };
}

// O que vai para `salvarPerfil`: textos aparados, telefone só em dígitos, estado em maiúsculas.
// Instituição e curso só vão para quem faz graduação ou pós; nas outras situações, não existem.
function dadosDe(c: Campos): Partial<DadosPerfil> {
    const dados: Partial<DadosPerfil> = {
        nome: c.nome.trim(),
        apelido: c.apelido.trim(),
        telefone: somenteDigitos(c.telefone),
        cidade: c.cidade.trim(),
        uf: c.uf.trim().toUpperCase(),
        experiencia: c.experiencia,
    };
    if (c.faixaEtaria) dados.faixaEtaria = c.faixaEtaria;
    if (c.situacaoDeEstudo) dados.situacaoDeEstudo = c.situacaoDeEstudo;
    if (pedeInstituicaoECurso(c.situacaoDeEstudo)) {
        dados.instituicao = c.instituicao.trim();
        dados.curso = c.curso.trim();
    }
    return dados;
}

const CAMPOS_DOS_DADOS: readonly (keyof DadosPerfil)[] = [
    'nome',
    'apelido',
    'telefone',
    'faixaEtaria',
    'cidade',
    'uf',
    'situacaoDeEstudo',
    'instituicao',
    'curso',
    'experiencia',
];

// Os campos do núcleo do perfil (item 34), com a validação de `src/lib/validacao.ts` (a mesma
// lista está em `perfilValido()`, no firestore.rules). Serve ao primeiro preenchimento e à edição.
export function FormularioDoPerfil({
    inicial,
    rotuloDoBotao,
    aoSalvar,
    soComMudanca = false,
    mensagemDeSucesso,
    comAceiteDeContato = false,
}: FormularioDoPerfilProps) {
    const [campos, setCampos] = useState<Campos>(() => camposDe(inicial));
    // O que está salvo: na edição, é com isto que se compara para saber se algo mudou.
    const [salvo, setSalvo] = useState<Partial<DadosPerfil>>(() => dadosDe(camposDe(inicial)));
    const [aceitaContato, setAceitaContato] = useState(false);
    const [erros, setErros] = useState<Record<string, Erro>>({});
    const [erroGeral, setErroGeral] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [deuCerto, setDeuCerto] = useState(false);

    const estuda = pedeInstituicaoECurso(campos.situacaoDeEstudo);

    const validadores = {
        nome: () => validarTexto(campos.nome, 'o nome', 2, 60),
        apelido: () => validarTexto(campos.apelido, 'o apelido', 2, 20),
        telefone: () => validarTelefone(campos.telefone),
        faixaEtaria: () => validarEscolha(campos.faixaEtaria, TEXTOS_DO_PERFIL.escolhaAFaixaEtaria),
        cidade: () => validarTexto(campos.cidade, 'a cidade', 2, 60),
        uf: () => validarUf(campos.uf),
        situacaoDeEstudo: () => validarEscolha(campos.situacaoDeEstudo, TEXTOS_DO_PERFIL.escolhaASituacao),
        // Só valem para quem estuda; para os outros, os dois campos nem aparecem.
        instituicao: () => (estuda ? validarTexto(campos.instituicao, 'a instituição', 2, 80) : null),
        curso: () => (estuda ? validarTexto(campos.curso, 'o curso', 2, 80) : null),
    } satisfies Record<string, () => Erro>;
    const conferir = (campo: keyof typeof validadores) => setErros((e) => ({ ...e, [campo]: validadores[campo]() }));

    function mudar<C extends keyof Campos>(campo: C, valor: Campos[C]) {
        setCampos((c) => ({ ...c, [campo]: valor }));
        setDeuCerto(false);
    }

    // Uma escolha feita tira o erro dela na hora: não há "sair do campo" num botão.
    function escolher<C extends 'faixaEtaria' | 'situacaoDeEstudo'>(campo: C, valor: Campos[C]) {
        mudar(campo, valor);
        setErros((e) => ({ ...e, [campo]: null }));
    }

    const atual = dadosDe(campos);
    const mudou = CAMPOS_DOS_DADOS.some((campo) => atual[campo] !== salvo[campo]);

    async function enviar() {
        const novos = Object.fromEntries(Object.entries(validadores).map(([campo, validar]) => [campo, validar()]));
        setErros(novos);
        if (!tudoValido(novos)) return;

        setErroGeral(null);
        setSalvando(true);
        try {
            // Com tudo válido, as escolhas obrigatórias existem: `atual` é o núcleo inteiro.
            const dados = atual as DadosPerfil;
            if (comAceiteDeContato) await aoSalvar(dados, aceitaContato);
            else await aoSalvar(dados);
            setSalvo(atual);
            setDeuCerto(true);
        } catch (e) {
            setErroGeral(
                (e as { code?: string })?.code === 'permission-denied'
                    ? TEXTOS_DO_PERFIL.servidorRecusou
                    : TEXTOS_DO_PERFIL.erroAoSalvar
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <View style={styles.formulario}>
            <ThemedText type="smallBold" themeColor="textSecondary">
                {TEXTOS_DO_PERFIL.sobreVoce}
            </ThemedText>

            <CampoTexto
                rotulo={TEXTOS_DO_PERFIL.nome}
                erro={erros.nome}
                value={campos.nome}
                onChangeText={(t) => mudar('nome', t)}
                onBlur={() => conferir('nome')}
                autoComplete="name"
                editable={!salvando}
            />

            <CampoTexto
                rotulo={TEXTOS_DO_PERFIL.apelido}
                placeholder={TEXTOS_DO_PERFIL.dicaDoApelido}
                erro={erros.apelido}
                value={campos.apelido}
                onChangeText={(t) => mudar('apelido', t)}
                onBlur={() => conferir('apelido')}
                autoCapitalize="none"
                maxLength={20}
                editable={!salvando}
            />

            <CampoTexto
                rotulo={TEXTOS_DO_PERFIL.telefone}
                placeholder="(99) 99999-9999"
                erro={erros.telefone}
                value={campos.telefone}
                onChangeText={(t) => mudar('telefone', formatarTelefone(t))}
                onBlur={() => conferir('telefone')}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!salvando}
            />

            <Opcoes
                rotulo={TEXTOS_DO_PERFIL.faixaEtaria}
                opcoes={FAIXAS_ETARIAS.map((valor) => ({ valor, rotulo: ROTULO_DA_FAIXA_ETARIA[valor] }))}
                valor={campos.faixaEtaria}
                aoEscolher={(valor) => escolher('faixaEtaria', valor)}
                erro={erros.faixaEtaria}
                desabilitado={salvando}
            />

            <View style={styles.linha}>
                <View style={styles.cidade}>
                    <CampoTexto
                        rotulo={TEXTOS_DO_PERFIL.cidade}
                        erro={erros.cidade}
                        value={campos.cidade}
                        onChangeText={(t) => mudar('cidade', t)}
                        onBlur={() => conferir('cidade')}
                        maxLength={60}
                        editable={!salvando}
                    />
                </View>
                <View style={styles.uf}>
                    <CampoTexto
                        rotulo={TEXTOS_DO_PERFIL.uf}
                        placeholder={TEXTOS_DO_PERFIL.dicaDaUf}
                        erro={erros.uf}
                        value={campos.uf}
                        onChangeText={(t) => mudar('uf', t.toUpperCase())}
                        onBlur={() => conferir('uf')}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={2}
                        editable={!salvando}
                    />
                </View>
            </View>

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.parte}>
                {TEXTOS_DO_PERFIL.estudoEJogos}
            </ThemedText>

            <Opcoes
                rotulo={TEXTOS_DO_PERFIL.situacaoDeEstudo}
                opcoes={SITUACOES_DE_ESTUDO.map((valor) => ({ valor, rotulo: ROTULO_DA_SITUACAO_DE_ESTUDO[valor] }))}
                valor={campos.situacaoDeEstudo}
                aoEscolher={(valor) => escolher('situacaoDeEstudo', valor)}
                erro={erros.situacaoDeEstudo}
                desabilitado={salvando}
            />

            {estuda && (
                <>
                    <CampoTexto
                        rotulo={TEXTOS_DO_PERFIL.instituicao}
                        erro={erros.instituicao}
                        value={campos.instituicao}
                        onChangeText={(t) => mudar('instituicao', t)}
                        onBlur={() => conferir('instituicao')}
                        editable={!salvando}
                    />

                    <CampoTexto
                        rotulo={TEXTOS_DO_PERFIL.curso}
                        erro={erros.curso}
                        value={campos.curso}
                        onChangeText={(t) => mudar('curso', t)}
                        onBlur={() => conferir('curso')}
                        editable={!salvando}
                    />
                </>
            )}

            <Opcoes
                rotulo={TEXTOS_DO_PERFIL.experiencia}
                opcoes={EXPERIENCIAS.map((valor) => ({ valor, rotulo: ROTULO_DA_EXPERIENCIA[valor] }))}
                valor={campos.experiencia}
                // Sempre há um nível marcado: a escolha não se desfaz.
                aoEscolher={(valor) => valor && mudar('experiencia', valor)}
                dica={DESCRICAO_DA_EXPERIENCIA[campos.experiencia]}
                desabilitado={salvando}
            />

            {comAceiteDeContato && (
                <Caixa
                    rotulo={TEXTOS_DO_PERFIL.aceitaContato}
                    marcada={aceitaContato}
                    aoMudar={setAceitaContato}
                    desabilitado={salvando}
                />
            )}

            {erroGeral && (
                <ThemedText type="small" themeColor="erro" aria-live="polite">
                    {erroGeral}
                </ThemedText>
            )}
            {deuCerto && mensagemDeSucesso && (
                <ThemedText type="small" themeColor="sucesso" aria-live="polite">
                    {mensagemDeSucesso}
                </ThemedText>
            )}

            <BotaoPrincipal
                rotulo={rotuloDoBotao}
                carregando={salvando}
                desabilitado={soComMudanca && !mudou}
                onPress={enviar}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    formulario: { gap: Spacing.three },
    parte: { marginTop: Spacing.two },
    // A cidade ocupa o que sobra; o estado são duas letras.
    linha: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
    cidade: { flex: 1 },
    uf: { width: 110 },
});
