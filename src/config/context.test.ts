import {createContext} from 'react-router';
import {type CroctContext, getEnv, getRequestContext, type RequestContext} from './context';

// The Remix-v2 era runs on React Router 6, which has no `createContext`. Simulate its absence so
// this suite fails loudly if config/context ever evaluates it at module load instead of lazily —
// only the React Router 7 middleware needs it.
jest.mock(
    'react-router',
    () => ({
        ...jest.requireActual('react-router'),
        createContext: jest.fn(() => {
            throw new TypeError('createContext is not a function');
        }),
    }),
);

describe('context', () => {
    const request: RequestContext = {
        clientId: '00000000-0000-0000-0000-000000000000',
        userToken: 'token',
        uri: 'https://example.com/',
        clientAgent: null,
        referrer: null,
        clientIp: null,
        preferredLocale: null,
        previewToken: null,
    };

    describe('getEnv', () => {
        it('should read the env binding from the load context', () => {
            const context: CroctContext = {
                env: {PUBLIC_CROCT_APP_ID: 'app'},
                croct: request,
            };

            expect(getEnv(context)).toEqual({PUBLIC_CROCT_APP_ID: 'app'});
        });
    });

    describe('getRequestContext', () => {
        it('should read the request context from the croct property', () => {
            const context: CroctContext = {
                env: {},
                croct: request,
            };

            expect(getRequestContext(context)).toBe(request);
        });

        it('should return null when the request context is missing', () => {
            const context: CroctContext = {env: {}};

            expect(getRequestContext(context)).toBeNull();
        });

        it('should return the request context when required and present', () => {
            const context: CroctContext = {
                env: {},
                croct: request,
            };

            expect(getRequestContext(context, true)).toBe(request);
        });

        it('should throw when required and the request context is missing', () => {
            const context: CroctContext = {env: {}};

            expect(() => getRequestContext(context, true))
                .toThrow('Croct\'s request context is missing.');
        });

        it('should read the Remix context without evaluating React Router 7\'s createContext', () => {
            const context: CroctContext = {
                env: {},
                croct: request,
            };

            expect(getRequestContext(context)).toBe(request);
            expect(createContext).not.toHaveBeenCalled();
        });
    });
});
