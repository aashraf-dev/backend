import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { TenantConnectionService } from '../../../database/tenant-connection.service';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { OwnerProfileEntity } from '../../../database/entities/tenant/owner-profile.entity';
import { UserRoleEntity } from '../../../database/entities/tenant/user-role.entity';
import { RoleEntity } from '../../../database/entities/tenant/role.entity';
import { UserType } from '../../../shared/enums/user-type.enum';
import { IJwtPayload } from '../../../shared/interfaces/jwt-payload.interface';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import { PermissionResolverService } from 'src/core/servicese/permission-resolver.service';
import { PortalContextService } from '../common/portal-context.service';
import { RegisterPortalUserDto, UpdateEmailDto } from './dto';

export interface IRegistrationResult {
  userId: string;
  ownerProfileId: string;
  message: string;
}

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);
  private readonly bcryptRounds: number;

  constructor(
    private readonly portalCtx: PortalContextService,
    private readonly tenantConn: TenantConnectionService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly permissionResolver: PermissionResolverService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('auth.bcryptRounds')!;
  }

  // ── Self-registration ─────────────────────────────────────────

  async register(dto: RegisterPortalUserDto): Promise<IRegistrationResult> {
    const schema = this.portalCtx.getSchema();

    // Check for duplicate email
    const existing = await this.repoFactory
      .for(UserEntity, schema)
      .findOne({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException(
        'An account with this email already exists at this clinic',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    const { userId, ownerProfileId } = await this.tenantConn.runInTenantSchema(
      schema,
      async (em) => {
        // 1. Create the user account
        const user = em.create(UserEntity, {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userType: UserType.PET_OWNER,
          isActive: true,
          isEmailVerified: false,
        });
        const savedUser = await em.save(UserEntity, user);

        // 2. Create the owner profile
        const profile = em.create(OwnerProfileEntity, {
          userId: savedUser.id,
          phone: dto.phone ?? null,
        });
        const savedProfile = await em.save(OwnerProfileEntity, profile);

        // 3. Find and assign the pet_owner system role
        const petOwnerRole = await em.findOne(RoleEntity, {
          where: { name: 'pet_owner', isSystem: true },
        });

        if (petOwnerRole) {
          const userRole = em.create(UserRoleEntity, {
            userId: savedUser.id,
            roleId: petOwnerRole.id,
            assignedBy: null,
          });
          await em.save(UserRoleEntity, userRole);
        } else {
          this.logger.warn(
            `pet_owner system role not found in schema ${schema} — user ${savedUser.id} has no role`,
          );
        }

        return { userId: savedUser.id, ownerProfileId: savedProfile.id };
      },
    );

    this.logger.log(`New pet owner registered: ${userId} in schema ${schema}`);

    return {
      userId,
      ownerProfileId,
      message: 'Registration successful. Please log in to access your portal.',
    };
  }

  // ── Email change ──────────────────────────────────────────────

  async updateEmail(
    currentUser: IJwtPayload,
    dto: UpdateEmailDto,
  ): Promise<void> {
    const schema = this.portalCtx.getSchema();

    const user = await this.repoFactory.for(UserEntity, schema).findOne({
      where: { id: currentUser.sub },
      // Need passwordHash for verification — use raw query to select it
    });

    if (!user) throw new NotFoundException('User account not found');

    // Re-fetch with passwordHash (excluded by default)
    const userWithPass = await this.tenantConn.runInTenantSchema(schema, (em) =>
      em.findOne(UserEntity, {
        where: { id: currentUser.sub },
        select: {
          id: true,
          passwordHash: true,
          email: true,
        },
      }),
    );

    if (!userWithPass) throw new NotFoundException('User account not found');

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      userWithPass.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password');
    }

    const emailTaken = await this.repoFactory
      .for(UserEntity, schema)
      .findOne({ where: { email: dto.newEmail } });

    if (emailTaken) {
      throw new ConflictException('This email address is already in use');
    }

    await this.repoFactory.for(UserEntity, schema).update(currentUser.sub, {
      email: dto.newEmail,
      isEmailVerified: false,
    });

    // Invalidate caches
    await Promise.all([
      this.redis.del(CacheKeys.CURRENT_USER(currentUser.sub, schema)),
      this.permissionResolver.invalidateUserPermissions(
        currentUser.sub,
        schema,
      ),
    ]);

    this.logger.log(
      `Pet owner ${currentUser.sub} changed email in schema ${schema}`,
    );
  }
}
