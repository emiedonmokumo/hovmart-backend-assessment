import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionType {
  RESERVATION_FEE = 'RESERVATION_FEE',
  LISTING_PAYMENT = 'LISTING_PAYMENT',
  ESCROW_PAYMENT = 'ESCROW_PAYMENT',
}

export class InitializePaymentDto {
  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({ example: 'property-uuid' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({
    example: 'seller-user-uuid',
    description:
      'Seller user ID. Omit this when propertyId is provided; if sent with propertyId, it may be either the property agent ID or seller user ID.',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'abc123paystackref' })
  @IsString()
  reference: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  authorizationUrl: string | null;

  @ApiProperty()
  accessCode: string | null;

  @ApiProperty()
  reference: string;
}

export class WebhookPayloadDto {
  @ApiProperty()
  event: string;

  @ApiProperty()
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    channel: string;
    currency: string;
    metadata: Record<string, any>;
    customer: {
      id: number;
      email: string;
    };
  };
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  buyerId: string;

  @ApiPropertyOptional()
  sellerId?: string;

  @ApiPropertyOptional()
  propertyId?: string;

  @ApiProperty()
  type: TransactionType;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  paidAt?: Date;
}
