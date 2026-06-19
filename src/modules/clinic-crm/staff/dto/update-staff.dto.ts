import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto';

/** Email and password are not updatable here — separate endpoints handle those */
export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, [
    'email',
    'password',
    'roleIds',
    'departmentIds',
    'primaryDepartmentId',
  ] as const),
) {}
