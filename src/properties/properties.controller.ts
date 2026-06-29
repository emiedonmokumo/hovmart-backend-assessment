import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyFilterDto,
  PropertyImageDto,
  UpdatePropertyStatusDto,
} from './dto/property.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search and filter properties' })
  @ApiResponse({ status: 200 })
  async findAll(@Query() dto: PropertyFilterDto) {
    return this.propertiesService.findAll(dto);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured properties' })
  @ApiResponse({ status: 200 })
  async getFeatured(@Query('limit') limit = 6) {
    return this.propertiesService.getFeatured(+limit);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.AGENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create new property listing (Agent only)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: 'Only approved agents' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePropertyDto,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
    });
    if (!agent) {
      throw new ForbiddenException('Agent profile not found');
    }
    return this.propertiesService.create(agent.id, userId, dto);
  }

  @Post(':id/images')
  @ApiBearerAuth()
  @Roles(UserRole.AGENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Add images to property' })
  @ApiResponse({ status: 200 })
  async addImages(
    @Param('id') propertyId: string,
    @CurrentUser('sub') userId: string,
    @Body() images: PropertyImageDto[],
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
    });
    if (!agent) {
      throw new ForbiddenException('Agent profile not found');
    }
    return this.propertiesService.addImages(propertyId, agent.id, images);
  }

  @Delete(':id/images/:imageId')
  @ApiBearerAuth()
  @Roles(UserRole.AGENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Remove image from property' })
  async removeImage(
    @Param('id') propertyId: string,
    @Param('imageId') imageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
    });
    if (!agent) {
      throw new ForbiddenException('Agent profile not found');
    }
    return this.propertiesService.removeImage(propertyId, imageId, agent.id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(UserRole.AGENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update property listing' })
  @ApiResponse({ status: 200 })
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
    });
    if (!agent) {
      throw new ForbiddenException('Agent profile not found');
    }
    return this.propertiesService.update(id, agent.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.AGENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete property listing' })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
    });
    if (!agent) {
      throw new ForbiddenException('Agent profile not found');
    }
    return this.propertiesService.delete(id, agent.id);
  }

  @Post(':id/submit')
  @ApiBearerAuth()
  @Roles(UserRole.AGENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Submit property for review' })
  @ApiResponse({ status: 200 })
  async submitForReview(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
    });
    if (!agent) {
      throw new ForbiddenException('Agent profile not found');
    }
    return this.propertiesService.submitForReview(id, agent.id);
  }

  @Post(':id/save')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save property to favorites' })
  @ApiResponse({ status: 201 })
  async saveProperty(
    @Param('id') propertyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.propertiesService.saveProperty(userId, propertyId);
  }

  @Delete(':id/save')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove property from favorites' })
  @ApiResponse({ status: 200 })
  async unsaveProperty(
    @Param('id') propertyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.propertiesService.unsaveProperty(userId, propertyId);
  }

  @Get('saved/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my saved properties' })
  @ApiResponse({ status: 200 })
  async getSavedProperties(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.propertiesService.getSavedProperties(userId, +page, +limit);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all properties (Admin only)' })
  async getAllAdmin(@Query() dto: PropertyFilterDto) {
    return this.propertiesService.findAll({ ...dto, status: undefined });
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Approve property listing (Admin only)' })
  async approveProperty(
    @Param('id') id: string,
    @Query('featured') isFeatured = 'false',
  ) {
    return this.propertiesService.approveProperty(id, isFeatured === 'true');
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update property status (Admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyStatusDto,
  ) {
    return this.propertiesService.updateStatus(id, dto);
  }

  @Get('admin/stats')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get property statistics (Admin only)' })
  async getStats() {
    return this.propertiesService.getStats();
  }
}
