import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailProvider } from './email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
    this.from = this.configService.get('EMAIL_FROM', 'onboarding@resend.dev');
  }

  async sendMfaCode(email: string, code: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Seu código de verificação - Predictus',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Código de Verificação</h2>
            <p>Seu código de verificação é:</p>
            <div style="background: #f0f0f5; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
            </div>
            <p style="color: #666;">Este código expira em 10 minutos.</p>
            <p style="color: #666; font-size: 12px;">Se você não solicitou este código, ignore este e-mail.</p>
          </div>
        `,
      });
      this.logger.log(`MFA code sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send MFA code to ${email}`, error);
      throw error;
    }
  }

  async sendAbandonmentReminder(
    email: string,
    name: string,
    resumeLink: string,
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Continue seu cadastro - Predictus',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Olá, ${name}!</h2>
            <p>Notamos que você não finalizou seu cadastro. Gostaríamos de convidá-lo(a) a continuar de onde parou.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resumeLink}" style="background: #1a1a2e; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Continuar Cadastro
              </a>
            </div>
            <p style="color: #666; font-size: 12px;">Se você não iniciou este cadastro, ignore este e-mail.</p>
          </div>
        `,
      });
      this.logger.log(`Abandonment reminder sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send abandonment reminder to ${email}`,
        error,
      );
    }
  }
}
