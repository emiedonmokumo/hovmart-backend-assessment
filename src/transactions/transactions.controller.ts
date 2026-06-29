import {
  Controller,
  Get,
  Post,
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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import {
  ApproveEscrowDto,
  DisputeEscrowDto,
  EscrowResponseDto,
  EscrowStatsResponseDto,
  PaginatedEscrowsResponseDto,
  RefundEscrowDto,
  ResolveDisputeDto,
} from './dto/transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EscrowStatus, UserRole } from '@prisma/client';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('escrow/my/buyer')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my escrows as buyer' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, type: PaginatedEscrowsResponseDto })
  async getMyEscrowsAsBuyer(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.transactionsService.getMyEscrows(userId, 'buyer', +page, +limit);
  }

  @Get('escrow/my/seller')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my escrows as seller' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, type: PaginatedEscrowsResponseDto })
  async getMyEscrowsAsSeller(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.transactionsService.getMyEscrows(userId, 'seller', +page, +limit);
  }

  @Get('escrow/:id')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get escrow details' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiResponse({ status: 200, type: EscrowResponseDto })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async getEscrow(@Param('id') id: string) {
    return this.transactionsService.getEscrow(id);
  }

  @Post('escrow/:id/dispute')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate dispute for escrow' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiBody({ type: DisputeEscrowDto })
  @ApiResponse({ status: 200, type: EscrowResponseDto })
  @ApiResponse({ status: 400, description: 'Escrow is not eligible for dispute' })
  @ApiResponse({ status: 403, description: 'Only buyer can dispute' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async initiateDispute(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: DisputeEscrowDto,
  ) {
    return this.transactionsService.initiateDispute(userId, id, dto);
  }

  @Get('admin/escrow')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all escrows (Admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: EscrowStatus,
    description: 'Filter escrows by status',
  })
  @ApiResponse({ status: 200, type: PaginatedEscrowsResponseDto })
  async getAllEscrows(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    return this.transactionsService.getAllEscrows(+page, +limit, status as any);
  }

  @Patch('admin/escrow/:id/release')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Release escrow payment to seller (Admin only)' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiBody({ type: ApproveEscrowDto, required: false })
  @ApiResponse({ status: 200, type: EscrowResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid escrow status' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async releasePayment(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto?: ApproveEscrowDto,
  ) {
    return this.transactionsService.releasePayment(adminId, id, dto);
  }

  @Patch('admin/escrow/:id/refund')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Refund escrow payment to buyer (Admin only)' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiBody({ type: RefundEscrowDto, required: false })
  @ApiResponse({ status: 200, type: EscrowResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid escrow status' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async refundPayment(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto?: RefundEscrowDto,
  ) {
    return this.transactionsService.refundPayment(adminId, id, dto?.reason);
  }

  @Post('admin/escrow/:id/resolve')
  @ApiTags('Escrow')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Resolve disputed escrow (Admin only)' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiBody({ type: ResolveDisputeDto })
  @ApiResponse({ status: 200, type: EscrowResponseDto })
  @ApiResponse({ status: 400, description: 'Escrow not in dispute' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async resolveDispute(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.transactionsService.resolveDispute(adminId, id, dto);
  }

  @Get('admin/stats')
  @ApiTags('Transactions')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get transaction statistics (Admin only)' })
  @ApiResponse({ status: 200, type: EscrowStatsResponseDto })
  async getStats() {
    return this.transactionsService.getStats();
  }
}
