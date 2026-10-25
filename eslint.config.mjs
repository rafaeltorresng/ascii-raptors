import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', 'tests/fixtures/**']),
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
]);
