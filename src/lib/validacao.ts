// Funções puras de validação: sem React, sem Firebase, sem estado.
// Cada validador devolve a mensagem de erro, ou null quando o valor está certo.

export type Erro = string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function somenteDigitos(valor: string): string {
    return valor.replace(/\D/g, '');
}

/** Aplica a máscara (99) 99999-9999 conforme a pessoa digita. */
export function formatarTelefone(valor: string): string {
    const d = somenteDigitos(valor).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validarEmail(valor: string): Erro {
    const v = valor.trim();
    if (!v) return 'Informe o email.';
    if (!EMAIL.test(v)) return 'Esse email não parece válido.';
    return null;
}

export function validarSenha(valor: string): Erro {
    if (!valor) return 'Informe a senha.';
    if (valor.length < 8) return 'A senha precisa de pelo menos 8 caracteres.';
    if (!/[A-Za-z]/.test(valor)) return 'A senha precisa de pelo menos uma letra.';
    if (!/\d/.test(valor)) return 'A senha precisa de pelo menos um número.';
    return null;
}

export function validarConfirmacao(senha: string, confirmacao: string): Erro {
    if (!confirmacao) return 'Repita a senha.';
    if (senha !== confirmacao) return 'As senhas não são iguais.';
    return null;
}

export function validarTelefone(valor: string): Erro {
    const d = somenteDigitos(valor);
    if (!d) return 'Informe o telefone.';
    if (d.length < 10 || d.length > 11) return 'Telefone incompleto. Use DDD + número.';
    if (Number(d.slice(0, 2)) < 11) return 'DDD inválido.';
    return null;
}

export function validarTexto(valor: string, campo: string, min = 2, max = 60): Erro {
    const v = valor.trim();
    if (!v) return `Informe ${campo}.`;
    if (v.length < min) return `${campo} precisa de pelo menos ${min} caracteres.`;
    if (v.length > max) return `${campo} passa de ${max} caracteres.`;
    return null;
}

/** Verdadeiro quando nenhum campo do mapa tem erro. */
export function tudoValido(erros: Record<string, Erro>): boolean {
    return Object.values(erros).every((e) => e === null);
}
