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
import { KycService } from './kyc.service';
import {
  InitiateKycDto,
  SubmitIdVerificationDto,
  SubmitSelfieDto,
  SubmitProofOfAddressDto,
  UpdateKycStatusDto,
} from './dto/kyc.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('initiate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate KYC with NIN and/or BVN' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'KYC already initiated' })
  async initiateKyc(
    @CurrentUser('sub') userId: string,
    @Body() dto: InitiateKycDto,
  ) {
    return this.kycService.initiateKyc(userId, dto);
  }

  @Post('id-verification')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit ID verification document' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'KYC not initiated' })
  async submitIdVerification(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitIdVerificationDto,
  ) {
    return this.kycService.submitIdVerification(userId, dto);
  }

  @Put('selfie')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit selfie image for facial verification' })
  @ApiResponse({ status: 200 })
  async submitSelfie(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitSelfieDto,
  ) {
    return this.kycService.submitSelfie(userId, dto);
  }

  @Put('proof-of-address')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit proof of address document' })
  @ApiResponse({ status: 200 })
  async submitProofOfAddress(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitProofOfAddressDto,
  ) {
    return this.kycService.submitProofOfAddress(userId, dto);
  }

  @Post('submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit KYC for review' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Incomplete KYC' })
  async submitForReview(@CurrentUser('sub') userId: string) {
    return this.kycService.submitForReview(userId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my KYC status' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'KYC not found' })
  async getMyKyc(@CurrentUser('sub') userId: string) {
    return this.kycService.getMyKyc(userId);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all KYC applications (Admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED',
  ) {
    return this.kycService.findAll(+page, +limit, status as any);
  }

  @Get('stats')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get KYC statistics (Admin only)' })
  @ApiResponse({ status: 200 })
  async getStats() {
    return this.kycService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'KYC not found' })
  async findOne(@Param('id') id: string) {
    return this.kycService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Approve or reject KYC (Admin only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Already processed' })
  async updateStatus(
    @CurrentUser('sub') adminId: string,
    @Param('id') kycId: string,
    @Body() dto: UpdateKycStatusDto,
  ) {
    return this.kycService.updateStatus(adminId, kycId, dto);
  }
}
