import {Token} from '@croct/sdk/token';
import type {Env} from '../config/env';
import {type CroctContext, type RequestContext} from '../config/context';
import {identify} from './identify';

describe('identify', () => {
    const APP_ID = '00000000-0000-0000-0000-000000000000';

    const baseRequest: RequestContext = {
        clientId: 'cid',
        userToken: 'old-token',
        uri: 'https://example.com/',
        clientAgent: null,
        referrer: null,
        clientIp: null,
        preferredLocale: null,
        previewToken: null,
    };

    function createContext(env: Env, request: RequestContext): CroctContext {
        return {env: env, croct: request};
    }

    it('should re-issue the user token for the given user', async () => {
        const request: RequestContext = {...baseRequest};
        const context = createContext({PUBLIC_CROCT_APP_ID: APP_ID}, request);

        await identify('user-id', context);

        expect(request.userToken).not.toBe('old-token');
        expect(Token.parse(request.userToken).getSubject()).toBe('user-id');
    });
});
