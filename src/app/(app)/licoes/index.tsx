import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { TelaDasLicoes } from '@/components/licao/tela-das-licoes';
import { useAoVoltarAoApp } from '@/hooks/use-ao-voltar-ao-app';
import { useLicoes } from '@/hooks/use-licoes';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// A lista de lições (item 30): /licoes. O aluno escolhe o assunto e a ordem.
export default function LicoesScreen() {
    const { user, perfil } = useSession();
    const router = useRouter();

    const { formaPre } = participanteDoRoteiro(perfil);
    const { estado, recarregar } = useLicoes({ uid: user?.uid ?? '', formaPre });

    // Roda quando a lista ganha foco, inclusive na volta de uma lição.
    useFocusEffect(
        useCallback(() => {
            recarregar();
        }, [recarregar])
    );
    // E quando o app volta do segundo plano: a situação das revisões muda com o dia.
    useAoVoltarAoApp(recarregar);

    if (!user) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    return (
        <TelaDasLicoes
            estado={estado}
            aoAbrir={(topicId) => router.push({ pathname: '/licoes/[topicId]', params: { topicId } })}
            aoTentarDeNovo={recarregar}
            aoSair={sair}
        />
    );
}
