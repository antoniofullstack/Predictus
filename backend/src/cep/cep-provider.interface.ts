export interface CepResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CepProvider {
  lookup(cep: string): Promise<CepResult | null>;
}

export const CEP_PROVIDER = 'CEP_PROVIDER';
