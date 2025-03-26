module.exports = {
  env: {
    node: true,
    es2020: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-constant-condition': ['error', { 'checkLoops': false }],
    'no-var': 'error',
    'prefer-const': 'warn',
    'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
    'curly': ['error', 'multi-line'],
    'keyword-spacing': ['error', { 'before': true, 'after': true }],
    'space-before-blocks': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'max-len': ['warn', { 'code': 120 }]
  }
}; 