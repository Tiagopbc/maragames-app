import { Redirect, useRouter } from 'expo-router';

import { TelaDoPerfil } from '@/components/perfil/tela-do-perfil';
import { useSession } from '@/lib/session';

// O Perfil (Fase 6 do plano): /perfil. É também onde fica o Sair, que saiu da home.
export default function PerfilScreen() {
    const { perfil, salvarPerfil, sair } = useSession();
    const router = useRouter();

    if (!perfil) return <Redirect href="/" />;

    function fechar() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    return <TelaDoPerfil perfil={perfil} aoSalvar={salvarPerfil} aoSairDaConta={sair} aoSair={fechar} />;
}
