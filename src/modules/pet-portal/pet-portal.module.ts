import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../../database/database.module';

// Platform entity for ClinicInfoService
import { TenantEntity } from '../../database/entities/platform/tenant.entity';

// Common
import { PortalContextService } from './common/portal-context.service';

// Registration & account
import { PortalAuthController } from './portal-auth/portal-auth.controller';
import { PortalAuthService } from './portal-auth/portal-auth.service';

// Owner profile
import { OwnerProfileController } from './owner-profile/owner-profile.controller';
import { OwnerProfileService } from './owner-profile/owner-profile.service';

// My pets
import { MyPetsController } from './my-pets/my-pets.controller';
import { MyPetsService } from './my-pets/my-pets.service';

// My appointments
import { MyAppointmentsController } from './my-appointments/my-appointments.controller';
import { MyAppointmentsService } from './my-appointments/my-appointments.service';

// My medical records
import { MyMedicalRecordsController } from './my-medical-records/my-medical-records.controller';
import { MyMedicalRecordsService } from './my-medical-records/my-medical-records.service';

// My prescriptions
import { MyPrescriptionsController } from './my-prescriptions/my-prescriptions.controller';
import { MyPrescriptionsService } from './my-prescriptions/my-prescriptions.service';

// Clinic info
import { ClinicInfoController } from './clinic-info/clinic-info.controller';
import { ClinicInfoService } from './clinic-info/clinic-info.service';

import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    DatabaseModule,
    // Register TenantEntity on the platform datasource for ClinicInfoService
    TypeOrmModule.forFeature([TenantEntity], 'platform'),
    JobsModule,
  ],
  controllers: [
    PortalAuthController,
    OwnerProfileController,
    MyPetsController,
    MyAppointmentsController,
    MyMedicalRecordsController,
    MyPrescriptionsController,
    ClinicInfoController,
  ],
  providers: [
    PortalContextService,
    PortalAuthService,
    OwnerProfileService,
    MyPetsService,
    MyAppointmentsService,
    MyMedicalRecordsService,
    MyPrescriptionsService,
    ClinicInfoService,
  ],
})
export class PetPortalModule {}
