import { useRouter } from 'expo-router';

import { TelaDeConsentimento } from '@/components/consentimento/tela-de-consentimento';

// O termo para reler, aberto pelo Perfil: /termo. Só mostra o texto; o aceite continua sendo
// o primeiro passo do primeiro diagnóstico, em /consentimento.
export default function TermoScreen() {
    const router = useRouter();

    function fechar() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/perfil');
    }

    return <TelaDeConsentimento somenteLeitura aoSair={fechar} />;
}
