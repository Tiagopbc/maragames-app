import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { TEXTOS_DO_LOGIN } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';

// A logo da Beast Maragames, que identifica a marca no login (item 28). Ela é roxa, então vai
// sempre sobre um círculo claro: no tema claro ele some no fundo, no escuro é o que a faz aparecer.
export function LogoBeast({ tamanho = 96 }: { tamanho?: number }) {
    const theme = useTheme();
    const circulo = tamanho * 1.3;

    return (
        <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={TEXTOS_DO_LOGIN.logo}
            style={[
                styles.circulo,
                { width: circulo, height: circulo, borderRadius: circulo / 2, backgroundColor: theme.fundoDaLogo },
            ]}>
            <Image
                source={require('@/assets/images/logo-beast.svg')}
                contentFit="contain"
                style={{ width: tamanho, height: tamanho }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    circulo: { alignItems: 'center', justifyContent: 'center' },
});
