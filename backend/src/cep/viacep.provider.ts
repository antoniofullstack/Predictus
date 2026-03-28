import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CepProvider, CepResult } from './cep-provider.interface';

@Injectable()
export class ViaCepProvider implements CepProvider {
  private readonly logger = new Logger(ViaCepProvider.name);

  async lookup(cep: string): Promise<CepResult | null> {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
      );

      if (response.data.erro) {
        return null;
      }

      return {
        cep: response.data.cep,
        street: response.data.logradouro,
        neighborhood: response.data.bairro,
        city: response.data.localidade,
        state: response.data.uf,
      };
    } catch (error) {
      this.logger.error(`Failed to lookup CEP ${cleanCep}`, error);
      return null;
    }
  }
}
