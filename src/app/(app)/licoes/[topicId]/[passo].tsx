import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { DiagnosticoFeito, FimDaLicao, PraticaFeita } from '@/components/licao/fim-do-passo';
import { PortaoDaLicao } from '@/components/licao/portao-da-licao';
import { TelaDoBloco } from '@/components/pergunta/tela-do-bloco';
import { TEXTOS } from '@/constants/textos';
import type { Relatorio } from '@/hooks/use-bloco';
import { FASE_DO_PASSO, type Licao, type PassoComQuestoes } from '@/lib/licao';
import { participanteDoRoteiro } from '@/lib/participante';
import { useSession } from '@/lib/session';

// O parâmetro da rota é texto livre (na web, qualquer coisa digitada na URL).
function ehPasso(valor: unknown): valor is PassoComQuestoes {
    return typeof valor === 'string' && Object.hasOwn(FASE_DO_PASSO, valor);
}

// Um passo com questões de uma lição (item 30): /licoes/mda_framework/diagnostico, /pratica,
// /verificacao ou /revisao. Só abre se for o que o estado da lição deixa; senão, volta para ela.
export default function PassoDaLicaoScreen() {
    const { topicId, passo } = useLocalSearchParams<{ topicId: string; passo: string }>();
    const { user, perfil } = useSession();
    const router = useRouter();

    const paraALicao = { pathname: '/licoes/[topicId]', params: { topicId } } as const;
    if (!user) return <Redirect href="/" />;
    if (!ehPasso(passo)) return <Redirect href={paraALicao} />;

    const { formaPre } = participanteDoRoteiro(perfil);
    const uid = user.uid;

    function sair() {
        // Na web, quem abre a URL direto não tem para onde voltar.
        if (router.canGoBack()) router.back();
        else router.replace(paraALicao);
    }

    // Como o passo termina. `licao` é a lição como estava quando ele abriu.
    function fim(relatorio: Relatorio, licao: Licao) {
        if (passo === 'diagnostico') {
            // `replace`: o cartão toma o lugar do diagnóstico, então sair dele volta à lição.
            return (
                <DiagnosticoFeito
                    aoContinuar={() => router.replace({ pathname: '/licoes/[topicId]/cartao', params: { topicId } })}
                />
            );
        }
        if (passo === 'pratica') {
            // Lição já concluída: a prática abriu só para rever as questões.
            if (licao.estado.tipo === 'concluida') {
                return <PraticaFeita relatorio={relatorio} rotulo={TEXTOS.voltarParaALicao} aoContinuar={sair} />;
            }
            if (licao.ciclo === 'completo') {
                return (
                    <PraticaFeita
                        relatorio={relatorio}
                        rotulo={TEXTOS.fazerVerificacao}
                        aoContinuar={() =>
                            router.replace({ pathname: '/licoes/[topicId]/[passo]', params: { topicId, passo: 'verificacao' } })
                        }
                    />
                );
            }
        }
        // Verificação, revisão e, no ciclo curto, a prática: é o fim da lição (por ora, ou de vez).
        return <FimDaLicao uid={uid} topicId={topicId} formaPre={formaPre} aoSair={sair} />;
    }

    const chave = `${topicId}|${passo}`;

    return (
        <PortaoDaLicao
            // Outro passo é outra pergunta ao portão.
            key={chave}
            uid={uid}
            topicId={topicId}
            formaPre={formaPre}
            passo={passo}
            barrado={<Redirect href={paraALicao} />}>
            {(licao) => (
                <TelaDoBloco
                    // Outro bloco é outra tela: nada do estado anterior é reaproveitado.
                    key={chave}
                    uid={uid}
                    fase={FASE_DO_PASSO[passo]}
                    topicId={topicId}
                    formaPre={formaPre}
                    aoSair={sair}
                    fim={(relatorio) => fim(relatorio, licao)}
                />
            )}
        </PortaoDaLicao>
    );
}
