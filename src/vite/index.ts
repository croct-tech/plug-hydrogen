import {type Plugin, loadEnv} from 'vite';
import {type ClientConfig, getClientConfig} from '../config/client';

const VIRTUAL_CONFIG_ID = 'virtual:croct/config';
const RESOLVED_CONFIG_ID = `\0${VIRTUAL_CONFIG_ID}`;

/**
 * The Croct Vite plugin.
 *
 * Exposes the resolved public configuration to the browser SDK through the `virtual:croct/config`
 * module, so the provider needs no manual wiring.
 */
export function croct(): Plugin {
    let config: ClientConfig | null = null;

    return {
        name: '@croct/plug-hydrogen',
        config: (_userConfig, {mode}) => {
            config = getClientConfig(loadEnv(mode, process.cwd(), ''));

            return {
                // The provider imports `virtual:croct/config`, which the dependency optimizer
                // (esbuild) cannot resolve. Exclude the package from pre-bundling so it is served
                // through the plugin pipeline, where the virtual module resolves.
                optimizeDeps: {exclude: ['@croct/plug-hydrogen']},
            };
        },
        resolveId: id => (id === VIRTUAL_CONFIG_ID ? RESOLVED_CONFIG_ID : null),
        load: id => (id === RESOLVED_CONFIG_ID ? `export default ${JSON.stringify(config)};` : null),
    };
}
