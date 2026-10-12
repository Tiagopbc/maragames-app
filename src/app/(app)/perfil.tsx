import { Redirect, useRouter } from 'expo-router';

import { TelaDoPerfil } from '@/components/perfil/tela-do-perfil';
import { useSession } from '@/lib/session';

// O Perfil (Fase 6 do plano): /perfil. É também onde fica o Sair, que saiu da home.
export default function PerfilScreen() {
    const { perfil, salvarPerfil, entraComSenha, redefinirSenha, sair } = useSession();
    const router = useRouter();

    if (!perfil) return <Redirect href="/" />;

    function fechar() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace('/');
    }

    return (
        <TelaDoPerfil
            perfil={perfil}
            aoSalvar={salvarPerfil}
            entraComSenha={entraComSenha}
            // O link vai sempre para o e-mail da conta: aqui a pessoa já está dentro dela.
            aoRedefinirSenha={() => redefinirSenha(perfil.email)}
            aoLerOTermo={() => router.push('/termo')}
            aoSairDaConta={sair}
            aoSair={fechar}
        />
    );
}
