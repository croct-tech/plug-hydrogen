import type {Env} from './env';

/**
 * The automatic-tracking mode the provider applies to the Croct SDK.
 *
 * @internal
 */
export type TrackingMode = 'auto' | 'always' | 'never';

const TRACKING_MODES: TrackingMode[] = ['auto', 'always', 'never'];

function isTrackingMode(value: string): value is TrackingMode {
    return TRACKING_MODES.some(mode => mode === value);
}

/**
 * @internal
 */
export function getTrackingMode(env: Env): TrackingMode | undefined {
    const mode = env.PUBLIC_CROCT_TRACK ?? '';

    if (mode === '') {
        return undefined;
    }

    if (!isTrackingMode(mode)) {
        throw new Error(
            'Croct\'s tracking mode is invalid. '
            + `Expected one of ${TRACKING_MODES.map(value => `"${value}"`).join(', ')} `
            + 'in the `PUBLIC_CROCT_TRACK` environment variable, '
            + `but got "${mode}".`,
        );
    }

    return mode;
}
