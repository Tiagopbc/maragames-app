import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { CampoTexto } from '@/components/campo-texto';
import { TEXTOS_DO_LOGIN } from '@/constants/textos';
import { useTheme } from '@/hooks/use-theme';

type CampoSenhaProps = Omit<ComponentProps<typeof CampoTexto>, 'secureTextEntry' | 'aDireita'> & {
    // Com dois campos de senha na tela (o cadastro), cada botão precisa do seu nome.
    rotuloDeMostrar?: string;
    rotuloDeOcultar?: string;
};

type Icone = keyof typeof Ionicons.glyphMap;

// O campo de senha: começa escondida, e o olho dentro do campo mostra e esconde. Quem digita
// num teclado de celular erra sem ver; conferir antes de enviar evita a senha errada.
export function CampoSenha({
    rotuloDeMostrar = TEXTOS_DO_LOGIN.mostrarASenha,
    rotuloDeOcultar = TEXTOS_DO_LOGIN.ocultarASenha,
    ...rest
}: CampoSenhaProps) {
    const theme = useTheme();
    const [visivel, setVisivel] = useState(false);
    const icone: Icone = visivel ? 'eye-off-outline' : 'eye-outline';

    return (
        <CampoTexto
            autoCapitalize="none"
            autoCorrect={false}
            {...rest}
            secureTextEntry={!visivel}
            aDireita={
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={visivel ? rotuloDeOcultar : rotuloDeMostrar}
                    onPress={() => setVisivel((v) => !v)}
                    style={styles.botao}>
                    <Ionicons name={icone} size={22} color={theme.textSecondary} />
                </Pressable>
            }
        />
    );
}

const styles = StyleSheet.create({
    botao: { alignSelf: 'stretch', flex: 1, alignItems: 'center', justifyContent: 'center' },
});
