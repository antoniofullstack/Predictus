import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Registration } from './entities/registration.entity';
import { RegistrationStep } from './enums/registration-step.enum';
import { RegistrationStatus } from './enums/registration-status.enum';
import { DocumentType } from './enums/document-type.enum';
import {
  CreateRegistrationDto,
  VerifyMfaDto,
  UpdateIdentificationDto,
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

type PublicRegistration = Omit<Registration, 'mfaCode'>;

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

  async create(dto: CreateRegistrationDto): Promise<PublicRegistration> {
    const existing = await this.registrationRepository.findOne({
      where: {
        email: dto.email,
        status: In([
          RegistrationStatus.IN_PROGRESS,
          RegistrationStatus.ABANDONED,
        ]),
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    if (existing) {
      const mfaCode = this.assignNewMfaCode(existing);
      existing.name = dto.name;
      existing.email = dto.email;
      existing.currentStep = RegistrationStep.IDENTIFICATION;
      existing.status = RegistrationStatus.IN_PROGRESS;

      const saved = await this.registrationRepository.save(existing);

      await this.sendMfaCodeSafely(dto.email, mfaCode);

      return this.sanitizeRegistration(saved);
    }

    const registrationWithMfa = new Registration();
    const mfaCode = this.assignNewMfaCode(registrationWithMfa);
    const registration = this.registrationRepository.create({
      name: dto.name,
      email: dto.email,
      mfaCode: registrationWithMfa.mfaCode,
      mfaExpiresAt: registrationWithMfa.mfaExpiresAt,
      currentStep: RegistrationStep.IDENTIFICATION,
      status: RegistrationStatus.IN_PROGRESS,
    });

    const saved = await this.registrationRepository.save(registration);

    await this.sendMfaCodeSafely(dto.email, mfaCode);

    return this.sanitizeRegistration(saved);
  }

  async verifyMfa(id: string, dto: VerifyMfaDto): Promise<PublicRegistration> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureCurrentStep(registration, RegistrationStep.IDENTIFICATION);

    if (registration.mfaVerified) {
      throw new BadRequestException('MFA já verificado');
    }

    if (!registration.mfaCode || !registration.mfaExpiresAt) {
      throw new BadRequestException(
        'Código de verificação expirado. Solicite um novo código',
      );
    }

    if (registration.mfaExpiresAt <= new Date()) {
      throw new BadRequestException(
        'Código de verificação expirado. Solicite um novo código',
      );
    }

    if (registration.mfaCode !== dto.code) {
      throw new BadRequestException('Código de verificação inválido');
    }

    registration.mfaVerified = true;
    registration.mfaCode = null;
    registration.mfaExpiresAt = null;
    registration.currentStep = this.getStepAfterMfaVerification(registration);

    const saved = await this.registrationRepository.save(registration);

    return this.sanitizeRegistration(saved);
  }

  async resendMfa(id: string): Promise<{ message: string }> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureCurrentStep(registration, RegistrationStep.IDENTIFICATION);

    if (registration.mfaVerified) {
      throw new BadRequestException('MFA já verificado');
    }

    const mfaCode = this.assignNewMfaCode(registration);
    await this.registrationRepository.save(registration);

    await this.sendMfaCodeSafely(registration.email, mfaCode);

    return { message: 'Código reenviado com sucesso' };
  }

  async updateIdentification(
    id: string,
    dto: UpdateIdentificationDto,
  ): Promise<PublicRegistration> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureCurrentStep(registration, RegistrationStep.IDENTIFICATION, {
      allowReview: true,
    });

    const emailChanged = registration.email !== dto.email;

    registration.name = dto.name;
    registration.email = dto.email;

    if (emailChanged) {
      const mfaCode = this.assignNewMfaCode(registration);
      registration.currentStep = RegistrationStep.IDENTIFICATION;

      const saved = await this.registrationRepository.save(registration);

      await this.sendMfaCodeSafely(dto.email, mfaCode);

      return this.sanitizeRegistration(saved);
    }

    registration.currentStep =
      registration.currentStep === RegistrationStep.REVIEW &&
      registration.mfaVerified
        ? RegistrationStep.REVIEW
        : RegistrationStep.IDENTIFICATION;

    const saved = await this.registrationRepository.save(registration);

    return this.sanitizeRegistration(saved);
  }

  async updateDocument(
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<PublicRegistration> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureMfaVerified(registration);
    this.ensureCurrentStep(registration, RegistrationStep.DOCUMENT, {
      allowReview: true,
    });

    const cleanDoc = dto.document.replace(/\D/g, '');

    if (dto.documentType === DocumentType.CPF && !isValidCPF(cleanDoc)) {
      throw new BadRequestException('CPF inválido');
    }

    if (dto.documentType === DocumentType.CNPJ && !isValidCNPJ(cleanDoc)) {
      throw new BadRequestException('CNPJ inválido');
    }

    registration.documentType = dto.documentType;
    registration.document = cleanDoc;
    registration.currentStep =
      registration.currentStep === RegistrationStep.REVIEW
        ? RegistrationStep.REVIEW
        : RegistrationStep.CONTACT;

    const saved = await this.registrationRepository.save(registration);

    return this.sanitizeRegistration(saved);
  }

  async updateContact(
    id: string,
    dto: UpdateContactDto,
  ): Promise<PublicRegistration> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureMfaVerified(registration);
    this.ensureCurrentStep(registration, RegistrationStep.CONTACT, {
      allowReview: true,
    });

    const cleanPhone = dto.phone.replace(/\D/g, '');

    if (!isValidPhone(cleanPhone)) {
      throw new BadRequestException(
        'Telefone inválido. Informe um celular válido com DDD (11 dígitos)',
      );
    }

    registration.phone = cleanPhone;
    registration.currentStep =
      registration.currentStep === RegistrationStep.REVIEW
        ? RegistrationStep.REVIEW
        : RegistrationStep.ADDRESS;

    const saved = await this.registrationRepository.save(registration);

    return this.sanitizeRegistration(saved);
  }

  async updateAddress(
    id: string,
    dto: UpdateAddressDto,
  ): Promise<PublicRegistration> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureMfaVerified(registration);
    this.ensureCurrentStep(registration, RegistrationStep.ADDRESS, {
      allowReview: true,
    });

    registration.cep = dto.cep.replace(/\D/g, '');
    registration.street = dto.street;
    registration.number = dto.number;
    registration.complement = dto.complement || '';
    registration.neighborhood = dto.neighborhood;
    registration.city = dto.city;
    registration.state = dto.state;
    registration.currentStep = RegistrationStep.REVIEW;

    const saved = await this.registrationRepository.save(registration);

    return this.sanitizeRegistration(saved);
  }

  async complete(id: string): Promise<PublicRegistration> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureMfaVerified(registration);
    this.ensureCurrentStep(registration, RegistrationStep.REVIEW, {
      message: 'A revisão do cadastro é obrigatória antes da conclusão.',
    });

    // Validate all required fields are present
    if (
      !registration.name ||
      !registration.email ||
      !registration.documentType ||
      !registration.document ||
      !registration.phone ||
      !registration.cep ||
      !registration.street ||
      !registration.number ||
      !registration.neighborhood ||
      !registration.city ||
      !registration.state
    ) {
      throw new BadRequestException(
        'Todas as etapas devem ser concluídas antes de finalizar',
      );
    }

    registration.status = RegistrationStatus.COMPLETED;
    registration.completedAt = new Date();
    registration.currentStep = RegistrationStep.REVIEW;

    const saved = await this.registrationRepository.save(registration);

    await this.sendConfirmationEmailSafely(
      registration.email,
      registration.name,
    );

    return this.sanitizeRegistration(saved);
  }

  async findOne(id: string): Promise<PublicRegistration> {
    const registration = await this.findOneOrFail(id);

    return this.sanitizeRegistration(registration);
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

  private async sendMfaCodeSafely(email: string, code: string): Promise<void> {
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

  private ensureRegistrationIsEditable(registration: Registration): void {
    if (registration.status === RegistrationStatus.COMPLETED) {
      throw new BadRequestException(
        'Cadastro já concluído e não pode ser alterado',
      );
    }
  }

  private resumeRegistration(registration: Registration): void {
    if (registration.status === RegistrationStatus.ABANDONED) {
      registration.status = RegistrationStatus.IN_PROGRESS;
    }
  }

  private ensureCurrentStep(
    registration: Registration,
    expectedStep: RegistrationStep,
    options?: {
      allowReview?: boolean;
      message?: string;
    },
  ): void {
    const allowedSteps = options?.allowReview
      ? [expectedStep, RegistrationStep.REVIEW]
      : [expectedStep];

    if (!allowedSteps.includes(registration.currentStep)) {
      throw new BadRequestException(
        options?.message ||
          'As etapas do cadastro devem ser concluídas em ordem.',
      );
    }
  }

  private getStepAfterMfaVerification(
    registration: Registration,
  ): RegistrationStep {
    if (!registration.documentType || !registration.document) {
      return RegistrationStep.DOCUMENT;
    }

    if (!registration.phone) {
      return RegistrationStep.CONTACT;
    }

    if (
      !registration.cep ||
      !registration.street ||
      !registration.number ||
      !registration.neighborhood ||
      !registration.city ||
      !registration.state
    ) {
      return RegistrationStep.ADDRESS;
    }

    return RegistrationStep.REVIEW;
  }

  private assignNewMfaCode(registration: Registration): string {
    const mfaCode = generateMfaCode();
    const mfaExpiresAt = new Date();
    mfaExpiresAt.setMinutes(
      mfaExpiresAt.getMinutes() + this.getMfaExpirationMinutes(),
    );

    registration.mfaCode = mfaCode;
    registration.mfaExpiresAt = mfaExpiresAt;
    registration.mfaVerified = false;

    return mfaCode;
  }

  private getMfaExpirationMinutes(): number {
    return this.configService.get<number>('MFA_EXPIRATION_MINUTES', 10);
  }

  private sanitizeRegistration(
    registration: Registration,
  ): PublicRegistration {
    const { mfaCode: _mfaCode, ...publicRegistration } = registration;

    return publicRegistration;
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
        updatedAt: LessThan(threshold),
      },
    });

    for (const registration of abandoned) {
      this.logger.log(`Sending abandonment reminder to ${registration.email}`);

      const resumeLink = `${frontendUrl}/cadastro?id=${registration.id}`;

      await this.sendAbandonmentReminderSafely(
        registration.email,
        registration.name,
        resumeLink,
      );

      // Mark as abandoned so we don't send again
      registration.status = RegistrationStatus.ABANDONED;
      await this.registrationRepository.save(registration);
    }

    if (abandoned.length > 0) {
      this.logger.log(`Processed ${abandoned.length} abandoned registrations`);
    }
  }

  private async sendAbandonmentReminderSafely(
    email: string,
    name: string,
    resumeLink: string,
  ): Promise<void> {
    try {
      await this.emailProvider.sendAbandonmentReminder(email, name, resumeLink);
    } catch (error) {
      this.logger.error(
        `Failed to send abandonment reminder to ${email}.`,
        error?.stack || error,
      );
    }
  }
}
