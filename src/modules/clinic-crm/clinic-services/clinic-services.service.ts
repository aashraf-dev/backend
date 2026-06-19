import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantRepositoryFactory } from '../../../database/tenant-repository';
import { ClinicServiceEntity } from '../../../database/entities/tenant/clinic-service.entity';
import { CrmContextService } from '../common/crm-context.service';
import { CreateClinicServiceDto } from './dto/create-clinic-service.dto';

export class UpdateClinicServiceDto {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  category?: string;
  isActive?: boolean;
}

@Injectable()
export class ClinicServicesService {
  constructor(
    private readonly crmCtx: CrmContextService,
    private readonly repoFactory: TenantRepositoryFactory,
  ) {}

  findAll(activeOnly = false): Promise<ClinicServiceEntity[]> {
    const schema = this.crmCtx.getSchema();
    const repo = this.repoFactory.for(ClinicServiceEntity, schema);
    return repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ClinicServiceEntity> {
    const svc = await this.repoFactory
      .for(ClinicServiceEntity, this.crmCtx.getSchema())
      .findOne({ where: { id } });
    if (!svc) throw new NotFoundException(`Service "${id}" not found`);
    return svc;
  }

  async create(dto: CreateClinicServiceDto): Promise<ClinicServiceEntity> {
    const schema = this.crmCtx.getSchema();
    const existing = await this.repoFactory
      .for(ClinicServiceEntity, schema)
      .findOne({ where: { name: dto.name } });
    if (existing)
      throw new ConflictException(`Service "${dto.name}" already exists`);

    return this.repoFactory.for(ClinicServiceEntity, schema).save({
      name: dto.name,
      description: dto.description ?? null,
      durationMinutes: dto.durationMinutes ?? 30,
      price: dto.price ?? null,
      category: dto.category ?? null,
      isActive: true,
    });
  }

  async update(
    id: string,
    dto: UpdateClinicServiceDto,
  ): Promise<ClinicServiceEntity> {
    const schema = this.crmCtx.getSchema();
    await this.findOne(id);
    await this.repoFactory.for(ClinicServiceEntity, schema).update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repoFactory
      .for(ClinicServiceEntity, this.crmCtx.getSchema())
      .softDelete(id);
  }
}
