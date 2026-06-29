import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateNotificationDto } from './dto/notification.dto';
import { NotificationStatus, NotificationType as PrismaNotificationType } from '@prisma/client';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as PrismaNotificationType,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
        status: NotificationStatus.PENDING,
      },
    });

    if (dto.type === 'EMAIL') {
      await this.sendEmailNotification(notification.id, dto);
    }

    return notification;
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, type: 'IN_APP' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, type: 'IN_APP' } }),
      this.prisma.notification.count({
        where: { userId, type: 'IN_APP', read: false },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
        unreadCount,
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { message: 'All notifications marked as read' };
  }

  async delete(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted' };
  }

  async sendEmailNotification(notificationId: string, dto: CreateNotificationDto) {
    try {
      this.logger.log(`Sending email to user ${dto.userId}: ${dto.title}`);

      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { email: true },
      });

      if (!user) {
        throw new Error(`User ${dto.userId} not found`);
      }

      const sent = await this.emailService.sendEmail({
        to: user.email,
        subject: dto.title,
        text: dto.message,
      });

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: sent ? new Date() : null,
        },
      });

      return { success: sent };
    } catch (error) {
      this.logger.error('Failed to send email notification', error);

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.FAILED,
        },
      });

      return { success: false };
    }
  }

  async sendPaymentSuccessNotification(userId: string, data: { amount: number; reference: string }) {
    await this.create({
      userId,
      type: 'EMAIL' as any,
      title: 'Payment Successful',
      message: `Your payment of NGN ${data.amount.toLocaleString()} has been processed successfully. Reference: ${data.reference}`,
      data,
    });

    await this.create({
      userId,
      type: 'IN_APP' as any,
      title: 'Payment Successful',
      message: `Your payment of NGN ${data.amount.toLocaleString()} was successful.`,
      data,
    });
  }

  async sendKYCApprovalNotification(userId: string) {
    await this.create({
      userId,
      type: 'EMAIL' as any,
      title: 'KYC Verification Approved',
      message: 'Congratulations! Your KYC verification has been approved. You can now make payments.',
    });

    await this.create({
      userId,
      type: 'IN_APP' as any,
      title: 'KYC Approved',
      message: 'Your KYC verification has been approved.',
    });
  }

  async sendKYCRejectionNotification(userId: string, reason: string) {
    await this.create({
      userId,
      type: 'EMAIL' as any,
      title: 'KYC Verification Rejected',
      message: `Your KYC verification was rejected. Reason: ${reason}. Please submit correct documents.`,
      data: { reason },
    });

    await this.create({
      userId,
      type: 'IN_APP' as any,
      title: 'KYC Rejected',
      message: `Your KYC verification was rejected. ${reason}`,
      data: { reason },
    });
  }

  async sendAgentApprovalNotification(userId: string) {
    await this.create({
      userId,
      type: 'EMAIL' as any,
      title: 'Agent Application Approved',
      message: 'Congratulations! Your agent application has been approved. You can now list properties.',
    });

    await this.create({
      userId,
      type: 'IN_APP' as any,
      title: 'Agent Approved',
      message: 'Your agent application has been approved. Start listing properties now!',
    });
  }

  async sendPropertyApprovalNotification(userId: string, propertyTitle: string) {
    await this.create({
      userId,
      type: 'EMAIL' as any,
      title: 'Property Listing Approved',
      message: `Your property "${propertyTitle}" has been approved and is now live.`,
      data: { propertyTitle },
    });

    await this.create({
      userId,
      type: 'IN_APP' as any,
      title: 'Property Approved',
      message: `Your property "${propertyTitle}" is now live.`,
      data: { propertyTitle },
    });
  }

  async sendEscrowFundedNotification(buyerId: string, sellerId: string, amount: number) {
    await this.create({
      userId: buyerId,
      type: 'IN_APP' as any,
      title: 'Escrow Funded',
      message: `Your escrow payment of NGN ${amount.toLocaleString()} has been received and is being held securely.`,
      data: { amount },
    });

    await this.create({
      userId: sellerId,
      type: 'IN_APP' as any,
      title: 'Escrow Received',
      message: `An escrow payment of NGN ${amount.toLocaleString()} has been received for your property.`,
      data: { amount },
    });
  }

  async sendEscrowReleasedNotification(sellerId: string, amount: number) {
    await this.create({
      userId: sellerId,
      type: 'EMAIL' as any,
      title: 'Payment Released',
      message: `Your escrow payment of NGN ${amount.toLocaleString()} has been released to your account.`,
      data: { amount },
    });

    await this.create({
      userId: sellerId,
      type: 'IN_APP' as any,
      title: 'Payment Released',
      message: `NGN ${amount.toLocaleString()} has been released to your account.`,
      data: { amount },
    });
  }
}
