import {getTrackingMode} from './tracking';

describe('getTrackingMode', () => {
    it('should return undefined when the tracking mode is unset', () => {
        expect(getTrackingMode({})).toBeUndefined();
        expect(getTrackingMode({PUBLIC_CROCT_TRACK: ''})).toBeUndefined();
    });

    it('should return the configured tracking mode', () => {
        expect(getTrackingMode({PUBLIC_CROCT_TRACK: 'auto'})).toBe('auto');
        expect(getTrackingMode({PUBLIC_CROCT_TRACK: 'always'})).toBe('always');
        expect(getTrackingMode({PUBLIC_CROCT_TRACK: 'never'})).toBe('never');
    });

    it('should throw an error when the tracking mode is invalid', () => {
        expect(() => getTrackingMode({PUBLIC_CROCT_TRACK: 'sometimes'}))
            .toThrow('Croct\'s tracking mode is invalid.');
    });
});
