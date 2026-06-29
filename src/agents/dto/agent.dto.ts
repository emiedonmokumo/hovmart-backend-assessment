import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class AgentBasicProfileDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john.doe@agency.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  state: string;
}

export class AgentProfessionalDetailsDto {
  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ example: 'ABC Properties Ltd' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Residential, Commercial, Land' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ example: 'RC1234567' })
  @IsOptional()
  @IsString()
  cacNumber?: string;
}

export class AgentDocumentsDto {
  @ApiProperty({ example: 'https://cloudinary.com/gov-id.jpg' })
  @IsString()
  governmentIdUrl: string;

  @ApiProperty({ example: 'https://cloudinary.com/passport.jpg' })
  @IsString()
  passportPhotoUrl: string;

  @ApiProperty({ example: 'https://cloudinary.com/utility-bill.jpg' })
  @IsString()
  utilityBillUrl: string;
}

export class CreateAgentApplicationDto extends AgentBasicProfileDto {
  @ApiPropertyOptional({ type: AgentProfessionalDetailsDto })
  @IsOptional()
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cacNumber?: string;
}

export class UpdateAgentStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Documents verified successfully' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class AgentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiPropertyOptional()
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  specialization?: string;

  @ApiPropertyOptional()
  cacNumber?: string;

  @ApiPropertyOptional()
  governmentIdUrl?: string;

  @ApiPropertyOptional()
  passportPhotoUrl?: string;

  @ApiPropertyOptional()
  utilityBillUrl?: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;
}
