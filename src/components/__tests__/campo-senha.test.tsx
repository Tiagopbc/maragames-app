import { render, screen, userEvent } from '@testing-library/react-native';

import { CampoSenha } from '../campo-senha';

const campo = () => screen.getByLabelText('Senha');

describe('o campo de senha', () => {
    it('começa com a senha escondida e oferece mostrá-la', async () => {
        await render(<CampoSenha rotulo="Senha" value="segredo-de-teste" onChangeText={jest.fn()} />);

        expect(campo().props.secureTextEntry).toBe(true);
        expect(screen.getByRole('button', { name: 'Mostrar a senha' })).toBeOnTheScreen();
        expect(screen.queryByRole('button', { name: 'Ocultar a senha' })).toBeNull();
    });

    it('um toque mostra a senha e o botão passa a oferecer escondê-la', async () => {
        await render(<CampoSenha rotulo="Senha" value="segredo-de-teste" onChangeText={jest.fn()} />);

        await userEvent.setup().press(screen.getByRole('button', { name: 'Mostrar a senha' }));

        expect(campo().props.secureTextEntry).toBe(false);
        expect(screen.getByRole('button', { name: 'Ocultar a senha' })).toBeOnTheScreen();
    });

    it('outro toque esconde de novo', async () => {
        await render(<CampoSenha rotulo="Senha" value="segredo-de-teste" onChangeText={jest.fn()} />);
        const user = userEvent.setup();

        await user.press(screen.getByRole('button', { name: 'Mostrar a senha' }));
        await user.press(screen.getByRole('button', { name: 'Ocultar a senha' }));

        expect(campo().props.secureTextEntry).toBe(true);
    });

    it('mostrar a senha não muda o que foi digitado', async () => {
        const aoMudar = jest.fn();
        await render(<CampoSenha rotulo="Senha" value="segredo-de-teste" onChangeText={aoMudar} />);

        await userEvent.setup().press(screen.getByRole('button', { name: 'Mostrar a senha' }));

        expect(campo().props.value).toBe('segredo-de-teste');
        expect(aoMudar).not.toHaveBeenCalled();
    });

    it('mostra o erro do campo, como os outros campos', async () => {
        await render(<CampoSenha rotulo="Senha" value="" onChangeText={jest.fn()} erro="Informe a senha." />);

        expect(screen.getByText('Informe a senha.')).toBeOnTheScreen();
    });

    it('dois campos na mesma tela podem ter botões com nomes diferentes', async () => {
        await render(
            <CampoSenha
                rotulo="Repetir senha"
                value=""
                onChangeText={jest.fn()}
                rotuloDeMostrar="Mostrar a senha repetida"
                rotuloDeOcultar="Ocultar a senha repetida"
            />
        );

        await userEvent.setup().press(screen.getByRole('button', { name: 'Mostrar a senha repetida' }));

        expect(screen.getByRole('button', { name: 'Ocultar a senha repetida' })).toBeOnTheScreen();
    });
});
