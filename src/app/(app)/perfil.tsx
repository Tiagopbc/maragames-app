import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TelaDoPerfil } from '@/components/perfil/tela-do-perfil';
import { useLicoes } from '@/hooks/use-licoes';
import { versaoDoApp } from '@/lib/aparelho';
import { licaoFeita } from '@/lib/licao';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// O Perfil (Fase 6 do plano): /perfil. É também onde fica o Sair, que saiu da home.
export default function PerfilScreen() {
    const { user, perfil, salvarPerfil, salvarExtras, entraComSenha, redefinirSenha, sair } = useSession();
    const router = useRouter();

    // O XP e as lições feitas do cabeçalho são os da home: saem do mesmo hook, e não de outra conta.
    const { formaPre } = participanteDoRoteiro(perfil);
    const { estado, recarregar } = useLicoes({ uid: user?.uid ?? '', formaPre });
    useFocusEffect(
        useCallback(() => {
            recarregar();
        }, [recarregar])
    );

    if (!perfil) return <Redirect href="/" />;

    function fechar() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    // Enquanto as lições não chegam, ou se a leitura falha, o cabeçalho mostra só o apelido.
    const resumo =
        estado.tipo === 'pronto'
            ? { xp: estado.xp, feitas: estado.licoes.filter(licaoFeita).length, total: estado.licoes.length }
            : null;

    return (
        <TelaDoPerfil
            perfil={perfil}
            resumo={resumo}
            versao={versaoDoApp()}
            // Só o núcleo: o aceite de contato é gravado à parte, na seção Conta.
            aoSalvar={(dados) => salvarPerfil(dados)}
            entraComSenha={entraComSenha}
            // O link vai sempre para o e-mail da conta: aqui a pessoa já está dentro dela.
            aoRedefinirSenha={() => redefinirSenha(perfil.email)}
            aoMudarAceiteDeContato={(aceitaContato) => salvarExtras({ aceitaContato })}
            aoResponderSobreVoce={() => router.push('/sobre-voce')}
            aoLerOTermo={() => router.push('/termo')}
            aoSairDaConta={sair}
            aoSair={fechar}
        />
    );
}
