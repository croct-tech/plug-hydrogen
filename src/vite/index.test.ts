import {loadEnv} from 'vite';
import {croct} from './index';

jest.mock('vite', () => ({loadEnv: jest.fn()}));

describe('croct vite plugin', () => {
    type Hook = (...args: unknown[]) => unknown;

    const appId = '00000000-0000-0000-0000-000000000000';
    const mockLoadEnv = jest.mocked(loadEnv);

    beforeEach(() => {
        mockLoadEnv.mockReturnValue({PUBLIC_CROCT_APP_ID: appId});
    });

    it('should expose the public configuration through the virtual module', () => {
        const plugin = croct();

        expect(plugin.name).toBe('@croct/plug-hydrogen');

        const result = (plugin.config as unknown as Hook)({}, {
            mode: 'production',
            command: 'build',
        });

        expect(mockLoadEnv).toHaveBeenCalledWith('production', expect.any(String), '');
        expect(result).toEqual({optimizeDeps: {exclude: ['@croct/plug-hydrogen']}});

        const code = (plugin.load as unknown as Hook)('\0virtual:croct/config') as string;

        expect(code).toContain(`"appId":"${appId}"`);
    });

    it('should only resolve and load its own virtual module', () => {
        const plugin = croct();

        expect((plugin.resolveId as unknown as Hook)('virtual:croct/config')).toBe('\0virtual:croct/config');
        expect((plugin.resolveId as unknown as Hook)('other-module')).toBeNull();
        expect((plugin.load as unknown as Hook)('other-module')).toBeNull();
    });
});
