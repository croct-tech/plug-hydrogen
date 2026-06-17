import {issueToken} from '../config/security';
import {type CroctContext, getEnv, getRequestContext} from '../config/context';

/**
 * Identifies the current visitor by re-issuing the user token for the given user.
 *
 * Call it from your login action with the action's `context`; the updated token is written on the
 * response by `writeCroctCookies` in `server.ts`.
 */
export async function identify(userId: string, context: CroctContext): Promise<void> {
    const request = getRequestContext(context);

    request.userToken = (await issueToken(getEnv(context), userId)).toString();
}
