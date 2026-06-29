# Hovmart Backend Architecture

This backend is a NestJS API for a property marketplace. It supports user authentication, agent onboarding, KYC verification, property listings, Paystack-backed payments, escrow transactions, and user notifications.

## High-Level System Architecture

```mermaid
flowchart LR
    client[Web or mobile client]
    admin[Admin dashboard]
    api[NestJS API<br/>REST controllers]
    guards[Global middleware<br/>Helmet, CORS, validation, filters, JWT and roles guards]
    services[Domain services<br/>Auth, Users, Agents, KYC, Properties, Payments, Transactions, Notifications]
    prisma[Prisma ORM]
    db[(PostgreSQL)]
    redis[(Redis)]
    bull[Bull notification queue]
    email[SMTP email provider]
    paystack[Paystack API and webhooks]

    client --> api
    admin --> api
    api --> guards
    guards --> services
    services --> prisma
    prisma --> db

    services --> email
    services --> bull
    bull --> redis
    bull --> services

    services --> paystack
    paystack --> api
```

## Signup, KYC, and Payment Sequence

```mermaid
sequenceDiagram
    actor User
    actor Admin
    participant API as NestJS API
    participant Auth as AuthService
    participant KYC as KycService
    participant Payments as Payments/PaystackService
    participant DB as PostgreSQL via Prisma
    participant Email as SMTP Email
    participant Paystack

    User->>API: POST /auth/signup
    API->>Auth: signUp(dto)
    Auth->>DB: Check email or phone uniqueness
    Auth->>DB: Create user and refresh token
    Auth->>Email: Send verification and welcome emails
    Auth-->>User: Access token, refresh token, user profile

    User->>API: POST /kyc/initiate
    API->>KYC: initiateKyc(userId, NIN/BVN)
    KYC->>KYC: Validate NIN/BVN format
    KYC->>DB: Create KYC record as PENDING
    KYC-->>User: KYC record

    User->>API: POST /kyc/id-verification
    API->>KYC: submitIdVerification(userId, document)
    KYC->>DB: Store ID details and set UNDER_REVIEW

    User->>API: PUT /kyc/selfie
    API->>KYC: submitSelfie(userId, imageUrl)
    KYC->>DB: Store selfie URL

    User->>API: PUT /kyc/proof-of-address
    API->>KYC: submitProofOfAddress(userId, documentUrl)
    KYC->>DB: Store proof of address URL

    User->>API: POST /kyc/submit
    API->>KYC: submitForReview(userId)
    KYC->>DB: Confirm required documents and set UNDER_REVIEW

    Admin->>API: PATCH /kyc/:id/status
    API->>KYC: updateStatus(adminId, kycId, APPROVED/REJECTED)
    KYC->>DB: Store review decision
    KYC->>Email: Send KYC approval or rejection email
    KYC-->>Admin: Updated KYC record

    User->>API: POST /payments/initialize
    API->>Payments: initializePayment(userId, dto)
    Payments->>DB: For escrow, require approved KYC
    Payments->>DB: Reuse existing pending transaction if present
    Payments->>Paystack: Initialize transaction
    Paystack-->>Payments: authorization_url, access_code, reference
    Payments->>DB: Create PENDING transaction
    Payments-->>User: Paystack authorization URL

    User->>Paystack: Complete payment
    Paystack-->>API: POST /payments/webhook charge.success
    API->>Payments: Validate webhook signature and process event
    Payments->>DB: Mark transaction SUCCESSFUL
    Payments->>Email: Send payment success email
    Payments->>DB: If ESCROW_PAYMENT, create FUNDED escrow
    Payments->>Email: Notify buyer and seller that escrow is funded

    User->>API: POST /payments/verify
    API->>Payments: verifyPayment(reference)
    Payments->>Paystack: Verify transaction
    Payments->>DB: Reconcile transaction status if needed
    Payments-->>User: Transaction status
```

## Key Design Decisions

- **Modular NestJS domains:** Each major capability lives in its own module, controller, service, and DTO set. This keeps auth, KYC, payments, escrow, notifications, users, agents, and properties independently understandable while still sharing cross-cutting infrastructure.
- **Prisma as the data boundary:** Services use `PrismaService` for PostgreSQL access. The schema models core marketplace state directly: users, refresh tokens, agents, KYC records, properties, transactions, escrows, and notifications.
- **JWT access plus persisted refresh tokens:** Access tokens carry user identity and role for guards, while refresh tokens are stored and revocable in the database. This supports logout and token rotation.
- **KYC-gated escrow payments:** `ESCROW_PAYMENT` initialization requires an approved KYC record before Paystack is called. This keeps high-risk payment flows behind identity verification.
- **Paystack reconciliation through verify and webhook paths:** The API supports direct verification from the client flow and signed Paystack webhooks. Both paths update transaction state, send payment email, and create escrow records for escrow payments.
- **Escrow as a separate lifecycle from payment:** A successful escrow payment creates a funded escrow record. Release, refund, dispute, and dispute resolution are handled by transaction services and admin actions instead of overloading the payment record.
- **Security and request hygiene at the edge:** The app applies Helmet, CORS, global validation, exception filtering, request logging, JWT guards, and roles guards before requests reach domain logic.
- **Notifications are both direct and queue-ready:** Email is sent directly in several service flows, while Bull/Redis notification processors exist for asynchronous notification jobs. This gives the project a path to move heavier side effects off the request path.
