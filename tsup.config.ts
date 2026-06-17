import {defineConfig} from 'tsup';
import {fixImportsPlugin} from 'esbuild-fix-imports-plugin';

export default defineConfig({
    esbuildPlugins: [fixImportsPlugin()],
    entry: [
        'src/**/*.ts',
        'src/**/*.tsx',
        '!src/**/*.test.ts',
        '!src/**/*.test.tsx',
        '!src/**/*.d.ts',
    ],
    dts: false,
    clean: true,
    sourcemap: false,
    outDir: 'build',
    splitting: false,
    bundle: false,
    format: ['esm'],
});
