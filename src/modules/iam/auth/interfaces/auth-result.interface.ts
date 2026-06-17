import { AppContext } from '../../../../shared/enums/app-context.enum';
import { UserType } from '../../../../shared/enums/user-type.enum';

export interface IAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

export interface ILoginSuccess {
  mfaRequired: false;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: IAuthUser;
}

export interface IMfaRequired {
  mfaRequired: true;
  mfaToken: string;
  expiresIn: number;
}

export type ILoginResult = ILoginSuccess | IMfaRequired;

export interface ITokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IMfaSetupResult {
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

export interface IMfaEnableResult {
  recoveryCodes: string[];
}

export interface ICurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  appContext: AppContext;
  tenantId: string | null;
  designation: { id: string; name: string } | null;
  departments: Array<{ id: string; name: string; isPrimary: boolean }>;
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  permissions: string[];
}

export interface ISessionInfo {
  id: string;
  appContext: AppContext;
  ipAddress: string;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}
