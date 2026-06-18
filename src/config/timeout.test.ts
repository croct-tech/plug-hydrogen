import {getDefaultFetchTimeout} from './timeout';

describe('getDefaultFetchTimeout', () => {
    const original = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = original;
    });

    it('should return undefined when unset outside production', () => {
        process.env.NODE_ENV = 'development';

        expect(getDefaultFetchTimeout({})).toBeUndefined();
        expect(getDefaultFetchTimeout({PUBLIC_CROCT_DEFAULT_FETCH_TIMEOUT: ''})).toBeUndefined();
    });

    it('should return the default timeout when unset in production', () => {
        process.env.NODE_ENV = 'production';

        expect(getDefaultFetchTimeout({})).toBe(2000);
    });

    it('should return the configured timeout', () => {
        expect(getDefaultFetchTimeout({PUBLIC_CROCT_DEFAULT_FETCH_TIMEOUT: '500'})).toBe(500);
    });

    it('should throw an error when the timeout is not a number', () => {
        expect(() => getDefaultFetchTimeout({PUBLIC_CROCT_DEFAULT_FETCH_TIMEOUT: 'invalid'}))
            .toThrow('Croct\'s default fetch timeout must be a non-negative integer');
    });

    it('should throw an error when the timeout is negative', () => {
        expect(() => getDefaultFetchTimeout({PUBLIC_CROCT_DEFAULT_FETCH_TIMEOUT: '-1'}))
            .toThrow('Croct\'s default fetch timeout must be a non-negative integer');
    });
});
