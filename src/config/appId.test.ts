import {getAppId} from './appId';

describe('getAppId', () => {
    const appId = '00000000-0000-0000-0000-000000000000';

    it('should return the application ID', () => {
        expect(getAppId({PUBLIC_CROCT_APP_ID: appId})).toBe(appId);
    });

    it('should throw an error when the application ID is missing', () => {
        expect(() => getAppId({})).toThrow('Croct\'s Application ID is missing.');
        expect(() => getAppId({PUBLIC_CROCT_APP_ID: ''})).toThrow('Croct\'s Application ID is missing.');
    });

    it('should throw an error when the application ID is invalid', () => {
        expect(() => getAppId({PUBLIC_CROCT_APP_ID: 'invalid'})).toThrow('Croct\'s Application ID is invalid.');
    });
});
