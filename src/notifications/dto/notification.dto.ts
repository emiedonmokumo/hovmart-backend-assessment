import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsBoolean } from 'class-validator';

export enum NotificationType {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  SMS = 'SMS',
}

export class CreateNotificationDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.EMAIL })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'Payment Successful' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Your payment of NGN 500,000 has been processed successfully.' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: { transactionId: 'abc123', amount: 500000 } })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class MarkReadDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  read: boolean;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: Record<string, any>;

  @ApiProperty()
  read: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  readAt?: Date;
}
