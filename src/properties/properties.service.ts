import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyFilterDto,
  PropertyImageDto,
  UpdatePropertyStatusDto,
} from './dto/property.dto';
import { PropertyStatus, Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(agentId: string, agentUserId: string, dto: CreatePropertyDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.status !== 'APPROVED') {
      throw new ForbiddenException('Only approved agents can create listings');
    }

    const property = await this.prisma.property.create({
      data: {
        agentId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        location: dto.location,
        state: dto.state,
        city: dto.city,
        address: dto.address,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        propertyType: dto.propertyType,
        amenities: dto.amenities || [],
        status: PropertyStatus.DRAFT,
      },
      include: {
        images: true,
        agent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return property;
  }

  async addImages(propertyId: string, agentId: string, images: PropertyImageDto[]) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, agentId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const createdImages = await this.prisma.propertyImage.createMany({
      data: images.map((img) => ({
        propertyId,
        url: img.url,
        publicId: img.publicId,
        isPrimary: img.isPrimary || false,
      })),
    });

    return this.findOne(propertyId);
  }

  async removeImage(propertyId: string, imageId: string, agentId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, agentId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    await this.prisma.propertyImage.delete({
      where: { id: imageId },
    });

    return { message: 'Image removed' };
  }

  async findAll(dto: PropertyFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      propertyType,
      state,
      city,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      status,
      isFeatured,
    } = dto;

    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      status: status || PropertyStatus.ACTIVE,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    if (bedrooms !== undefined) {
      where.bedrooms = { gte: bedrooms };
    }

    if (bathrooms !== undefined) {
      where.bathrooms = { gte: bathrooms };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        skip,
        take: limit,
        where,
        include: {
          images: true,
          agent: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data: properties,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        images: true,
        agent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            companyName: true,
            specialization: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    await this.prisma.property.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return property;
  }

  async update(id: string, agentId: string, dto: UpdatePropertyDto) {
    const property = await this.prisma.property.findFirst({
      where: { id, agentId },
    });

    if (!property) {
      throw new NotFoundException('Property not found or not authorized');
    }

    return this.prisma.property.update({
      where: { id },
      data: dto,
      include: {
        images: true,
        agent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async delete(id: string, agentId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, agentId },
    });

    if (!property) {
      throw new NotFoundException('Property not found or not authorized');
    }

    await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.DRAFT },
    });

    return { message: 'Property deleted successfully' };
  }

  async submitForReview(id: string, agentId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, agentId },
      include: { images: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.images.length === 0) {
      throw new BadRequestException('Please add at least one image');
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        status: PropertyStatus.PENDING_REVIEW,
      },
    });
  }

  async approveProperty(id: string, isFeatured = false) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        status: PropertyStatus.ACTIVE,
        isFeatured,
        publishedAt: new Date(),
      },
    });
  }

  async updateStatus(id: string, dto: UpdatePropertyStatusDto) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        status: dto.status as PropertyStatus,
      },
    });
  }

  async saveProperty(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const existing = await this.prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Property already saved');
    }

    return this.prisma.savedProperty.create({
      data: {
        userId,
        propertyId,
      },
    });
  }

  async unsaveProperty(userId: string, propertyId: string) {
    await this.prisma.savedProperty.delete({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    }).catch(() => undefined);

    return { message: 'Property removed from saved' };
  }

  async getSavedProperties(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [saved, total] = await Promise.all([
      this.prisma.savedProperty.findMany({
        skip,
        take: limit,
        where: { userId },
        include: {
          property: {
            include: {
              images: true,
              agent: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedProperty.count({ where: { userId } }),
    ]);

    return {
      data: saved.map((s) => s.property),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getFeatured(limit = 6) {
    return this.prisma.property.findMany({
      where: {
        status: PropertyStatus.ACTIVE,
        isFeatured: true,
      },
      take: limit,
      include: {
        images: true,
        agent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const [total, active, pending, sold, rented, featured] = await Promise.all([
      this.prisma.property.count(),
      this.prisma.property.count({ where: { status: PropertyStatus.ACTIVE } }),
      this.prisma.property.count({ where: { status: PropertyStatus.PENDING_REVIEW } }),
      this.prisma.property.count({ where: { status: PropertyStatus.SOLD } }),
      this.prisma.property.count({ where: { status: PropertyStatus.RENTED } }),
      this.prisma.property.count({ where: { isFeatured: true, status: PropertyStatus.ACTIVE } }),
    ]);

    return {
      total,
      active,
      pending,
      sold,
      rented,
      featured,
    };
  }
}
