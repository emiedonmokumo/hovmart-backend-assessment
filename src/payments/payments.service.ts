import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaystackService } from './paystack.service';
import {
  InitializePaymentDto,
  VerifyPaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  async initializePayment(userId: string, dto: InitializePaymentDto) {
    return this.paystackService.initializePayment(userId, dto);
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    return this.paystackService.verifyPayment(dto.reference);
  }

  async getTransactionHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        skip,
        take: limit,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              price: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      }),
    ]);

    return {
      data: transactions,
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

  async getTransaction(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: {
        property: {
          include: {
            images: true,
            agent: { select: { fullName: true, email: true, phone: true } },
          },
        },
        escrow: true,
      },
    });

    return transaction;
  }

  async getStats(userId?: string) {
    const where = userId
      ? { OR: [{ buyerId: userId }, { sellerId: userId }] }
      : {};

    const [total, pending, successful, failed, totalVolume] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.transaction.count({ where: { ...where, status: 'SUCCESSFUL' } }),
      this.prisma.transaction.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.transaction.aggregate({
        where: { ...where, status: 'SUCCESSFUL' },
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      pending,
      successful,
      failed,
      totalVolume: totalVolume._sum.amount || 0,
    };
  }
}
