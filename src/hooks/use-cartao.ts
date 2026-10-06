// Cartão de conceito de um tópico (item 21): os slides ficam no documento da lição, e é pelo
// repositório que a tela chega a eles. Ver o cartão não grava nada.

import { useEffect, useState } from 'react';

import { repositorio } from '@/data/repositorio';
import type { SlideConceito } from '@/types/domain';

export type EstadoDoCartao =
    | { tipo: 'carregando' }
    | { tipo: 'erro' }
    | { tipo: 'vazio' } // o tópico não tem cartão (ou não existe): não há o que mostrar
    | { tipo: 'pronto'; titulo: string; slides: SlideConceito[] };

export function useCartao(topicId: string) {
    const [estado, setEstado] = useState<EstadoDoCartao>({ tipo: 'carregando' });
    const [carga, setCarga] = useState(0);

    useEffect(() => {
        let ativa = true; // a tela pode fechar antes de a leitura voltar

        repositorio
            .getLicoes()
            .then((licoes) => {
                if (!ativa) return;
                const licao = licoes.find((l) => l.topicId === topicId);
                const slides = licao?.cartao ?? [];
                setEstado(licao && slides.length > 0 ? { tipo: 'pronto', titulo: licao.title, slides } : { tipo: 'vazio' });
            })
            .catch((e) => {
                console.warn('Não foi possível ler o cartão.', e);
                if (ativa) setEstado({ tipo: 'erro' });
            });

        return () => {
            ativa = false;
        };
    }, [topicId, carga]); // `carga` muda só para refazer a leitura depois de um erro

    function tentarDeNovo() {
        setEstado({ tipo: 'carregando' });
        setCarga((n) => n + 1);
    }

    return { estado, tentarDeNovo };
}
