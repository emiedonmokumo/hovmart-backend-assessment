import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import {
  AgentBasicProfileDto,
  AgentProfessionalDetailsDto,
  AgentDocumentsDto,
  UpdateAgentStatusDto,
} from './dto/agent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Agents')
@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 1: Create agent application with basic profile' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Already applied' })
  async createBasicProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: AgentBasicProfileDto,
  ) {
    return this.agentsService.createBasicProfile(userId, dto);
  }

  @Put('apply/:id/professional')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 2: Add professional details' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Agent profile not found' })
  async updateProfessionalDetails(
    @Param('id') agentId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AgentProfessionalDetailsDto,
  ) {
    return this.agentsService.updateProfessionalDetails(agentId, userId, dto);
  }

  @Put('apply/:id/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 3: Upload verification documents' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Agent profile not found' })
  async uploadDocuments(
    @Param('id') agentId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AgentDocumentsDto,
  ) {
    return this.agentsService.uploadDocuments(agentId, userId, dto);
  }

  @Post('apply/:id/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 4: Submit application for review' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Incomplete application' })
  async submitForReview(
    @Param('id') agentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.agentsService.submitForReview(agentId, userId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my agent profile' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Agent profile not found' })
  async getMyProfile(@CurrentUser('sub') userId: string) {
    return this.agentsService.getMyProfile(userId);
  }

  @Get('me/properties')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my listed properties' })
  @ApiResponse({ status: 200 })
  async getMyProperties(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const agent = await this.agentsService.getMyProfile(userId);
    return this.agentsService.getAgentProperties(agent.id, +page, +limit);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all agent applications (Admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.agentsService.findAll(+page, +limit, status as any);
  }

  @Get('stats')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get agent statistics (Admin only)' })
  @ApiResponse({ status: 200 })
  async getStats() {
    return this.agentsService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Get(':id/properties')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get properties listed by an agent' })
  @ApiResponse({ status: 200 })
  async getAgentProperties(
    @Param('id') agentId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.agentsService.getAgentProperties(agentId, +page, +limit);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Approve or reject agent application (Admin only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Already processed' })
  async updateStatus(
    @CurrentUser('sub') adminId: string,
    @Param('id') agentId: string,
    @Body() dto: UpdateAgentStatusDto,
  ) {
    return this.agentsService.updateStatus(adminId, agentId, dto);
  }
}
