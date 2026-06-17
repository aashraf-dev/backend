import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

export const LOCAL_STRATEGY = 'local';

/**
 * Minimal local strategy — actual credential validation is in the
 * auth service. This just wires up Passport.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, LOCAL_STRATEGY) {
  constructor() {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  /** Auth service overrides this via the guard — placeholder required by Passport */
  validate(email: string, _password: string): { email: string } {
    void _password;
    if (!email) throw new UnauthorizedException();
    return { email };
  }
}
