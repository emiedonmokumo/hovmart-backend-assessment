import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationProcessor } from './notification.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
