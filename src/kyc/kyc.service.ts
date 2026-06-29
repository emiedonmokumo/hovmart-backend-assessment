import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import {
  InitiateKycDto,
  SubmitIdVerificationDto,
  SubmitSelfieDto,
  SubmitProofOfAddressDto,
  UpdateKycStatusDto,
} from './dto/kyc.dto';
import { KycStatus } from '@prisma/client';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async initiateKyc(userId: string, dto: InitiateKycDto) {
    const existingKyc = await this.prisma.kyc.findUnique({
      where: { userId },
    });

    if (existingKyc) {
      throw new ConflictException('KYC already initiated');
    }

    if (dto.bvn) {
      const isBvnValid = await this.validateBvn(dto.bvn);
      if (!isBvnValid) {
        throw new BadRequestException('BVN validation failed');
      }
    }

    if (dto.nin) {
      const isNinValid = await this.validateNin(dto.nin);
      if (!isNinValid) {
        throw new BadRequestException('NIN validation failed');
      }
    }

    const kyc = await this.prisma.kyc.create({
      data: {
        userId,
        nin: dto.nin,
        bvn: dto.bvn,
        status: KycStatus.PENDING,
      },
    });

    return kyc;
  }

  async submitIdVerification(userId: string, dto: SubmitIdVerificationDto) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { userId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found. Please initiate KYC first.');
    }

    return this.prisma.kyc.update({
      where: { userId },
      data: {
        idType: dto.idType as any,
        idNumber: dto.idNumber,
        idDocumentUrl: dto.idDocumentUrl,
        status: KycStatus.UNDER_REVIEW,
      },
    });
  }

  async submitSelfie(userId: string, dto: SubmitSelfieDto) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { userId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    return this.prisma.kyc.update({
      where: { userId },
      data: {
        selfieImageUrl: dto.selfieImageUrl,
      },
    });
  }

  async submitProofOfAddress(userId: string, dto: SubmitProofOfAddressDto) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { userId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    return this.prisma.kyc.update({
      where: { userId },
      data: {
        proofOfAddressUrl: dto.proofOfAddressUrl,
      },
    });
  }

  async submitForReview(userId: string) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { userId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    if (!kyc.idDocumentUrl || !kyc.selfieImageUrl || !kyc.proofOfAddressUrl) {
      throw new BadRequestException(
        'Please upload all required documents: ID document, selfie, and proof of address',
      );
    }

    return this.prisma.kyc.update({
      where: { userId },
      data: { status: KycStatus.UNDER_REVIEW },
    });
  }

  async getMyKyc(userId: string) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { userId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    return kyc;
  }

  async findAll(page = 1, limit = 10, status?: KycStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [kycs, total] = await Promise.all([
      this.prisma.kyc.findMany({
        skip,
        take: limit,
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.kyc.count({ where }),
    ]);

    return {
      data: kycs,
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

  async findOne(id: string) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    return kyc;
  }

  async updateStatus(adminId: string, kycId: string, dto: UpdateKycStatusDto) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { id: kycId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    if (kyc.status === KycStatus.APPROVED) {
      throw new BadRequestException('KYC already approved');
    }

    const newStatus = dto.status as KycStatus;

    const updatedKyc = await this.prisma.kyc.update({
      where: { id: kycId },
      data: {
        status: newStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    if (newStatus === KycStatus.APPROVED) {
      await this.emailService.sendKYCApprovalEmail(kyc.user.email, kyc.user.firstName);
    } else if (newStatus === KycStatus.REJECTED) {
      await this.emailService.sendKYCRejectionEmail(
        kyc.user.email,
        kyc.user.firstName,
        dto.rejectionReason || 'Documents did not meet verification requirements',
      );
    }

    return updatedKyc;
  }

  async isKycApproved(userId: string): Promise<boolean> {
    const kyc = await this.prisma.kyc.findUnique({
      where: { userId },
      select: { status: true },
    });

    return kyc?.status === KycStatus.APPROVED;
  }

  async getStats() {
    const [total, pending, underReview, approved, rejected] = await Promise.all([
      this.prisma.kyc.count(),
      this.prisma.kyc.count({ where: { status: KycStatus.PENDING } }),
      this.prisma.kyc.count({ where: { status: KycStatus.UNDER_REVIEW } }),
      this.prisma.kyc.count({ where: { status: KycStatus.APPROVED } }),
      this.prisma.kyc.count({ where: { status: KycStatus.REJECTED } }),
    ]);

    return {
      total,
      pending,
      underReview,
      approved,
      rejected,
    };
  }

  private async validateBvn(bvn: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return /^\d{11}$/.test(bvn);
  }

  private async validateNin(nin: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return /^\d{11}$/.test(nin);
  }
}
