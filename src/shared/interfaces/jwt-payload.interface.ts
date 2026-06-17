import { AppContext } from '../enums/app-context.enum';
import { UserType } from '../enums/user-type.enum';

export interface IJwtPayload {
  sub: string;
  tenantId: string | null;
  tenantSchema: string | null;
  appContext: AppContext;
  userType: UserType;
  permissions: string[];
  sessionId: string;
  /** mfa_pending tokens are rejected by JwtAuthGuard — only valid on /auth/mfa/verify */
  tokenType: 'access' | 'refresh' | 'mfa_pending';
  iat?: number;
  exp?: number;
}
