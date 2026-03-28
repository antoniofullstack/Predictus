import { Module } from '@nestjs/common';
import { CepController } from './cep.controller';
import { ViaCepProvider } from './viacep.provider';
import { CEP_PROVIDER } from './cep-provider.interface';

@Module({
  controllers: [CepController],
  providers: [
    {
      provide: CEP_PROVIDER,
      useClass: ViaCepProvider,
    },
  ],
  exports: [CEP_PROVIDER],
})
export class CepModule {}
