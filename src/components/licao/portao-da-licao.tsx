import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { TEXTOS } from '@/constants/textos';
import { useLicao } from '@/hooks/use-licao';
import { podeAbrirNaLicao, type Licao, type PassoDaLicao } from '@/lib/licao';
import type { FormaPre } from '@/types/domain';

type PortaoDaLicaoProps = {
    uid: string;
    topicId: string;
    formaPre: FormaPre | null;
    passo: PassoDaLicao; // o que a rota quer abrir
    barrado: ReactNode; // o que aparece no lugar dele; quem decide para onde ir é a rota
    relogio?: () => number; // ms; trocável em teste
    // Recebe a lição como estava ao abrir: é o que diz à rota como o passo deve terminar.
    children: (licao: Licao) => ReactNode;
};

// A trava da lição (item 30): antes de desenhar um cartão ou um bloco, confere se o estado da
// lição deixa abri-lo. A regra é `podeAbrirNaLicao`; é o mesmo desenho do portão do roteiro (item 23).
export function PortaoDaLicao({ uid, topicId, formaPre, passo, barrado, relogio, children }: PortaoDaLicaoProps) {
    const { estado, recarregar } = useLicao({ uid, topicId, formaPre, relogio });
    // A decisão é tomada uma vez, ao abrir, e não muda mais. Terminar o passo muda o estado da
    // lição: se o portão decidisse de novo, tiraria a pessoa da tela antes de ela ver o fim dele.
    const [decisao, setDecisao] = useState<{ licao: Licao | null } | null>(null);

    useEffect(() => {
        recarregar();
    }, [recarregar]);

    useEffect(() => {
        if (decisao !== null || estado.tipo === 'carregando') return;
        // Sem conseguir ler a lição, não abre: na dúvida, a medida fica protegida.
        const liberada =
            estado.tipo === 'pronto' && podeAbrirNaLicao(estado.licao, passo, formaPre !== null) ? estado.licao : null;
        setDecisao({ licao: liberada });
    }, [decisao, estado, passo, formaPre]);

    if (decisao === null) {
        return (
            <ThemedView style={styles.centro}>
                <ActivityIndicator accessibilityLabel={TEXTOS.conferindoLicao} />
            </ThemedView>
        );
    }

    return decisao.licao ? children(decisao.licao) : barrado;
}

const styles = StyleSheet.create({
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
