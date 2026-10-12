import { validarEscolha, validarUf } from '../validacao';

describe('validarUf', () => {
    it('aceita a sigla de um estado, com ou sem espaço em volta', () => {
        expect(validarUf('MA')).toBeNull();
        expect(validarUf(' sp ')).toBeNull();
    });

    it('vazio pede o estado', () => {
        expect(validarUf('')).toBe('Informe o estado.');
        expect(validarUf('  ')).toBe('Informe o estado.');
    });

    it('o que não é sigla de estado pede a sigla', () => {
        expect(validarUf('XX')).toBe('Use a sigla do estado, como MA.');
        expect(validarUf('Maranhão')).toBe('Use a sigla do estado, como MA.');
    });
});

describe('validarEscolha', () => {
    it('sem escolha, devolve a mensagem do campo', () => {
        expect(validarEscolha(null, 'Escolha a faixa etária.')).toBe('Escolha a faixa etária.');
        expect(validarEscolha(undefined, 'Escolha a faixa etária.')).toBe('Escolha a faixa etária.');
    });

    it('com escolha, não há erro', () => {
        expect(validarEscolha('18_24', 'Escolha a faixa etária.')).toBeNull();
    });
});
