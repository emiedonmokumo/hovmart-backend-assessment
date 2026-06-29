import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'test') {
      await this.notification.deleteMany();
      await this.escrow.deleteMany();
      await this.transaction.deleteMany();
      await this.propertyImage.deleteMany();
      await this.savedProperty.deleteMany();
      await this.property.deleteMany();
      await this.kyc.deleteMany();
      await this.agent.deleteMany();
      await this.refreshToken.deleteMany();
      await this.user.deleteMany();
    }
  }
}
