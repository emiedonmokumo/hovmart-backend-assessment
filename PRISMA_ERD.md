# Prisma Schema ERD

This ERD reflects the models in [prisma/schema.prisma](prisma/schema.prisma).

```mermaid
erDiagram
    User {
        String id PK
        String firstName
        String lastName
        String email UK
        String phone UK
        String password
        String profilePhoto
        UserRole role
        Boolean isVerified
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
    }

    RefreshToken {
        String id PK
        String token UK
        String userId FK
        DateTime expiresAt
        DateTime createdAt
        Boolean revoked
    }

    Agent {
        String id PK
        String userId FK_UK
        String fullName
        String email
        String phone
        String address
        String city
        String state
        Int yearsOfExperience
        String companyName
        String specialization
        String cacNumber
        String governmentIdUrl
        String passportPhotoUrl
        String utilityBillUrl
        AgentStatus status
        String reviewedBy
        DateTime reviewedAt
        String rejectionReason
        DateTime createdAt
        DateTime updatedAt
    }

    Kyc {
        String id PK
        String userId FK_UK
        String nin
        String bvn
        IdType idType
        String idNumber
        String idDocumentUrl
        String selfieImageUrl
        String proofOfAddressUrl
        KycStatus status
        String reviewedBy
        DateTime reviewedAt
        String rejectionReason
        DateTime createdAt
        DateTime updatedAt
    }

    Property {
        String id PK
        String agentId FK
        String title
        String description
        Decimal price
        String location
        String state
        String city
        String address
        Int bedrooms
        Int bathrooms
        PropertyType propertyType
        StringArray amenities
        PropertyStatus status
        Boolean isFeatured
        Int views
        DateTime createdAt
        DateTime updatedAt
        DateTime publishedAt
    }

    PropertyImage {
        String id PK
        String propertyId FK
        String url
        String publicId
        Boolean isPrimary
        DateTime createdAt
    }

    SavedProperty {
        String id PK
        String userId FK
        String propertyId FK
        DateTime createdAt
    }

    Transaction {
        String id PK
        String reference UK
        String buyerId FK
        String sellerId FK
        String propertyId FK
        TransactionType type
        Decimal amount
        String currency
        String paystackRef
        String accessCode
        String authorizationUrl
        TransactionStatus status
        DateTime paidAt
        DateTime verifiedAt
        Json metadata
        DateTime createdAt
        DateTime updatedAt
    }

    Escrow {
        String id PK
        String transactionId FK_UK
        String buyerId FK
        String sellerId FK
        String propertyId FK
        Decimal amount
        Decimal platformFee
        Decimal sellerAmount
        EscrowStatus status
        DateTime fundedAt
        DateTime releasedAt
        DateTime refundedAt
        DateTime disputedAt
        String approvedBy
        DateTime approvedAt
        String rejectionReason
        DateTime createdAt
        DateTime updatedAt
    }

    Notification {
        String id PK
        String userId FK
        NotificationType type
        String title
        String message
        Json data
        NotificationStatus status
        Boolean read
        DateTime sentAt
        DateTime readAt
        DateTime createdAt
    }

    User ||--o{ RefreshToken : owns
    User ||--o| Agent : applies_as
    User ||--o| Kyc : verifies
    User ||--o{ SavedProperty : saves
    User ||--o{ Notification : receives
    User ||--o{ Transaction : buys
    User ||--o{ Transaction : sells
    User ||--o{ Escrow : buyer
    User ||--o{ Escrow : seller

    Agent ||--o{ Property : lists
    Property ||--o{ PropertyImage : has
    Property ||--o{ SavedProperty : saved_as
    Property ||--o{ Transaction : paid_for
    Property ||--o{ Escrow : secured_by

    Transaction ||--o| Escrow : funds
```

## Notes

- `SavedProperty` is the join table for the many-to-many relationship between users and properties, with a unique `(userId, propertyId)` constraint.
- `Transaction.buyerId` is required, while `sellerId` and `propertyId` are optional for payment types that are not tied to a seller or property.
- `Escrow.transactionId` is unique, so a successful escrow payment can create at most one escrow record.
- `Agent.userId` and `Kyc.userId` are unique, making agent and KYC records one-to-one extensions of a user.
