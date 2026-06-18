import {issueToken} from '../config/security';
import {type CroctContext, getEnv, getRequestContext} from '../config/context';

/**
 * Anonymizes the current visitor by re-issuing an anonymous user token.
 *
 * Call it from your logout action with the action's `context`; the updated token is written on the
 * response by `writeCroctCookies` in `server.ts`.
 */
export async function anonymize(scope: CroctContext): Promise<void> {
    const request = getRequestContext(scope, true);

    request.userToken = (await issueToken(getEnv(scope), null)).toString();
}
