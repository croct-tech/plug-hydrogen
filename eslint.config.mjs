import {defineConfig} from 'eslint/config';
import {configs} from '@croct/eslint-plugin';

export default defineConfig(
    configs.typescript,
    {
        settings: {
            jest: {
                version: 30,
            },
            'import-x/resolver': {
                typescript: true,
            },
        },
    },
    {
        // Framework entry points (Vite plugin, config) legitimately use default exports.
        files: ['src/vite/**/*.ts', '*.config.ts'],
        rules: {
            'import-x/no-default-export': 'off',
        },
    },
    {
        ignores: [
            'build/',
            'coverage/',
            'node_modules/',
            '*.mjs',
            '**/*.d.ts',
        ],
    },
);
