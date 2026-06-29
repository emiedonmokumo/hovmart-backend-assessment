import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', ''],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Property Marketplace API')
    .setDescription(
      'A production-ready backend API for property marketplace platform supporting user registration, agent onboarding, KYC verification, property listings, payments, and escrow transactions.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Agents', 'Agent onboarding and management')
    .addTag('KYC', 'Know Your Customer verification')
    .addTag('Properties', 'Property listings and search')
    .addTag('Payments', 'Payment processing with Paystack')
    .addTag('Escrow', 'Secure escrow transactions')
    .addTag('Notifications', 'User notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [],
  });
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT') || 8000;
  await app.listen(port);

  console.log(`
  Property Marketplace API is running!
  API: http://localhost:${port}/${apiPrefix}
  Swagger Docs: http://localhost:${port}/api/docs
  `);
}

bootstrap();
