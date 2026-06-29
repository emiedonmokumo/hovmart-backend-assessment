import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';

export enum IdType {
  NIN = 'NIN',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  PASSPORT = 'PASSPORT',
  VOTERS_CARD = 'VOTERS_CARD',
}

export class InitiateKycDto {
  @ApiPropertyOptional({ example: '12345678901', minLength: 11, maxLength: 11 })
  @IsOptional()
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  nin?: string;

  @ApiPropertyOptional({ example: '12345678901', minLength: 11, maxLength: 11 })
  @IsOptional()
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  bvn?: string;
}

export class SubmitIdVerificationDto {
  @ApiProperty({ enum: IdType })
  @IsEnum(IdType)
  idType: IdType;

  @ApiProperty({ example: 'A12345678' })
  @IsString()
  idNumber: string;

  @ApiProperty({ example: 'https://cloudinary.com/id-document.jpg' })
  @IsUrl()
  idDocumentUrl: string;
}

export class SubmitSelfieDto {
  @ApiProperty({ example: 'https://cloudinary.com/selfie.jpg' })
  @IsUrl()
  selfieImageUrl: string;
}

export class SubmitProofOfAddressDto {
  @ApiProperty({ example: 'https://cloudinary.com/utility-bill.jpg' })
  @IsUrl()
  proofOfAddressUrl: string;
}

export class UpdateKycStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Documents verified successfully' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class KycResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  nin?: string;

  @ApiPropertyOptional()
  bvn?: string;

  @ApiPropertyOptional({ enum: IdType })
  idType?: IdType;

  @ApiPropertyOptional()
  idNumber?: string;

  @ApiPropertyOptional()
  idDocumentUrl?: string;

  @ApiPropertyOptional()
  selfieImageUrl?: string;

  @ApiPropertyOptional()
  proofOfAddressUrl?: string;

  @ApiProperty({ enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] })
  status: string;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;
}
