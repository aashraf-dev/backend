import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { DepartmentEntity } from '../../../database/entities/tenant/department.entity';
import { UserDepartmentEntity } from '../../../database/entities/tenant/user-department.entity';
import { CrmContextService } from '../common/crm-context.service';
import { PermissionResolverService } from 'src/core/servicese/permission-resolver.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { CacheKeys } from '../../../shared/constants/cache-keys.constant';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
    private readonly permissionResolver: PermissionResolverService,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<DepartmentEntity[]> {
    return this.repoFactory
      .for(DepartmentEntity, this.crmCtx.getSchema())
      .find({
        order: { name: 'ASC' },
      });
  }

  async findOne(id: string): Promise<DepartmentEntity> {
    const dept = await this.repoFactory
      .for(DepartmentEntity, this.crmCtx.getSchema())
      .findOne({ where: { id } });
    if (!dept) throw new NotFoundException(`Department "${id}" not found`);
    return dept;
  }

  async create(dto: CreateDepartmentDto): Promise<DepartmentEntity> {
    const schema = this.crmCtx.getSchema();
    const repo = this.repoFactory.for(DepartmentEntity, schema);

    const existing = await repo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Department "${dto.name}" already exists`);
    }

    return repo.save({
      name: dto.name,
      description: dto.description ?? null,
      isActive: true,
    });
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentEntity> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);

    await this.repoFactory.for(DepartmentEntity, schema).update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    // If deactivated, invalidate permissions of all department members
    if (dto.isActive === false) {
      await this.permissionResolver.invalidateDepartmentPermissions(id, schema);
      await this.redis.del(CacheKeys.DEPARTMENT_MEMBERS(id, schema));
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);

    const memberCount = await this.repoFactory
      .for(UserDepartmentEntity, schema)
      .count({ where: { departmentId: id } });

    if (memberCount > 0) {
      throw new ConflictException(
        `Cannot delete department with ${memberCount} member(s). Reassign or remove members first.`,
      );
    }

    await this.repoFactory.for(DepartmentEntity, schema).softDelete(id);
    await this.redis.del(CacheKeys.DEPARTMENT_ROLES(id, schema));
    await this.redis.del(CacheKeys.DEPARTMENT_MEMBERS(id, schema));
  }
}
