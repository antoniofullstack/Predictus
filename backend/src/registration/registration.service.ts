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

    const mfaCode = generateMfaCode();

    if (existing) {
      existing.name = dto.name;
      existing.email = dto.email;
      existing.mfaCode = mfaCode;
      existing.mfaVerified = false;
      existing.currentStep = RegistrationStep.IDENTIFICATION;
      existing.status = RegistrationStatus.IN_PROGRESS;

      const saved = await this.registrationRepository.save(existing);

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

    await this.sendMfaCodeSafely(dto.email, mfaCode);

    return saved;
  }

  async verifyMfa(id: string, dto: VerifyMfaDto): Promise<Registration> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureCurrentStep(registration, RegistrationStep.IDENTIFICATION);

    if (registration.mfaVerified) {
      throw new BadRequestException('MFA já verificado');
    }

    if (registration.mfaCode !== dto.code) {
      throw new BadRequestException('Código de verificação inválido');
    }

    registration.mfaVerified = true;
    registration.currentStep = this.getStepAfterMfaVerification(registration);

    return this.registrationRepository.save(registration);
  }

  async resendMfa(id: string): Promise<{ message: string }> {
    const registration = await this.findOneOrFail(id);
    this.ensureRegistrationIsEditable(registration);
    this.resumeRegistration(registration);
    this.ensureCurrentStep(registration, RegistrationStep.IDENTIFICATION);

    if (registration.mfaVerified) {
      throw new BadRequestException('MFA já verificado');
    }

    const mfaCode = generateMfaCode();
    registration.mfaCode = mfaCode;
    await this.registrationRepository.save(registration);

    await this.sendMfaCodeSafely(registration.email, mfaCode);

    return { message: 'Código reenviado com sucesso' };
  }

  async updateIdentification(
    id: string,
    dto: UpdateIdentificationDto,
  ): Promise<Registration> {
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
      const mfaCode = generateMfaCode();
      registration.mfaCode = mfaCode;
      registration.mfaVerified = false;
      registration.currentStep = RegistrationStep.IDENTIFICATION;

      const saved = await this.registrationRepository.save(registration);

      await this.sendMfaCodeSafely(dto.email, mfaCode);

      return saved;
    }

    registration.currentStep =
      registration.currentStep === RegistrationStep.REVIEW &&
      registration.mfaVerified
        ? RegistrationStep.REVIEW
        : RegistrationStep.IDENTIFICATION;

    return this.registrationRepository.save(registration);
  }

  async updateDocument(
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<Registration> {
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

    return this.registrationRepository.save(registration);
  }

  async updateContact(
    id: string,
    dto: UpdateContactDto,
  ): Promise<Registration> {
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

    return this.registrationRepository.save(registration);
  }

  async updateAddress(
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Registration> {
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

    return this.registrationRepository.save(registration);
  }

  async complete(id: string): Promise<Registration> {
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
