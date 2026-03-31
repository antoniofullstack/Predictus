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
  documentType: DocumentType | null;

  @Column({ type: 'varchar', nullable: true })
  document: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  cep: string | null;

  @Column({ type: 'varchar', nullable: true })
  street: string | null;

  @Column({ type: 'varchar', nullable: true })
  number: string | null;

  @Column({ type: 'varchar', nullable: true })
  complement: string | null;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true })
  state: string | null;

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
