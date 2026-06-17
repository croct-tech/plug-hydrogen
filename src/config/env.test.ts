import {getEnvEntry, getEnvEntryFlag, getEnvFlag, getEnvValue} from './env';

describe('env', () => {
    describe('getEnvValue', () => {
        it('should return the value when present', () => {
            expect(getEnvValue('value')).toBe('value');
        });

        it('should return undefined for an undefined value', () => {
            expect(getEnvValue(undefined)).toBeUndefined();
        });

        it('should return undefined for an empty value', () => {
            expect(getEnvValue('')).toBeUndefined();
        });

        it('should normalize the value when a normalizer is given', () => {
            expect(getEnvValue('42', Number)).toBe(42);
        });

        it('should normalize an empty value when a normalizer is given', () => {
            expect(getEnvValue('', value => value === '')).toBe(true);
        });
    });

    describe('getEnvFlag', () => {
        it('should return true for "true"', () => {
            expect(getEnvFlag('true')).toBe(true);
        });

        it('should return false for any other value', () => {
            expect(getEnvFlag('false')).toBe(false);
            expect(getEnvFlag(undefined)).toBe(false);
        });
    });

    describe('getEnvEntry', () => {
        it('should return an entry when the value is present', () => {
            expect(getEnvEntry('key', 'value')).toEqual({key: 'value'});
        });

        it('should return undefined for an undefined value', () => {
            expect(getEnvEntry('key', undefined)).toBeUndefined();
        });

        it('should return undefined for an empty value', () => {
            expect(getEnvEntry('key', '')).toBeUndefined();
        });

        it('should normalize the value when a normalizer is given', () => {
            expect(getEnvEntry('key', '42', Number)).toEqual({key: 42});
        });
    });

    describe('getEnvEntryFlag', () => {
        it('should return a boolean entry when the value is present', () => {
            expect(getEnvEntryFlag('key', 'true')).toEqual({key: true});
            expect(getEnvEntryFlag('key', 'no')).toEqual({key: false});
        });

        it('should return undefined for an empty value', () => {
            expect(getEnvEntryFlag('key', undefined)).toBeUndefined();
        });
    });
});
