import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import { TelaDeAutoavaliacao } from '@/components/autoavaliacao/tela-de-autoavaliacao';
import { useModulos } from '@/hooks/use-modulos';
import { useSession } from '@/lib/session';

// As notas por módulo, antes do primeiro diagnóstico (item 34): /autoavaliacao. Abre depois do
// aceite do termo, ou pelo "Começar" da lição enquanto a pessoa ainda não respondeu.
export default function AutoavaliacaoScreen() {
    const { precisaDaAutoavaliacao, registrarAutoavaliacao } = useSession();
    const router = useRouter();
    const { estado, recarregar } = useModulos();

    // Só o valor de quando a tela abriu: quem já respondeu (URL digitada na web) volta para a
    // home. Depois de gravar aqui, quem fecha a tela é `sair`, não este redirect.
    const [jaTinhaRespondido] = useState(() => !precisaDaAutoavaliacao);
    if (jaTinhaRespondido) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    async function gravar(notas: Record<string, number>) {
        await registrarAutoavaliacao(notas);
        // A lição recalcula ao ganhar foco, e o "Começar" dela passa a abrir o diagnóstico.
        sair();
    }

    return <TelaDeAutoavaliacao estado={estado} aoGravar={gravar} aoTentarDeNovo={recarregar} aoSair={sair} />;
}
