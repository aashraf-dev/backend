import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';

// Common
import { CrmContextService } from './common/crm-context.service';

// Staff
import { StaffController } from './staff/staff.controller';
import { StaffService } from './staff/staff.service';

// Departments
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';

// Designations
import { DesignationsController } from './designations/designations.controller';
import { DesignationsService } from './designations/designations.service';

// Roles
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';

// Appointments
import { AppointmentsController } from './appointments/appointments.controller';
import { AppointmentsService } from './appointments/appointments.service';

// Patients
import { PatientsController } from './patients/patients.controller';
import { PatientsService } from './patients/patients.service';

// Medical Records
import { MedicalRecordsController } from './medical-records/medical-records.controller';
import { MedicalRecordsService } from './medical-records/medical-records.service';

// Prescriptions
import { PrescriptionsController } from './prescriptions/prescriptions.controller';
import { PrescriptionsService } from './prescriptions/prescriptions.service';

// Clinic Services
import { ClinicServicesController } from './clinic-services/clinic-services.controller';
import { ClinicServicesService } from './clinic-services/clinic-services.service';

// Dashboard
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    StaffController,
    DepartmentsController,
    DesignationsController,
    RolesController,
    AppointmentsController,
    PatientsController,
    MedicalRecordsController,
    PrescriptionsController,
    ClinicServicesController,
    DashboardController,
  ],
  providers: [
    // Shared context helper — provided once, used by all services
    CrmContextService,

    StaffService,
    DepartmentsService,
    DesignationsService,
    RolesService,
    AppointmentsService,
    PatientsService,
    MedicalRecordsService,
    PrescriptionsService,
    ClinicServicesService,
    DashboardService,
  ],
  exports: [CrmContextService],
})
export class ClinicCrmModule {}
