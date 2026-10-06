// Testes das regras do Firestore. Rodam em Node, contra o emulador, separados de `npm test`:
// precisam de Java e do emulador no ar. Use `npm run test:regras`.
module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/regras/**/*.test.ts'],
    // Sem o preset do jest-expo (que monta um ambiente de React Native), o Babel precisa ser
    // dito aqui para entender TypeScript.
    transform: { '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
    testTimeout: 30000,
};
