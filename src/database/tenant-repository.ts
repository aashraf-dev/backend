import {
  EntityManager,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral,
  QueryDeepPartialEntity,
  SelectQueryBuilder,
  DeepPartial,
  DeleteResult,
  UpdateResult,
} from 'typeorm';
import { TenantConnectionService } from './tenant-connection.service';

/**
 * A lightweight, schema-aware wrapper around TypeORM operations.
 *
 * Every method sets `search_path` via the TenantConnectionService before
 * touching the database. Instantiated per-operation by TenantRepositoryFactory.
 */
export class TenantRepository<T extends ObjectLiteral> {
  constructor(
    private readonly entity: EntityTarget<T>,
    private readonly schema: string,
    private readonly connectionService: TenantConnectionService,
  ) {}

  findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.run((em) => em.findOne(this.entity, options));
  }

  find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.run((em) => em.find(this.entity, options));
  }

  findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return this.run((em) => em.findAndCount(this.entity, options));
  }

  count(options?: FindManyOptions<T>): Promise<number> {
    return this.run((em) => em.count(this.entity, options));
  }

  save(entity: DeepPartial<T>): Promise<T> {
    return this.run((em) => em.save(this.entity, entity as any));
  }

  saveMany(entities: DeepPartial<T>[]): Promise<T[]> {
    return this.run((em) => em.save(this.entity, entities as any[]));
  }

  update(
    criteria: string | string[] | Record<string, any>,
    partial: QueryDeepPartialEntity<T>,
  ): Promise<UpdateResult> {
    return this.run((em) => em.update(this.entity, criteria, partial));
  }

  softDelete(
    criteria: string | string[] | Record<string, any>,
  ): Promise<UpdateResult> {
    return this.run((em) => em.softDelete(this.entity, criteria));
  }

  restore(
    criteria: string | string[] | Record<string, any>,
  ): Promise<UpdateResult> {
    return this.run((em) => em.restore(this.entity, criteria));
  }

  delete(
    criteria: string | string[] | Record<string, any>,
  ): Promise<DeleteResult> {
    return this.run((em) => em.delete(this.entity, criteria));
  }

  /**
   * Escape hatch for complex queries.
   * The QueryBuilder is pre-scoped to the tenant schema.
   */
  withQueryBuilder<R>(
    alias: string,
    fn: (qb: SelectQueryBuilder<T>) => Promise<R>,
  ): Promise<R> {
    return this.run((em) => {
      const qb = em.createQueryBuilder(this.entity, alias);
      return fn(qb);
    });
  }

  /** Run multiple operations in a single shared transaction */
  inTransaction<R>(work: (repo: this) => Promise<R>): Promise<R> {
    return this.connectionService.runInTenantSchema(this.schema, async (em) => {
      const transactionalRepo = new TenantRepository<T>(
        this.entity,
        this.schema,
        this.connectionService,
      ) as this;
      // Override run() to use the provided EntityManager (already scoped)
      (transactionalRepo as any).run = <U>(
        fn: (em: EntityManager) => Promise<U>,
      ) => fn(em);
      return work(transactionalRepo);
    });
  }

  private run<R>(fn: (em: EntityManager) => Promise<R>): Promise<R> {
    return this.connectionService.runInTenantSchema(this.schema, fn);
  }
}

/**
 * Factory injectable — creates TenantRepository instances bound to a schema.
 * Inject this wherever tenant DB access is needed.
 */
@Injectable()
export class TenantRepositoryFactory {
  constructor(private readonly connectionService: TenantConnectionService) {}

  for<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    schema: string,
  ): TenantRepository<T> {
    return new TenantRepository<T>(entity, schema, this.connectionService);
  }
}

// Make TenantRepositoryFactory injectable
import { Injectable } from '@nestjs/common';
