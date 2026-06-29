import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../notifications/notifications.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('payment-success')
  async handlePaymentSuccess(job: Job) {
    const { userId, amount, reference } = job.data;
    this.logger.log(`Processing payment success notification for user ${userId}`);

    await this.notificationsService.sendPaymentSuccessNotification(userId, {
      amount,
      reference,
    });
  }

  @Process('kyc-approved')
  async handleKycApproved(job: Job) {
    const { userId } = job.data;
    this.logger.log(`Processing KYC approval notification for user ${userId}`);

    await this.notificationsService.sendKYCApprovalNotification(userId);
  }

  @Process('kyc-rejected')
  async handleKycRejected(job: Job) {
    const { userId, reason } = job.data;
    this.logger.log(`Processing KYC rejection notification for user ${userId}`);

    await this.notificationsService.sendKYCRejectionNotification(userId, reason);
  }

  @Process('agent-approved')
  async handleAgentApproved(job: Job) {
    const { userId } = job.data;
    this.logger.log(`Processing agent approval notification for user ${userId}`);

    await this.notificationsService.sendAgentApprovalNotification(userId);
  }

  @Process('property-approved')
  async handlePropertyApproved(job: Job) {
    const { userId, propertyTitle } = job.data;
    this.logger.log(`Processing property approval notification for user ${userId}`);

    await this.notificationsService.sendPropertyApprovalNotification(userId, propertyTitle);
  }

  @Process('escrow-funded')
  async handleEscrowFunded(job: Job) {
    const { buyerId, sellerId, amount } = job.data;
    this.logger.log(`Processing escrow funded notifications`);

    await this.notificationsService.sendEscrowFundedNotification(buyerId, sellerId, amount);
  }

  @Process('escrow-released')
  async handleEscrowReleased(job: Job) {
    const { sellerId, amount } = job.data;
    this.logger.log(`Processing escrow released notification for seller ${sellerId}`);

    await this.notificationsService.sendEscrowReleasedNotification(sellerId, amount);
  }
}
