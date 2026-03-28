import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CepProvider, CEP_PROVIDER } from './cep-provider.interface';

@Controller('cep')
export class CepController {
  constructor(
    @Inject(CEP_PROVIDER) private readonly cepProvider: CepProvider,
  ) {}

  @Get(':cep')
  async lookup(@Param('cep') cep: string) {
    const result = await this.cepProvider.lookup(cep);

    if (!result) {
      throw new NotFoundException('CEP não encontrado');
    }

    return result;
  }
}
