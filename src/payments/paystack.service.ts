import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import {
  InitializePaymentDto,
  PaymentResponseDto,
  TransactionType,
} from './dto/payment.dto';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
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

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly client: AxiosInstance;
  private readonly secretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.secretKey = this.configService.get('PAYSTACK_SECRET_KEY', '');

    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initializePayment(
    userId: string,
    dto: InitializePaymentDto,
  ): Promise<PaymentResponseDto> {
    const sellerId = await this.resolveSellerId(userId, dto);

    if (dto.type === TransactionType.ESCROW_PAYMENT) {
      const kyc = await this.prisma.kyc.findUnique({
        where: { userId },
      });

      if (!kyc || kyc.status !== 'APPROVED') {
        throw new BadRequestException(
          'KYC verification required for escrow payments',
        );
      }
    }

    const existing = await this.prisma.transaction.findFirst({
      where: {
        buyerId: userId,
        propertyId: dto.propertyId,
        type: dto.type as any,
        status: 'PENDING',
      },
    });

    if (existing) {
      return {
        authorizationUrl: existing.authorizationUrl,
        accessCode: existing.accessCode,
        reference: existing.reference,
      };
    }

    const reference = `${dto.type.toLowerCase()}_${uuidv4()}`;
    const amountInKobo = Math.round(dto.amount * 100);

    try {
      const response = await this.client.post<PaystackInitializeResponse>(
        '/transaction/initialize',
        {
          email: dto.email,
          amount: amountInKobo,
          reference,
          callback_url: `${this.configService.get('FRONTEND_URL')}/payment/callback`,
          metadata: {
            userId,
            type: dto.type,
            propertyId: dto.propertyId,
            sellerId,
            ...dto.metadata,
          },
        },
      );

      const { data } = response.data;

      await this.prisma.transaction.create({
        data: {
          reference: data.reference,
          buyerId: userId,
          sellerId,
          propertyId: dto.propertyId,
          type: dto.type as any,
          amount: dto.amount,
          accessCode: data.access_code,
          authorizationUrl: data.authorization_url,
          paystackRef: data.reference,
          status: 'PENDING',
          metadata: dto.metadata,
        },
      });

      return {
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        reference: data.reference,
      };
    } catch (error) {
      this.logger.error('Paystack initialization failed', error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  private async resolveSellerId(
    buyerId: string,
    dto: InitializePaymentDto,
  ): Promise<string | undefined> {
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
        include: {
          agent: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      if (!property) {
        throw new BadRequestException('Property not found');
      }

      const propertySellerId = property.agent.userId;
      const propertyAgentId = property.agent.id;

      if (
        dto.sellerId &&
        dto.sellerId !== propertySellerId &&
        dto.sellerId !== propertyAgentId
      ) {
        throw new BadRequestException(
          'sellerId does not match the property owner',
        );
      }

      if (propertySellerId === buyerId) {
        throw new BadRequestException('You cannot pay for your own property');
      }

      return propertySellerId;
    }

    if (!dto.sellerId) {
      if (dto.type === TransactionType.ESCROW_PAYMENT) {
        throw new BadRequestException('sellerId is required for escrow payments');
      }

      return undefined;
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: dto.sellerId },
      select: { id: true },
    });

    if (!seller) {
      throw new BadRequestException('Seller not found');
    }

    if (seller.id === buyerId) {
      throw new BadRequestException('You cannot pay yourself');
    }

    return seller.id;
  }

  async verifyPayment(reference: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      include: {
        buyer: {
          select: { email: true, firstName: true },
        },
      },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    if (transaction.status === 'SUCCESSFUL') {
      return transaction;
    }

    try {
      const response = await this.client.get<PaystackVerifyResponse>(
        `/transaction/verify/${reference}`,
      );

      const { data } = response.data;

      if (data.status === 'success') {
        const updatedTransaction = await this.prisma.transaction.update({
          where: { reference },
          data: {
            status: 'SUCCESSFUL',
            paystackRef: reference,
            paidAt: new Date(data.paid_at),
            verifiedAt: new Date(),
          },
        });

        await this.emailService.sendPaymentSuccessEmail(
          transaction.buyer.email,
          transaction.amount.toNumber(),
          reference,
        );

        if (transaction.type === 'ESCROW_PAYMENT') {
          await this.createEscrow(transaction, data);
        }

        return updatedTransaction;
      } else {
        await this.prisma.transaction.update({
          where: { reference },
          data: {
            status: 'FAILED',
          },
        });

        throw new BadRequestException('Payment verification failed');
      }
    } catch (error) {
      this.logger.error('Payment verification failed', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  async handleWebhook(event: string, data: any) {
    this.logger.log(`Webhook received: ${event}`);

    if (event === 'charge.success') {
      const reference = data.reference;

      const transaction = await this.prisma.transaction.findUnique({
        where: { reference },
        include: {
          buyer: { select: { email: true } },
        },
      });

      if (!transaction) {
        this.logger.warn(`Transaction not found: ${reference}`);
        return;
      }

      if (transaction.status === 'SUCCESSFUL') {
        this.logger.log(`Transaction already processed: ${reference}`);
        return;
      }

      await this.prisma.transaction.update({
        where: { reference },
        data: {
          status: 'SUCCESSFUL',
          paystackRef: reference,
          paidAt: new Date(data.paid_at),
          verifiedAt: new Date(),
        },
      });

      await this.emailService.sendPaymentSuccessEmail(
        transaction.buyer.email,
        data.amount / 100,
        reference,
      );

      if (transaction.type === 'ESCROW_PAYMENT') {
        await this.createEscrow(transaction, data);
      }
    }
  }

  private async createEscrow(transaction: any, paymentData: any) {
    const platformFeePercentage = 0.02;
    const fee = transaction.amount.toNumber() * platformFeePercentage;
    const sellerAmount = transaction.amount.toNumber() - fee;

    const seller = await this.prisma.user.findUnique({
      where: { id: transaction.sellerId },
      select: { email: true },
    });

    const property = transaction.propertyId
      ? await this.prisma.property.findUnique({
        where: { id: transaction.propertyId },
        select: { title: true },
      })
      : null;

    await this.prisma.escrow.create({
      data: {
        transactionId: transaction.id,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        propertyId: transaction.propertyId,
        amount: transaction.amount,
        platformFee: fee,
        sellerAmount: sellerAmount,
        status: 'FUNDED',
        fundedAt: new Date(),
      },
    });

    if (seller && property) {
      await this.emailService.sendEscrowFundedEmail(
        transaction.buyer.email,
        seller.email,
        transaction.amount.toNumber(),
        property.title,
      );
    }
  }

  /**
   * Validates Paystack webhook signature using HMAC-SHA512.
   *
   * Paystack signs webhooks using the same Secret Key used for API calls.
   * The signature is sent in the 'x-paystack-signature' header.
   *
   * @param signature - The value from 'x-paystack-signature' header
   * @param payload - The raw request body as a string
   * @returns true if signature is valid, false otherwise
   */
  validateWebhookSignature(signature: string, payload: string): boolean {
    if (!this.secretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured');
      return false;
    }

    if (!signature) {
      this.logger.warn('No signature provided in webhook');
      return false;
    }

    try {
      const hash = createHmac('sha512', this.secretKey)
        .update(payload)
        .digest('hex');

      if (
        hash.length !== signature.length ||
        !timingSafeEqual(
          Buffer.from(hash, 'hex'),
          Buffer.from(signature, 'hex'),
        )
      ) {
        this.logger.warn('Webhook signature verification failed');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error validating webhook signature', error);
      return false;
    }
  }
}
