import { ViaCepProvider } from './viacep.provider';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ViaCepProvider', () => {
  let provider: ViaCepProvider;

  beforeEach(() => {
    provider = new ViaCepProvider();
    jest.clearAllMocks();
  });

  it('should return address data for a valid CEP', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
      },
    });

    const result = await provider.lookup('01001000');

    expect(result).toEqual({
      cep: '01001-000',
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01001000/json/',
    );
  });

  it('should return null for an invalid CEP', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { erro: true },
    });

    const result = await provider.lookup('00000000');
    expect(result).toBeNull();
  });

  it('should return null for a CEP with wrong length', async () => {
    const result = await provider.lookup('123');
    expect(result).toBeNull();
  });

  it('should return null when API call fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    const result = await provider.lookup('01001000');
    expect(result).toBeNull();
  });
});
