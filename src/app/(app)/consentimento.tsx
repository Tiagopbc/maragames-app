import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import { TelaDeConsentimento } from '@/components/consentimento/tela-de-consentimento';
import { useSession } from '@/lib/session';

// Primeira etapa do roteiro (item 22). Abre pelo "Continuar estudos" da home enquanto o
// participante não tem consentimento gravado.
export default function ConsentimentoScreen() {
    const { perfil, aceitarConsentimento } = useSession();
    const router = useRouter();

    // Só o valor de quando a tela abriu: quem já tinha aceitado (URL digitada na web) volta
    // para a home. Depois do aceite feito aqui, quem fecha a tela é `sair`, não este redirect.
    const [jaTinhaAceitado] = useState(() => perfil?.consentiuEm !== undefined);
    if (jaTinhaAceitado) return <Redirect href="/" />;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    async function aceitar() {
        await aceitarConsentimento();
        // A home recalcula a etapa ao ganhar foco e já mostra o pré-teste.
        sair();
    }

    return <TelaDeConsentimento aoAceitar={aceitar} aoSair={sair} />;
}
