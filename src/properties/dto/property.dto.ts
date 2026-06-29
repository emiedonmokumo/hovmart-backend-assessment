import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
  Max,
  MinLength,
  IsDecimal,
} from 'class-validator';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Luxury 3-Bedroom Apartment in Lekki' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  title: string;

  @ApiProperty({ example: 'Beautiful 3-bedroom apartment with modern finishes...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 75000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price: number;

  @ApiProperty({ example: 'Lekki Phase 1' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '15 Admiralty Way, Lekki Phase 1' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiProperty({ enum: PropertyType, example: PropertyType.APARTMENT })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiPropertyOptional({ example: ['swimming pool', 'gym', 'parking', 'security'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export class UpdatePropertyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export class PropertyFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'Lekki' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 10000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ example: 100000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bedrooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isFeatured?: boolean;
}

export class PropertyImageDto {
  @ApiProperty({ example: 'https://cloudinary.com/image1.jpg' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'property_images/image1' })
  @IsString()
  publicId: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdatePropertyStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SOLD', 'RENTED'] })
  @IsEnum(['ACTIVE', 'SOLD', 'RENTED'])
  status: 'ACTIVE' | 'SOLD' | 'RENTED';
}

export class PropertyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  location: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  bedrooms?: number;

  @ApiPropertyOptional()
  bathrooms?: number;

  @ApiProperty({ enum: PropertyType })
  propertyType: PropertyType;

  @ApiProperty()
  amenities: string[];

  @ApiProperty({ enum: PropertyStatus })
  status: PropertyStatus;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  views: number;

  @ApiProperty()
  images: { id: string; url: string; isPrimary: boolean }[];

  @ApiProperty()
  agent: { id: string; fullName: string; email: string; phone: string };

  @ApiProperty()
  createdAt: Date;
}
