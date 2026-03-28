import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './entities/registration.entity';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { EMAIL_PROVIDER } from './providers/email-provider.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Registration])],
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    {
      provide: EMAIL_PROVIDER,
      useClass: ResendEmailProvider,
    },
  ],
})
export class RegistrationModule {}
