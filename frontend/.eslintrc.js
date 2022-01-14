module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: ['airbnb-base', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    'no-console': 0,
    'import/extensions': 0,
    'no-use-before-define': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/no-shadow': ['error'],
    'default-case': 'off',
    'consistent-return': 'off',
    '@typescript-eslint/no-unsafe-return': ['error'],
    '@typescript-eslint/switch-exhaustiveness-check': ['error'],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
      typescript: {},
    },
  },
  env: {
    browser: true,
  },
  ignorePatterns: ['OLD/*'],
};
