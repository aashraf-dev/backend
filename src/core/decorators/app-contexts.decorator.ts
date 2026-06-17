import { SetMetadata } from '@nestjs/common';
import { AppContext } from '../../shared/enums/app-context.enum';

export const APP_CONTEXTS_KEY = 'ALLOWED_APP_CONTEXTS';

/**
 * Restrict a route to one or more app surfaces.
 *
 * @example @AppContexts(AppContext.CRM, AppContext.ADMIN)
 */
export const AppContexts = (...contexts: AppContext[]) =>
  SetMetadata(APP_CONTEXTS_KEY, contexts);
