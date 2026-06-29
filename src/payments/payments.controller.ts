import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { InitializePaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
  ) {}

  @Post('initialize')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize payment' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'KYC required for escrow' })
  async initializePayment(
    @CurrentUser('sub') userId: string,
    @Body() dto: InitializePaymentDto,
  ) {
    return this.paymentsService.initializePayment(userId, dto);
  }

  @Post('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Payment verification failed' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);

    if (!this.paystackService.validateWebhookSignature(signature, rawBody)) {
      return { status: 'error', message: 'Invalid signature' };
    }

    const { event, data } = req.body;
    await this.paystackService.handleWebhook(event, data);

    return { status: 'success' };
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({ status: 200 })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentsService.getTransactionHistory(userId, +page, +limit);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200 })
  async getStats(@CurrentUser('sub') userId: string) {
    return this.paymentsService.getStats(userId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.paymentsService.getTransaction(id, userId);
  }

  @Get('admin/stats')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all payment statistics (Admin only)' })
  @ApiResponse({ status: 200 })
  async getAdminStats() {
    return this.paymentsService.getStats();
  }
}
