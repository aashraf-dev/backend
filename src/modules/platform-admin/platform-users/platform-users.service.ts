import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { DATA_SOURCE_PLATFORM } from 'src/shared/constants/data-source.constants';
import { PlatformUserEntity } from 'src/database/entities/platform';
import {
  UserType,
  PLATFORM_USER_TYPES,
} from '../../../shared/enums/user-type.enum';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import {
  IPaginatedResponse,
  buildPaginatedResponse,
} from '../../../shared/dto/paginated-response.interface';

import {
  CreatePlatformUserDto,
  UpdatePlatformUserDto,
  PlatformUsersQueryDto,
  PlatformUserSortBy,
} from './dto';

// Fields never returned in API responses
type SafePlatformUser = Omit<PlatformUserEntity, 'passwordHash' | 'mfaSecret'>;

@Injectable()
export class PlatformUsersService {
  private readonly logger = new Logger(PlatformUsersService.name);
  private readonly bcryptRounds: number;

  constructor(
    @InjectDataSource(DATA_SOURCE_PLATFORM)
    private readonly platformDs: DataSource,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('auth.bcryptRounds')!;
  }

  // ── Create ───────────────────────────────────────────────────────

  async create(
    dto: CreatePlatformUserDto,
    actor: IJwtPayload,
  ): Promise<SafePlatformUser> {
    this.assertPlatformUserType(dto.userType);
    this.assertCanManageUserType(actor, dto.userType);

    const existing = await this.platformDs
      .getRepository(PlatformUserEntity)
      .findOne({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException(
        `A platform user with email "${dto.email}" already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    const user = this.platformDs.getRepository(PlatformUserEntity).create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      userType: dto.userType,
      passwordHash,
      isActive: true,
    });

    const saved = await this.platformDs
      .getRepository(PlatformUserEntity)
      .save(user);

    this.logger.log(
      `Platform user created: ${saved.id} (${saved.email}) by ${actor.sub}`,
    );

    return this.stripSensitiveFields(saved);
  }

  // ── Read ──────────────────────────────────────────────────────────

  async findAll(
    query: PlatformUsersQueryDto,
  ): Promise<IPaginatedResponse<SafePlatformUser>> {
    const qb = this.platformDs
      .getRepository(PlatformUserEntity)
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL')
      .select([
        'u.id',
        'u.email',
        'u.firstName',
        'u.lastName',
        'u.userType',
        'u.isActive',
        'u.mfaEnabled',
        'u.lastLoginAt',
        'u.lastLoginIp',
        'u.createdAt',
        'u.updatedAt',
      ]);

    if (query.search) {
      qb.andWhere(
        '(u.email ILIKE :s OR u.first_name ILIKE :s OR u.last_name ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    if (query.userType) {
      qb.andWhere('u.user_type = :userType', { userType: query.userType });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive: query.isActive });
    }

    const sortMap: Record<PlatformUserSortBy, string> = {
      [PlatformUserSortBy.EMAIL]: 'u.email',
      [PlatformUserSortBy.CREATED_AT]: 'u.created_at',
      [PlatformUserSortBy.LAST_LOGIN]: 'u.last_login_at',
      [PlatformUserSortBy.FIRST_NAME]: 'u.first_name',
    };

    qb.orderBy(
      sortMap[query.sortBy ?? PlatformUserSortBy.CREATED_AT],
      query.sortOrder ?? 'DESC',
    );

    qb.skip(query.skip).take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    return buildPaginatedResponse(
      items.map((u) => this.stripSensitiveFields(u)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string): Promise<SafePlatformUser> {
    const user = await this.platformDs
      .getRepository(PlatformUserEntity)
      .createQueryBuilder('u')
      .where('u.id = :id AND u.deleted_at IS NULL', { id })
      .select([
        'u.id',
        'u.email',
        'u.firstName',
        'u.lastName',
        'u.userType',
        'u.isActive',
        'u.mfaEnabled',
        'u.lastLoginAt',
        'u.lastLoginIp',
        'u.createdAt',
        'u.updatedAt',
        'u.failedLoginAttempts',
        'u.lockedUntil',
      ])
      .getOne();

    if (!user) {
      throw new NotFoundException(`Platform user "${id}" not found`);
    }

    return this.stripSensitiveFields(user);
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdatePlatformUserDto,
    actor: IJwtPayload,
  ): Promise<SafePlatformUser> {
    const user = await this.findOne(id);

    if (dto.userType) {
      this.assertPlatformUserType(dto.userType);
      this.assertCanManageUserType(actor, dto.userType);
    }

    // Prevent self-demotion
    if (id === actor.sub && dto.userType && dto.userType !== actor.userType) {
      throw new ForbiddenException('You cannot change your own user type');
    }

    await this.platformDs.getRepository(PlatformUserEntity).update(id, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.userType !== undefined && { userType: dto.userType }),
    });

    // Invalidate profile cache
    await this.redis.del(CacheKeys.CURRENT_USER(id, null));

    return this.findOne(id);
  }

  // ── Activate / Deactivate ────────────────────────────────────────

  async setActive(
    id: string,
    isActive: boolean,
    actor: IJwtPayload,
  ): Promise<SafePlatformUser> {
    if (id === actor.sub && !isActive) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    await this.findOne(id); // ensures exists

    await this.platformDs
      .getRepository(PlatformUserEntity)
      .update(id, { isActive });

    if (!isActive) {
      // Invalidate profile + permission caches → sessions will fail JwtStrategy check
      await this.redis.del(CacheKeys.CURRENT_USER(id, null));
      await this.redis.del(CacheKeys.USER_PERMISSIONS(id, 'platform'));
      this.logger.log(`Platform user ${id} deactivated by ${actor.sub}`);
    }

    return this.findOne(id);
  }

  // ── Private ───────────────────────────────────────────────────────

  private assertPlatformUserType(userType: UserType): void {
    if (!PLATFORM_USER_TYPES.includes(userType)) {
      throw new ForbiddenException(
        `"${userType}" is not a valid platform user type. ` +
          `Allowed: [${PLATFORM_USER_TYPES.join(', ')}]`,
      );
    }
  }

  private assertCanManageUserType(
    actor: IJwtPayload,
    targetType: UserType,
  ): void {
    // Only super admins can create/promote other super admins
    if (
      targetType === UserType.PLATFORM_SUPER_ADMIN &&
      actor.userType !== UserType.PLATFORM_SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only a super admin can create or promote another super admin',
      );
    }
  }

  private stripSensitiveFields(user: PlatformUserEntity): SafePlatformUser {
    const { passwordHash, mfaSecret, ...safe } = user as any;
    return safe as SafePlatformUser;
  }
}
