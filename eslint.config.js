// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Nomes que existem sem import nos arquivos em JavaScript puro do projeto (os de TypeScript são
// conferidos pelo próprio tsc). Lista curta e à mão, para não depender de mais um pacote.
const DO_NODE = { __dirname: 'readonly', console: 'readonly', module: 'writable', process: 'readonly', require: 'readonly' };
const DO_JEST = {
  afterAll: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  it: 'readonly',
  jest: 'readonly',
};

module.exports = defineConfig([
  expoConfig,
  {
    // Cópias de trabalho do assistente, arquivos gerados e a saída da exportação.
    ignores: ['dist/*', '.claude/*', '.expo/*', 'exportacao/*'],
  },
  {
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: DO_NODE },
  },
  {
    files: ['**/__tests__/**', '**/*.test.*', 'regras/**'],
    languageOptions: { globals: { ...DO_NODE, ...DO_JEST } },
    rules: {
      // O `jest.mock` sobe para o topo do arquivo e não enxerga os imports: dentro dele, e nos
      // testes que precisam carregar um módulo depois de preparar o ambiente, o caminho é `require`.
      '@typescript-eslint/no-require-imports': 'off',
      'import/first': 'off',
    },
  },
]);
