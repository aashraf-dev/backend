import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { DesignationEntity } from '../../../database/entities/tenant/designation.entity';
import { DepartmentEntity } from '../../../database/entities/tenant/department.entity';
import { UserEntity } from '../../../database/entities/tenant/user.entity';
import { CrmContextService } from '../common/crm-context.service';
import { PermissionResolverService } from 'src/core/servicese/permission-resolver.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import { CreateDesignationDto, UpdateDesignationDto } from './dto';

@Injectable()
export class DesignationsService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly permissionResolver: PermissionResolverService,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<DesignationEntity[]> {
    return this.repoFactory
      .for(DesignationEntity, this.crmCtx.getSchema())
      .find({
        order: { name: 'ASC' },
      });
  }

  async findOne(id: string): Promise<DesignationEntity> {
    const desig = await this.repoFactory
      .for(DesignationEntity, this.crmCtx.getSchema())
      .findOne({ where: { id } });
    if (!desig) throw new NotFoundException(`Designation "${id}" not found`);
    return desig;
  }

  async create(dto: CreateDesignationDto): Promise<DesignationEntity> {
    const schema = this.crmCtx.getSchema();
    const repo = this.repoFactory.for(DesignationEntity, schema);

    const existing = await repo.findOne({ where: { name: dto.name } });
    if (existing)
      throw new ConflictException(`Designation "${dto.name}" already exists`);

    if (dto.departmentId) {
      const dept = await this.repoFactory
        .for(DepartmentEntity, schema)
        .findOne({ where: { id: dto.departmentId } });
      if (!dept)
        throw new NotFoundException(
          `Department "${dto.departmentId}" not found`,
        );
    }

    return repo.save({
      name: dto.name,
      departmentId: dto.departmentId ?? null,
      description: dto.description ?? null,
      isActive: true,
    });
  }

  async update(
    id: string,
    dto: UpdateDesignationDto,
  ): Promise<DesignationEntity> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);

    await this.repoFactory.for(DesignationEntity, schema).update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    if (dto.isActive === false) {
      await this.permissionResolver.invalidateDesignationPermissions(
        id,
        schema,
      );
      await this.redis.del(CacheKeys.DESIGNATION_HOLDERS(id, schema));
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);

    const holderCount = await this.repoFactory
      .for(UserEntity, schema)
      .count({ where: { designationId: id } });

    if (holderCount > 0) {
      throw new ConflictException(
        `Cannot delete designation held by ${holderCount} staff member(s). Reassign first.`,
      );
    }

    await this.repoFactory.for(DesignationEntity, schema).softDelete(id);
    await this.redis.del(CacheKeys.DESIGNATION_ROLES(id, schema));
    await this.redis.del(CacheKeys.DESIGNATION_HOLDERS(id, schema));
  }
}
