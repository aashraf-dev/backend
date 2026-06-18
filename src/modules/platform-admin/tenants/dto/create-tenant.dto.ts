import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../../../../database/entities/platform/tenant.entity';
import { IsStrongPassword } from '../../../../shared/validators';

export class CreateTenantOwnerDto {
  @ApiProperty({ example: 'owner@happypaws.com' })
  @IsEmail({}, { message: 'Please provide a valid owner email' })
  @MaxLength(320)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'P@ssw0rd123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'Happy Paws Veterinary Clinic' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    example: 'happypaws',
    description:
      'Subdomain slug — auto-generated from name if omitted. Lowercase alphanumeric and hyphens only.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9]([a-z0-9-]{0,98}[a-z0-9])?$/, {
    message:
      'Slug must be lowercase alphanumeric with optional hyphens — no leading or trailing hyphens',
  })
  slug?: string;

  @ApiProperty({ example: 'clinic@happypaws.com' })
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  contactEmail: string;

  @ApiPropertyOptional({ example: '+12025551234' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ApiPropertyOptional({ example: '123 Main Street' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    example: 'US',
    description: 'ISO 3166-1 alpha-2 country code',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  country?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    default: SubscriptionPlan.TRIAL,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @ApiProperty({ type: () => CreateTenantOwnerDto })
  @ValidateNested()
  @Type(() => CreateTenantOwnerDto)
  owner: CreateTenantOwnerDto;
}
