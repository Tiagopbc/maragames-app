// Os módulos do conteúdo, para a autoavaliação (item 34): lê os tópicos pelo repositório e
// entrega a lista à função pura de `src/lib/perfil.ts`.

import { useCallback, useEffect, useState } from 'react';

import { repositorio } from '@/data/repositorio';
import { modulosDosTopicos, type Modulo } from '@/lib/perfil';

export type EstadoDosModulos = { tipo: 'carregando' } | { tipo: 'erro' } | { tipo: 'pronto'; modulos: Modulo[] };

export function useModulos() {
    // Começa carregando: a primeira leitura sai sozinha, ao montar.
    const [estado, setEstado] = useState<EstadoDosModulos>({ tipo: 'carregando' });
    // Cada "Tentar de novo" soma um, e a leitura roda outra vez.
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        let vale = true; // a tela pode fechar, ou outra tentativa começar, antes de a leitura voltar

        repositorio.getTopicos().then(
            (topicos) => {
                if (vale) setEstado({ tipo: 'pronto', modulos: modulosDosTopicos(topicos) });
            },
            (e) => {
                console.warn('Não foi possível ler os módulos.', e);
                if (vale) setEstado({ tipo: 'erro' });
            }
        );

        return () => {
            vale = false;
        };
    }, [tentativa]);

    const recarregar = useCallback(() => {
        setEstado({ tipo: 'carregando' });
        setTentativa((t) => t + 1);
    }, []);

    return { estado, recarregar };
}
