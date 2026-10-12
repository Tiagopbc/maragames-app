import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Uma parte do Perfil, com título: o leitor de tela anuncia o título como cabeçalho.
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <View style={styles.secao}>
            <ThemedText type="smallBold" accessibilityRole="header">
                {titulo}
            </ThemedText>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    secao: { gap: Spacing.three },
});
