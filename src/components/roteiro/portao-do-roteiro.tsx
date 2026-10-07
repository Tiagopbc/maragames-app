import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { TEXTOS } from '@/constants/textos';
import { useRoteiro } from '@/hooks/use-roteiro';
import type { Participante } from '@/lib/participante';
import { podeAbrir, type DestinoDeEstudo } from '@/lib/passo';

type PortaoDoRoteiroProps = {
    uid: string;
    participante: Participante;
    destino: DestinoDeEstudo; // a tela que a rota quer abrir
    barrado: ReactNode; // o que aparece no lugar dela; quem decide para onde ir é a rota
    relogio?: () => number; // ms; trocável em teste
    children: ReactNode;
};

// A trava do roteiro (item 23): antes de desenhar um cartão ou um bloco, confere se ele é o da
// etapa em que a pessoa está, com a mesma conta que a home faz. A regra é `podeAbrir`.
export function PortaoDoRoteiro({ uid, participante, destino, barrado, relogio, children }: PortaoDoRoteiroProps) {
    const { estado, recarregar } = useRoteiro({ uid, participante, relogio });
    // A decisão é tomada uma vez, ao abrir, e não muda mais. Terminar a prática muda a etapa:
    // se o portão decidisse de novo, tiraria a pessoa da tela antes de ela ver o resultado.
    const [liberado, setLiberado] = useState<boolean | null>(null);

    useEffect(() => {
        recarregar();
    }, [recarregar]);

    useEffect(() => {
        if (liberado !== null || estado.tipo === 'carregando') return;
        // Sem conseguir ler o roteiro, não abre: na dúvida, a medida fica protegida.
        setLiberado(estado.tipo === 'pronto' && podeAbrir(estado.etapa, destino));
    }, [liberado, estado, destino]);

    if (liberado === null) {
        return (
            <ThemedView style={styles.centro}>
                <ActivityIndicator accessibilityLabel={TEXTOS.conferindoRoteiro} />
            </ThemedView>
        );
    }

    return liberado ? children : barrado;
}

const styles = StyleSheet.create({
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
