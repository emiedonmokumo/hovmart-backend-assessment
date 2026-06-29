import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import {
  AgentBasicProfileDto,
  AgentProfessionalDetailsDto,
  AgentDocumentsDto,
  UpdateAgentStatusDto,
} from './dto/agent.dto';
import { AgentStatus } from '@prisma/client';

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createBasicProfile(userId: string, dto: AgentBasicProfileDto) {
    const existingAgent = await this.prisma.agent.findUnique({
      where: { userId },
    });

    if (existingAgent) {
      throw new ConflictException('Agent profile already exists');
    }

    const agent = await this.prisma.agent.create({
      data: {
        userId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        status: AgentStatus.PENDING,
      },
    });

    return agent;
  }

  async updateProfessionalDetails(agentId: string, userId: string, dto: AgentProfessionalDetailsDto) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        yearsOfExperience: dto.yearsOfExperience,
        companyName: dto.companyName,
        specialization: dto.specialization,
        cacNumber: dto.cacNumber,
      },
    });
  }

  async uploadDocuments(agentId: string, userId: string, dto: AgentDocumentsDto) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        governmentIdUrl: dto.governmentIdUrl,
        passportPhotoUrl: dto.passportPhotoUrl,
        utilityBillUrl: dto.utilityBillUrl,
      },
    });
  }

  async submitForReview(agentId: string, userId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    if (!agent.governmentIdUrl || !agent.passportPhotoUrl || !agent.utilityBillUrl) {
      throw new BadRequestException('Please upload all required documents');
    }

    if (agent.status !== AgentStatus.PENDING) {
      throw new BadRequestException('Application already submitted');
    }

    return this.prisma.agent.update({
      where: { id: agentId },
      data: { status: AgentStatus.PENDING },
    });
  }

  async getMyProfile(userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    return agent;
  }

  async findAll(page = 1, limit = 10, status?: AgentStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [agents, total] = await Promise.all([
      this.prisma.agent.findMany({
        skip,
        take: limit,
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePhoto: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.agent.count({ where }),
    ]);

    return {
      data: agents,
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
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async updateStatus(adminId: string, agentId: string, dto: UpdateAgentStatusDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.status !== AgentStatus.PENDING) {
      throw new BadRequestException('Agent application already processed');
    }

    const newStatus = dto.status as AgentStatus;

    const updatedAgent = await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        status: newStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    if (newStatus === AgentStatus.APPROVED) {
      await this.prisma.user.update({
        where: { id: agent.userId },
        data: { role: 'AGENT' },
      });

      await this.emailService.sendAgentApprovalEmail(agent.email, agent.fullName);
    } else {
      await this.emailService.sendAgentRejectionEmail(
        agent.email,
        agent.fullName,
        dto.rejectionReason || 'Application did not meet requirements',
      );
    }

    return updatedAgent;
  }

  async getAgentProperties(agentId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where: { agentId },
        skip,
        take: limit,
        include: {
          images: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.property.count({ where: { agentId } }),
    ]);

    return {
      data: properties,
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

  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.agent.count(),
      this.prisma.agent.count({ where: { status: AgentStatus.PENDING } }),
      this.prisma.agent.count({ where: { status: AgentStatus.APPROVED } }),
      this.prisma.agent.count({ where: { status: AgentStatus.REJECTED } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }
}
