import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import {
  ApproveEscrowDto,
  DisputeEscrowDto,
  ResolveDisputeDto,
} from './dto/transaction.dto';
import { EscrowStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getEscrow(id: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id },
      include: {
        transaction: true,
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        property: {
          select: { id: true, title: true, price: true },
        },
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    return escrow;
  }

  async getMyEscrows(userId: string, role: 'buyer' | 'seller', page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = role === 'buyer' ? { buyerId: userId } : { sellerId: userId };

    const [escrows, total] = await Promise.all([
      this.prisma.escrow.findMany({
        where,
        skip,
        take: limit,
        include: {
          transaction: true,
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          seller: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true, images: { where: { isPrimary: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.escrow.count({ where }),
    ]);

    return {
      data: escrows,
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

  async getAllEscrows(page = 1, limit = 10, status?: EscrowStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [escrows, total] = await Promise.all([
      this.prisma.escrow.findMany({
        where,
        skip,
        take: limit,
        include: {
          transaction: true,
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          seller: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.escrow.count({ where }),
    ]);

    return {
      data: escrows,
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

  async releasePayment(adminId: string, id: string, dto?: ApproveEscrowDto) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id },
      include: {
        seller: { select: { email: true } },
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException('Escrow must be funded before release');
    }

    const updated = await this.prisma.escrow.update({
      where: { id },
      data: {
        status: EscrowStatus.RELEASED,
        releasedAt: new Date(),
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    await this.emailService.sendEscrowReleasedEmail(
      escrow.seller.email,
      escrow.sellerAmount.toNumber(),
    );

    return updated;
  }

  async refundPayment(adminId: string, id: string, reason?: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id },
      include: {
        buyer: { select: { email: true } },
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.DISPUTED) {
      throw new BadRequestException('Escrow cannot be refunded in current state');
    }

    const updated = await this.prisma.escrow.update({
      where: { id },
      data: {
        status: EscrowStatus.REFUNDED,
        refundedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.emailService.sendEmail({
      to: escrow.buyer.email,
      subject: 'Escrow Refund Processed - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Escrow Refund Processed</h2>
          <p>Your escrow payment of <strong>₦${escrow.amount.toNumber().toLocaleString()}</strong> has been refunded.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>The refund should reflect in your account within 5-7 business days.</p>
        </div>
      `,
    });

    return updated;
  }

  async initiateDispute(userId: string, escrowId: string, dto: DisputeEscrowDto) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        buyer: { select: { email: true, firstName: true } },
        seller: { select: { email: true, firstName: true } },
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.buyerId !== userId) {
      throw new ForbiddenException('Only buyers can initiate disputes');
    }

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException('Can only dispute funded escrows');
    }

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.DISPUTED,
        disputedAt: new Date(),
        rejectionReason: dto.reason,
      },
    });

    await this.emailService.sendEmail({
      to: escrow.buyer.email,
      subject: 'Dispute Initiated - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Dispute Initiated</h2>
          <p>Hello ${escrow.buyer.firstName},</p>
          <p>Your dispute has been logged. Our team will review and contact you within 48 hours.</p>
          <p><strong>Reason:</strong> ${dto.reason}</p>
        </div>
      `,
    });

    await this.emailService.sendEmail({
      to: escrow.seller.email,
      subject: 'Dispute Initiated on Your Transaction - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Dispute Initiated</h2>
          <p>Hello ${escrow.seller.firstName},</p>
          <p>A dispute has been initiated on a transaction. The funds are being held pending resolution.</p>
          <p>Our team will review and may contact you for additional information.</p>
        </div>
      `,
    });

    return updated;
  }

  async resolveDispute(adminId: string, escrowId: string, dto: ResolveDisputeDto) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        buyer: { select: { email: true, firstName: true } },
        seller: { select: { email: true, firstName: true } },
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== EscrowStatus.DISPUTED) {
      throw new BadRequestException('Escrow is not in dispute');
    }

    const newStatus = dto.action === 'release' ? EscrowStatus.RELEASED : EscrowStatus.REFUNDED;
    const timestampField = dto.action === 'release' ? 'releasedAt' : 'refundedAt';

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: newStatus,
        [timestampField]: new Date(),
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: dto.notes,
      },
    });

    const actionText = dto.action === 'release' ? 'released to the seller' : 'refunded to you';

    await this.emailService.sendEmail({
      to: escrow.buyer.email,
      subject: 'Dispute Resolved - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Dispute Resolved</h2>
          <p>Hello ${escrow.buyer.firstName},</p>
          <p>The dispute has been resolved. The funds have been ${actionText}.</p>
          ${dto.notes ? `<p><strong>Notes:</strong> ${dto.notes}</p>` : ''}
        </div>
      `,
    });

    await this.emailService.sendEmail({
      to: escrow.seller.email,
      subject: 'Dispute Resolved - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Dispute Resolved</h2>
          <p>Hello ${escrow.seller.firstName},</p>
          <p>The dispute has been resolved.</p>
          <p>The funds have been ${actionText}.</p>
          ${dto.notes ? `<p><strong>Notes:</strong> ${dto.notes}</p>` : ''}
        </div>
      `,
    });

    return updated;
  }

  async getStats() {
    const [total, pending, funded, released, refunded, disputed, totalVolume] = await Promise.all([
      this.prisma.escrow.count(),
      this.prisma.escrow.count({ where: { status: EscrowStatus.PENDING } }),
      this.prisma.escrow.count({ where: { status: EscrowStatus.FUNDED } }),
      this.prisma.escrow.count({ where: { status: EscrowStatus.RELEASED } }),
      this.prisma.escrow.count({ where: { status: EscrowStatus.REFUNDED } }),
      this.prisma.escrow.count({ where: { status: EscrowStatus.DISPUTED } }),
      this.prisma.escrow.aggregate({
        where: { status: EscrowStatus.RELEASED },
        _sum: { sellerAmount: true },
      }),
    ]);

    return {
      total,
      pending,
      funded,
      released,
      refunded,
      disputed,
      totalReleased: totalVolume._sum.sellerAmount || 0,
    };
  }
}
