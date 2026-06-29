# Property Marketplace API

A production-ready backend system for a property marketplace platform inspired by Hovmart. This system provides a scalable architecture for user registration, agent onboarding, KYC verification, property listings, secure payments, and escrow transactions.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [Security](#security)
- [API Documentation](#api-documentation)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Scaling Considerations](#scaling-considerations)
- [Testing](#testing)

## Features

### Core Functionality

1. **Authentication Module**
   - User signup with email verification
   - Login with JWT tokens
   - Refresh token rotation
   - Password reset flow
   - Email verification
   - Role-based access control (User, Agent, Admin)

2. **Agent Onboarding**
   - 4-step application process (Basic Profile → Professional Details → Document Upload → Submit)
   - Document verification
   - Admin approval workflow
   - Only approved agents can list properties

3. **KYC Verification**
   - NIN and BVN validation (mock implementation)
   - ID document upload
   - Selfie verification
   - Proof of address
   - Admin approval required before payments

4. **Property Management**
   - Create, update, delete listings
   - Multiple property types (apartment, duplex, land, office, shop, shortlet)
   - Image management with Cloudinary
   - Advanced search and filtering
   - Save/favorite properties
   - Admin approval workflow

5. **Payment Processing**
   - Paystack integration
   - Multiple transaction types (reservation, listing, escrow)
   - Webhook handling
   - Transaction history

6. **Escrow System**
   - Secure fund holding
   - Admin-controlled release
   - Dispute resolution
   - Refund capabilities

7. **Notifications**
   - Email notifications
   - In-app notifications
   - Background job processing with BullMQ

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Authentication | JWT + Refresh Tokens |
| Password Hashing | Argon2 |
| Cache/Queue | Redis + BullMQ |
| File Storage | Cloudinary |
| Payments | Paystack |
| API Documentation | Swagger |
| Runtime | Node.js 20 |

## Architecture

The application follows Clean Architecture principles with a modular structure:

```
src/
├── auth/                    # Authentication & authorization
│   ├── dto/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/                   # User management
├── agents/                  # Agent onboarding
├── kyc/                     # KYC verification
├── properties/              # Property listings
├── payments/                # Payment processing
├── transactions/            # Escrow & transactions
├── notifications/           # Notification system
├── common/                  # Shared utilities
│   ├── decorators/          # Custom decorators
│   ├── filters/             # Exception filters
│   ├── guards/              # Auth guards
│   ├── middleware/          # HTTP middleware
│   ├── dto/                 # Base DTOs
│   └── prisma/              # Prisma service
├── config/                  # Configuration
├── queues/                  # Background jobs
├── app.module.ts
└── main.ts
```

### Key Design Decisions

1. **Modular Architecture**: Each feature is encapsulated in its own module, making it easy to add, remove, or modify features.

2. **Dependency Injection**: NestJS's built-in DI container manages service dependencies, promoting loose coupling.

3. **Repository Pattern**: Prisma service abstracts database operations for better testability and maintainability.

4. **Guard-Based Authorization**: Role-based access control using custom guards and decorators.

5. **Queue-Based Processing**: Background jobs for notifications and async operations using BullMQ.

## Database Design

### Entity Relationship Diagram

```
User
  ├── has one     → Agent
  ├── has one     → KYC
  ├── has many    → RefreshToken
  ├── has many    → Transaction (as buyer/seller)
  ├── has many    → Escrow (as buyer/seller)
  ├── has many    → Notification
  └── has many    → SavedProperty

Agent
  ├── belongs to  → User
  └── has many    → Property

Property
  ├── belongs to  → Agent
  ├── has many    → PropertyImage
  └── has many    → SavedProperty

Transaction
  ├── belongs to  → User (buyer)
  ├── belongs to  → User (seller)
  ├── belongs to  → Property
  └── has one     → Escrow

Escrow
  ├── belongs to  → Transaction
  ├── belongs to  → User (buyer)
  └── belongs to  → User (seller)
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts and profiles |
| `agents` | Agent applications and profiles |
| `kyc` | KYC verification records |
| `properties` | Property listings |
| `property_images` | Property image URLs |
| `saved_properties` | User favorites |
| `transactions` | Payment records |
| `escrows` | Escrow holding accounts |
| `notifications` | User notifications |
| `refresh_tokens` | JWT refresh tokens |

## Security

### Authentication

- **JWT Access Tokens**: Short-lived tokens (15 min) for API access
- **Refresh Token Rotation**: Long-lived tokens (7 days) with rotation on use
- **Token Revocation**: Logout revokes refresh tokens

### Password Security

- **Argon2 Hashing**: Memory-hard password hashing algorithm
- **Password Requirements**: Minimum 8 chars, uppercase, lowercase, number

### API Security

- **Helmet**: HTTP headers protection
- **CORS**: Configured for frontend origin only
- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: class-validator on all DTOs

### Authorization

- **Role-Based Access Control**: Three roles (USER, AGENT, ADMIN)
- **Resource Ownership**: Users can only access their own resources
- **Admin Overriding**: Admins can access all resources

### Payment Security

- **Webhook Verification**: Validates Paystack signatures
- **Idempotency**: Prevents duplicate payment processing
- **KYC Check**: Prevents payments without KYC approval

## API Documentation

Swagger documentation is available at `/api/docs` when running the application.

### Authentication

Most endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

### Example Requests

**Sign Up**
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "password": "SecurePass123"
}
```

**Create Property (Agent)**
```http
POST /api/v1/properties
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Luxury 3-Bedroom Apartment",
  "description": "Beautiful apartment with modern finishes",
  "price": 75000000,
  "location": "Lekki Phase 1",
  "state": "Lagos",
  "city": "Lagos",
  "address": "15 Admiralty Way",
  "bedrooms": 3,
  "bathrooms": 2,
  "propertyType": "APARTMENT",
  "amenities": ["pool", "gym", "parking"]
}
```

**Initialize Payment**
```http
POST /api/v1/payments/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500000,
  "email": "buyer@example.com",
  "type": "ESCROW_PAYMENT",
  "propertyId": "property-uuid",
  "sellerId": "agent-uuid"
}
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd property-marketplace
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Start development server**
   ```bash
   npm run start:dev
   ```

### Docker Setup

For development with all services:

```bash
docker-compose -f docker-compose.dev.yml up -d
npm run start:dev
```

Services will be available:
- API: http://localhost:8000
- Swagger: http://localhost:8000/api/docs
- Adminer (DB UI): http://localhost:8080
- Redis Commander: http://localhost:8081

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | Redis port | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRATION` | Access token expiry | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiry | Yes |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (also used for webhook signatures) | Yes |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `SMTP_HOST` | SMTP server host | No |
| `SMTP_PORT` | SMTP server port | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |
| `EMAIL_FROM` | Sender email address | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/signin` | Login |
| POST | `/auth/refresh` | Refresh tokens |
| POST | `/auth/logout` | Logout |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| POST | `/auth/verify-email` | Verify email |
| GET | `/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get profile |
| PUT | `/users/me` | Update profile |
| PATCH | `/users/me/change-password` | Change password |
| DELETE | `/users/me` | Deactivate account |
| GET | `/users/:id` | Get user by ID (Admin) |
| PATCH | `/users/:id/role` | Update role (Admin) |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/apply` | Start agent application |
| PUT | `/agents/apply/:id/professional` | Add professional details |
| PUT | `/agents/apply/:id/documents` | Upload documents |
| POST | `/agents/apply/:id/submit` | Submit for review |
| GET | `/agents/me` | Get my agent profile |
| GET | `/agents` | List all agents (Admin) |
| PATCH | `/agents/:id/status` | Approve/reject (Admin) |

### KYC
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/kyc/initiate` | Start KYC |
| POST | `/kyc/id-verification` | Submit ID |
| PUT | `/kyc/selfie` | Submit selfie |
| PUT | `/kyc/proof-of-address` | Submit proof |
| POST | `/kyc/submit` | Submit for review |
| GET | `/kyc/me` | Get my KYC status |
| GET | `/kyc` | List all KYC (Admin) |
| PATCH | `/kyc/:id/status` | Approve/reject (Admin) |

### Properties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/properties` | Search properties |
| GET | `/properties/featured` | Featured properties |
| GET | `/properties/:id` | Get property |
| POST | `/properties` | Create listing (Agent) |
| PUT | `/properties/:id` | Update listing (Agent) |
| DELETE | `/properties/:id` | Delete listing (Agent) |
| POST | `/properties/:id/images` | Add images (Agent) |
| POST | `/properties/:id/save` | Save property |
| GET | `/properties/saved/me` | My saved properties |
| PATCH | `/properties/:id/approve` | Approve (Admin) |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/initialize` | Initialize payment |
| POST | `/payments/verify` | Verify payment |
| POST | `/payments/webhook` | Paystack webhook |
| GET | `/payments/history` | Payment history |
| GET | `/payments/:id` | Transaction details |

### Escrow
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions/escrow/my/buyer` | My escrows (buyer) |
| GET | `/transactions/escrow/my/seller` | My escrows (seller) |
| POST | `/transactions/escrow/:id/dispute` | Initiate dispute |
| GET | `/transactions/admin/escrow` | All escrows (Admin) |
| PATCH | `/transactions/admin/escrow/:id/release` | Release (Admin) |
| PATCH | `/transactions/admin/escrow/:id/refund` | Refund (Admin) |

## Deployment

### Production Build

```bash
npm run build
npm run start:prod
```

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

### Health Check

The API provides a health endpoint at `/api/v1/health` for load balancers and monitoring.

## Scaling Considerations

### Horizontal Scaling

1. **Stateless API**: JWT tokens make the API stateless
2. **Redis Sessions**: Refresh tokens stored in shared Redis
3. **Load Balancer**: Multiple instances behind a load balancer

### Database Scaling

1. **Read Replicas**: PostgreSQL read replicas for queries
2. **Connection Pooling**: Prisma manages connection pool
3. **Indexing**: Strategic indexes on frequently queried fields

### Caching Strategy

1. **Redis Cache**: Cache frequently accessed data
2. **CDN**: Static assets via Cloudinary CDN
3. **Query Caching**: Prisma query result caching

### Background Jobs

- BullMQ for async processing
- Separate worker processes for heavy computations
- Retry mechanisms for failed jobs

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
