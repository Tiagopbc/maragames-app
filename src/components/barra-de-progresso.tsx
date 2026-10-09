import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type BarraDeProgressoProps = {
    feitas: number;
    total: number;
    rotulo: string; // o que a barra mede, para quem usa leitor de tela
};

// Quanto do bloco já foi respondido. Só desenha: quem conta é a tela.
export function BarraDeProgresso({ feitas, total, rotulo }: BarraDeProgressoProps) {
    const theme = useTheme();
    const fracao = total > 0 ? Math.min(Math.max(feitas / total, 0), 1) : 0;

    return (
        <View
            // Um elemento só para o leitor de tela, que lê o rótulo e o valor.
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={rotulo}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={feitas}
            style={[styles.trilho, { backgroundColor: theme.borda }]}>
            <View style={[styles.feito, { backgroundColor: theme.bordaSelecionada, width: `${fracao * 100}%` }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    trilho: { height: 8, borderRadius: 4, overflow: 'hidden' },
    feito: { height: '100%', borderRadius: 4 },
});
