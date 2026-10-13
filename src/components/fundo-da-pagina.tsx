import { useEffect } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { pintarFundoDaPagina } from '@/lib/fundo-da-pagina';

/**
 * Mantém o fundo da página da web na cor de fundo do tema do app, e troca junto com ele. Não
 * desenha nada; no celular, não faz nada.
 */
export function FundoDaPagina() {
    const { background } = useTheme();

    useEffect(() => {
        pintarFundoDaPagina(background);
    }, [background]);

    return null;
}
