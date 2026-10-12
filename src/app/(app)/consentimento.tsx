import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import { TelaDeConsentimento } from '@/components/consentimento/tela-de-consentimento';
import { useSession } from '@/lib/session';

// O aceite do termo (itens 22 e 30): abre pelo "Começar" da primeira lição de ciclo completo,
// enquanto a pessoa não tem consentimento gravado.
export default function ConsentimentoScreen() {
    const { perfil, aceitarConsentimento, precisaDaAutoavaliacao } = useSession();
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
        // Antes do primeiro diagnóstico vêm as notas por módulo (item 34): entram no lugar do termo
        // na pilha, e de lá a pessoa volta para a lição.
        if (precisaDaAutoavaliacao) router.replace('/autoavaliacao');
        else sair();
    }

    return <TelaDeConsentimento aoAceitar={aceitar} aoSair={sair} />;
}
