import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RegistrationService } from './registration.service';
import { Registration } from './entities/registration.entity';
import { EMAIL_PROVIDER } from './providers/email-provider.interface';
import { RegistrationStep } from './enums/registration-step.enum';
import { RegistrationStatus } from './enums/registration-status.enum';
import { DocumentType } from './enums/document-type.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockRegistration: Partial<Registration> = {
  id: 'test-uuid',
  name: 'Test User',
  email: 'test@example.com',
  mfaCode: '123456',
  mfaVerified: false,
  currentStep: RegistrationStep.IDENTIFICATION,
  status: RegistrationStatus.IN_PROGRESS,
  startedAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = {
  create: jest.fn().mockImplementation((dto) => ({ ...mockRegistration, ...dto })),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockRegistration, ...entity })),
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
};

const mockEmailProvider = {
  sendMfaCode: jest.fn().mockResolvedValue(undefined),
  sendAbandonmentReminder: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
    const config: Record<string, any> = {
      ABANDONMENT_MINUTES: 30,
      FRONTEND_URL: 'http://localhost:3000',
    };
    return config[key] || defaultVal;
  }),
};

describe('RegistrationService', () => {
  let service: RegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: getRepositoryToken(Registration), useValue: mockRepository },
        { provide: EMAIL_PROVIDER, useValue: mockEmailProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new registration and send MFA code', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEmailProvider.sendMfaCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
      expect(result.email).toBe('test@example.com');
    });

    it('should replace an existing IN_PROGRESS registration', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockRegistration });

      const result = await service.create({
        name: 'New Name',
        email: 'test@example.com',
      });

      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEmailProvider.sendMfaCode).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });
  });

  describe('verifyMfa', () => {
    it('should verify MFA with correct code', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaCode: '123456',
        mfaVerified: false,
      });

      const result = await service.verifyMfa('test-uuid', { code: '123456' });

      expect(result.mfaVerified).toBe(true);
      expect(result.currentStep).toBe(RegistrationStep.DOCUMENT);
    });

    it('should reject wrong MFA code', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaCode: '123456',
        mfaVerified: false,
      });

      await expect(
        service.verifyMfa('test-uuid', { code: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if MFA already verified', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: true,
      });

      await expect(
        service.verifyMfa('test-uuid', { code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDocument', () => {
    it('should update document with valid CPF', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: true,
      });

      const result = await service.updateDocument('test-uuid', {
        documentType: DocumentType.CPF,
        document: '529.982.247-25',
      });

      expect(result.document).toBe('52998224725');
      expect(result.currentStep).toBe(RegistrationStep.CONTACT);
    });

    it('should reject invalid CPF', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: true,
      });

      await expect(
        service.updateDocument('test-uuid', {
          documentType: DocumentType.CPF,
          document: '111.111.111-11',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if MFA not verified', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: false,
      });

      await expect(
        service.updateDocument('test-uuid', {
          documentType: DocumentType.CPF,
          document: '529.982.247-25',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateContact', () => {
    it('should update contact with valid phone', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: true,
      });

      const result = await service.updateContact('test-uuid', {
        phone: '(11) 99999-8888',
      });

      expect(result.phone).toBe('11999998888');
      expect(result.currentStep).toBe(RegistrationStep.ADDRESS);
    });

    it('should reject invalid phone', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: true,
      });

      await expect(
        service.updateContact('test-uuid', { phone: '1133334444' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('should complete registration at REVIEW step', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: true,
        currentStep: RegistrationStep.REVIEW,
      });

      const result = await service.complete('test-uuid');

      expect(result.status).toBe(RegistrationStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });

    it('should reject completion if not at REVIEW step', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockRegistration,
        mfaVerified: true,
        currentStep: RegistrationStep.CONTACT,
      });

      await expect(service.complete('test-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return registration by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockRegistration);

      const result = await service.findOne('test-uuid');
      expect(result.id).toBe('test-uuid');
    });

    it('should throw NotFoundException for non-existent id', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
