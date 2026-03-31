import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Registration } from './entities/registration.entity';
import { RegistrationStep } from './enums/registration-step.enum';
import { RegistrationStatus } from './enums/registration-status.enum';
import { DocumentType } from './enums/document-type.enum';
import {
  CreateRegistrationDto,
  VerifyMfaDto,
  UpdateDocumentDto,
  UpdateContactDto,
  UpdateAddressDto,
} from './dto';
import {
  EmailProvider,
  EMAIL_PROVIDER,
} from './providers/email-provider.interface';
import {
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  generateMfaCode,
} from './utils/validators';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateRegistrationDto): Promise<Registration> {
    // Check if there's an existing IN_PROGRESS registration with this email
    const existing = await this.registrationRepository.findOne({
      where: {
        email: dto.email,
        status: RegistrationStatus.IN_PROGRESS,
      },
    });

    const mfaCode = generateMfaCode();

    if (existing) {
      // Replace the existing registration
      existing.name = dto.name;
      existing.email = dto.email;
      existing.mfaCode = mfaCode;
      existing.mfaVerified = false;
      existing.currentStep = RegistrationStep.IDENTIFICATION;
      existing.document = null;
      existing.documentType = null;
      existing.phone = null;
      existing.cep = null;
      existing.street = null;
      existing.number = null;
      existing.complement = null;
      existing.neighborhood = null;
      existing.city = null;
      existing.state = null;

      const saved = await this.registrationRepository.save(existing);

      // Send MFA code
      await this.sendMfaCodeSafely(dto.email, mfaCode);

      return saved;
    }

    const registration = this.registrationRepository.create({
      name: dto.name,
      email: dto.email,
      mfaCode,
      currentStep: RegistrationStep.IDENTIFICATION,
      status: RegistrationStatus.IN_PROGRESS,
    });

    const saved = await this.registrationRepository.save(registration);

    // Send MFA code
    await this.sendMfaCodeSafely(dto.email, mfaCode);

    return saved;
  }

  async verifyMfa(id: string, dto: VerifyMfaDto): Promise<Registration> {
    const registration = await this.findOneOrFail(id);

    if (registration.mfaVerified) {
      throw new BadRequestException('MFA já verificado');
    }

    if (registration.mfaCode !== dto.code) {
      throw new BadRequestException('Código de verificação inválido');
    }

    registration.mfaVerified = true;
    registration.currentStep = RegistrationStep.DOCUMENT;

    return this.registrationRepository.save(registration);
  }

  async resendMfa(id: string): Promise<{ message: string }> {
    const registration = await this.findOneOrFail(id);

    if (registration.mfaVerified) {
      throw new BadRequestException('MFA já verificado');
    }

    const mfaCode = generateMfaCode();
    registration.mfaCode = mfaCode;
    await this.registrationRepository.save(registration);

    await this.sendMfaCodeSafely(registration.email, mfaCode);

    return { message: 'Código reenviado com sucesso' };
  }

  async updateDocument(
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<Registration> {
    const registration = await this.findOneOrFail(id);
    this.ensureMfaVerified(registration);

    const cleanDoc = dto.document.replace(/\D/g, '');

    if (dto.documentType === DocumentType.CPF && !isValidCPF(cleanDoc)) {
      throw new BadRequestException('CPF inválido');
    }

    if (dto.documentType === DocumentType.CNPJ && !isValidCNPJ(cleanDoc)) {
      throw new BadRequestException('CNPJ inválido');
    }

    registration.documentType = dto.documentType;
    registration.document = cleanDoc;
    registration.currentStep = RegistrationStep.CONTACT;

    return this.registrationRepository.save(registration);
  }

  async updateContact(
    id: string,
    dto: UpdateContactDto,
  ): Promise<Registration> {
    const registration = await this.findOneOrFail(id);
    this.ensureMfaVerified(registration);

    const cleanPhone = dto.phone.replace(/\D/g, '');

    if (!isValidPhone(cleanPhone)) {
      throw new BadRequestException(
        'Telefone inválido. Informe um celular válido com DDD (11 dígitos)',
      );
    }

    registration.phone = cleanPhone;
    registration.currentStep = RegistrationStep.ADDRESS;

    return this.registrationRepository.save(registration);
  }

  async updateAddress(
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Registration> {
    const registration = await this.findOneOrFail(id);
    this.ensureMfaVerified(registration);

    registration.cep = dto.cep.replace(/\D/g, '');
    registration.street = dto.street;
    registration.number = dto.number;
    registration.complement = dto.complement || '';
    registration.neighborhood = dto.neighborhood;
    registration.city = dto.city;
    registration.state = dto.state;
    registration.currentStep = RegistrationStep.REVIEW;

    return this.registrationRepository.save(registration);
  }

  async complete(id: string): Promise<Registration> {
    const registration = await this.findOneOrFail(id);
    this.ensureMfaVerified(registration);

    if (registration.currentStep !== RegistrationStep.REVIEW) {
      throw new BadRequestException(
        'Todas as etapas devem ser concluídas antes de finalizar',
      );
    }

    registration.status = RegistrationStatus.COMPLETED;
    registration.completedAt = new Date();

    const saved = await this.registrationRepository.save(registration);

    await this.sendConfirmationEmailSafely(registration.email, registration.name);

    return saved;
  }

  async findOne(id: string): Promise<Registration> {
    return this.findOneOrFail(id);
  }

  private async findOneOrFail(id: string): Promise<Registration> {
    const registration = await this.registrationRepository.findOne({
      where: { id },
    });

    if (!registration) {
      throw new NotFoundException('Cadastro não encontrado');
    }

    return registration;
  }

  private async sendMfaCodeSafely(
    email: string,
    code: string,
  ): Promise<void> {
    try {
      await this.emailProvider.sendMfaCode(email, code);
    } catch (error) {
      this.logger.error(
        `Failed to send MFA code to ${email}. Registration was saved but email was not delivered.`,
        error?.stack || error,
      );
    }
  }

  private async sendConfirmationEmailSafely(
    email: string,
    name: string,
  ): Promise<void> {
    try {
      await this.emailProvider.sendConfirmationEmail(email, name);
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email to ${email}. Registration was completed but email was not delivered.`,
        error?.stack || error,
      );
    }
  }

  private ensureMfaVerified(registration: Registration): void {
    if (!registration.mfaVerified) {
      throw new BadRequestException(
        'Verificação MFA necessária antes de continuar',
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAbandonmentCheck(): Promise<void> {
    const abandonmentMinutes = this.configService.get<number>(
      'ABANDONMENT_MINUTES',
      30,
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() - abandonmentMinutes);

    const abandoned = await this.registrationRepository.find({
      where: {
        status: RegistrationStatus.IN_PROGRESS,
        mfaVerified: true,
        updatedAt: LessThan(threshold),
      },
    });

    for (const registration of abandoned) {
      this.logger.log(
        `Sending abandonment reminder to ${registration.email}`,
      );

      const resumeLink = `${frontendUrl}/cadastro?id=${registration.id}`;

      await this.emailProvider.sendAbandonmentReminder(
        registration.email,
        registration.name,
        resumeLink,
      );

      // Mark as abandoned so we don't send again
      registration.status = RegistrationStatus.ABANDONED;
      await this.registrationRepository.save(registration);
    }

    if (abandoned.length > 0) {
      this.logger.log(
        `Processed ${abandoned.length} abandoned registrations`,
      );
    }
  }
}
