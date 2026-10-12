import { Redirect, useRouter } from 'expo-router';

import { TelaSobreVoce } from '@/components/perfil/tela-sobre-voce';
import { useSession } from '@/lib/session';

// As perguntas opcionais do perfil (item 34): /sobre-voce, aberta pelo cartão do Perfil.
export default function SobreVoceScreen() {
    const { perfil, salvarExtras } = useSession();
    const router = useRouter();

    if (!perfil) return <Redirect href="/" />;

    function fechar() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/perfil');
    }

    return <TelaSobreVoce inicial={perfil} aoSalvar={salvarExtras} aoSair={fechar} />;
}
