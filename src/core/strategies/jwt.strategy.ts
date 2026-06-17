import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../shared/redis/redis.service';
import { CacheKeys } from '../../shared/constants/cache-keys.constant';

export const JWT_STRATEGY = 'jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(
    configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwt.accessSecret')!,
    });
  }

  async validate(payload: IJwtPayload): Promise<IJwtPayload> {
    // Reject refresh tokens used as access tokens
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check server-side session (enables instant revocation)
    const sessionKey = CacheKeys.SESSION(payload.sessionId);
    const sessionExists = await this.redis.exists(sessionKey);

    if (!sessionExists) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return payload; // Attached to req.user by Passport
  }
}
