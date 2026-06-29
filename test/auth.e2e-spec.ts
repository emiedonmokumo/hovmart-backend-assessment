import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/signup (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+2348012345678',
          password: 'TestPass123',
        })
        .expect(201);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email',
          phone: '+2348012345678',
          password: 'TestPass123',
        })
        .expect(400);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test2@example.com',
          phone: '+2348012345679',
          password: 'weak',
        })
        .expect(400);
    });
  });

  describe('/auth/signin (POST)', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Health Check', () => {
    it('/health (GET) should return ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });
});
