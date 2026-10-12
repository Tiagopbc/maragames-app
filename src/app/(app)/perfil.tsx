import { Redirect, useRouter } from 'expo-router';

import { TelaDoPerfil } from '@/components/perfil/tela-do-perfil';
import { useSession } from '@/lib/session';

// O Perfil (Fase 6 do plano): /perfil. É também onde fica o Sair, que saiu da home.
export default function PerfilScreen() {
    const { perfil, salvarPerfil, salvarExtras, entraComSenha, redefinirSenha, sair } = useSession();
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
