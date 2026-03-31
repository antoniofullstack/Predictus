import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RegistrationStep } from '../enums/registration-step.enum';
import { RegistrationStatus } from '../enums/registration-status.enum';
import { DocumentType } from '../enums/document-type.enum';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'enum', enum: DocumentType, nullable: true })
  documentType: DocumentType;

  @Column({ type: 'varchar', nullable: true })
  document: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  cep: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  number: string;

  @Column({ nullable: true })
  complement: string;

  @Column({ nullable: true })
  neighborhood: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({
    type: 'enum',
    enum: RegistrationStep,
    default: RegistrationStep.IDENTIFICATION,
  })
  currentStep: RegistrationStep;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.IN_PROGRESS,
  })
  status: RegistrationStatus;

  @Column({ nullable: true })
  mfaCode: string;

  @Column({ default: false })
  mfaVerified: boolean;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
