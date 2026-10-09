import { Image } from 'expo-image';

// O lobo em cartum, que acompanha os momentos de conversa com o participante: o consentimento
// e a sequência da trilha (item 28). É enfeite: o leitor de tela passa direto por ele.
export function Mascote({ altura = 140 }: { altura?: number }) {
    return (
        <Image
            testID="mascote"
            accessible={false}
            source={require('@/assets/images/mascote-beast.png')}
            contentFit="contain"
            // A proporção é a do arquivo: 615 por 815.
            style={{ height: altura, width: (altura * 615) / 815, alignSelf: 'center' }}
        />
    );
}
