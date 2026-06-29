import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class ApproveEscrowDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ example: 'All documents verified' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Documents not valid' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class DisputeEscrowDto {
  @ApiProperty({ example: 'Property not as described' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 'Additional details about the dispute...' })
  @IsOptional()
  @IsString()
  details?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['release', 'refund'] })
  @IsEnum(['release', 'refund'])
  action: 'release' | 'refund';

  @ApiPropertyOptional({ example: 'Resolution notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundEscrowDto {
  @ApiPropertyOptional({ example: 'Buyer requested refund after dispute review' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EscrowResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  sellerId: string;

  @ApiPropertyOptional()
  propertyId?: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  platformFee: number;

  @ApiProperty()
  sellerAmount: number;

  @ApiProperty({ enum: ['PENDING', 'FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED'] })
  status: string;

  @ApiPropertyOptional()
  fundedAt?: Date;

  @ApiPropertyOptional()
  releasedAt?: Date;

  @ApiPropertyOptional()
  refundedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedEscrowsResponseDto {
  @ApiProperty({ type: [EscrowResponseDto] })
  data: EscrowResponseDto[];

  @ApiProperty({
    example: {
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class EscrowStatsResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  funded: number;

  @ApiProperty()
  released: number;

  @ApiProperty()
  refunded: number;

  @ApiProperty()
  disputed: number;

  @ApiProperty()
  totalReleased: number;
}
