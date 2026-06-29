import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  context?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get('EMAIL_FROM', 'noreply@propertymarketplace.com');
    this.frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_PORT', 587) === 465,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    if (this.configService.get('NODE_ENV') === 'development') {
      this.verifyConnection();
    }
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Email server connection verified');
    } catch (error) {
      this.logger.error('Email server connection failed', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.fromEmail,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, userId: string): Promise<boolean> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}&userId=${userId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email Address</h2>
        <p>Thank you for registering on Property Marketplace!</p>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">Or copy this link to your browser:<br>${verificationUrl}</p>
        <p style="color: #888; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Property Marketplace',
      html,
      text: `Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Reset Your Password</h2>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">Or copy this link to your browser:<br>${resetUrl}</p>
        <p style="color: #888; font-size: 12px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Property Marketplace',
      html,
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Property Marketplace!</h2>
        <p>Hello ${firstName},</p>
        <p>Thank you for joining Property Marketplace. You can now browse properties, save favorites, and connect with verified agents.</p>
        <a href="${this.frontendUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Explore Properties
        </a>
        <p>Happy house hunting!</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Property Marketplace!',
      html,
    });
  }

  async sendKYCApprovalEmail(email: string, firstName: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">KYC Verification Approved!</h2>
        <p>Hello ${firstName},</p>
        <p>Great news! Your KYC verification has been approved. You can now make payments and complete property transactions.</p>
        <p>You're all set to:</p>
        <ul>
          <li>Make escrow payments</li>
          <li>Complete property purchases</li>
          <li>Access all platform features</li>
        </ul>
        <a href="${this.frontendUrl}/properties" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Browse Properties
        </a>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'KYC Approved - Property Marketplace',
      html,
    });
  }

  async sendKYCRejectionEmail(email: string, firstName: string, reason: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">KYC Verification Update</h2>
        <p>Hello ${firstName},</p>
        <p>Unfortunately, your KYC verification was not approved.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please update your documents and submit again. Make sure:</p>
        <ul>
          <li>All documents are clearly visible and readable</li>
          <li>Documents match your profile information</li>
          <li>Documents are not expired</li>
        </ul>
        <a href="${this.frontendUrl}/kyc" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Update KYC
        </a>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'KYC Update Required - Property Marketplace',
      html,
    });
  }

  async sendAgentApprovalEmail(email: string, fullName: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Agent Application Approved!</h2>
        <p>Hello ${fullName},</p>
        <p>Congratulations! Your agent application has been approved. You can now list properties on Property Marketplace.</p>
        <p>As a verified agent, you can:</p>
        <ul>
          <li>Create unlimited property listings</li>
          <li>Manage your property portfolio</li>
          <li>Connect with potential buyers</li>
          <li>Receive payments through escrow</li>
        </ul>
        <a href="${this.frontendUrl}/agent/properties/new" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Create Your First Listing
        </a>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Agent Application Approved - Property Marketplace',
      html,
    });
  }

  async sendAgentRejectionEmail(email: string, fullName: string, reason: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Agent Application Update</h2>
        <p>Hello ${fullName},</p>
        <p>We're sorry, but your agent application was not approved at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please address the issues mentioned and submit a new application.</p>
        <a href="${this.frontendUrl}/agent/apply" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reapply
        </a>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Agent Application Update - Property Marketplace',
      html,
    });
  }

  async sendPropertyApprovalEmail(email: string, propertyTitle: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Property Listing Approved!</h2>
        <p>Great news! Your property listing has been approved and is now live.</p>
        <p><strong>Property:</strong> ${propertyTitle}</p>
        <p>Buyers can now view and inquire about your property.</p>
        <a href="${this.frontendUrl}/agent/properties" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Listing
        </a>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Property Approved - Property Marketplace',
      html,
    });
  }

  async sendPaymentSuccessEmail(email: string, amount: number, reference: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Successful</h2>
        <p>Your payment has been processed successfully.</p>
        <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
        <p><strong>Reference:</strong> ${reference}</p>
        <p>Thank you for using Property Marketplace!</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Payment Confirmed - Property Marketplace',
      html,
    });
  }

  async sendEscrowFundedEmail(buyerEmail: string, sellerEmail: string, amount: number, propertyTitle: string): Promise<void> {
    await this.sendEmail({
      to: buyerEmail,
      subject: 'Escrow Payment Received - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Escrow Payment Received</h2>
          <p>Your payment of <strong>₦${amount.toLocaleString()}</strong> for "${propertyTitle}" has been received and is being held securely in escrow.</p>
          <p>The funds will be released to the seller once the transaction is complete.</p>
        </div>
      `,
    });

    await this.sendEmail({
      to: sellerEmail,
      subject: 'Escrow Payment Received - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Payment Received for Your Property</h2>
          <p>A payment of <strong>₦${amount.toLocaleString()}</strong> has been received for "${propertyTitle}".</p>
          <p>The funds are being held in escrow and will be released to you once the buyer confirms the transaction.</p>
        </div>
      `,
    });
  }

  async sendEscrowReleasedEmail(sellerEmail: string, amount: number): Promise<boolean> {
    return this.sendEmail({
      to: sellerEmail,
      subject: 'Payment Released - Property Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Payment Released!</h2>
          <p>Great news! Your escrow payment of <strong>₦${amount.toLocaleString()}</strong> has been released to your account.</p>
          <p>The funds should reflect in your account within 2-3 business days.</p>
        </div>
      `,
    });
  }

  async sendNewPropertyInquiry(agentEmail: string, buyerName: string, propertyName: string, message: string): Promise<boolean> {
    return this.sendEmail({
      to: agentEmail,
      subject: `New Inquiry: ${propertyName} - Property Marketplace`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Property Inquiry</h2>
          <p><strong>${buyerName}</strong> is interested in <strong>${propertyName}</strong>.</p>
          <p><strong>Message:</strong></p>
          <p style="background: #f3f4f6; padding: 12px; border-radius: 6px;">${message}</p>
          <p>Log in to your dashboard to respond.</p>
        </div>
      `,
    });
  }
}
