import {
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  generateMfaCode,
} from './validators';

describe('Validators', () => {
  describe('isValidCPF', () => {
    it('should return true for a valid CPF', () => {
      expect(isValidCPF('529.982.247-25')).toBe(true);
      expect(isValidCPF('52998224725')).toBe(true);
    });

    it('should return false for an invalid CPF', () => {
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('123.456.789-00')).toBe(false);
      expect(isValidCPF('000.000.000-00')).toBe(false);
    });

    it('should return false for CPF with wrong length', () => {
      expect(isValidCPF('123')).toBe(false);
      expect(isValidCPF('')).toBe(false);
      expect(isValidCPF('1234567890123')).toBe(false);
    });
  });

  describe('isValidCNPJ', () => {
    it('should return true for a valid CNPJ', () => {
      expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
      expect(isValidCNPJ('11222333000181')).toBe(true);
    });

    it('should return false for an invalid CNPJ', () => {
      expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
      expect(isValidCNPJ('12.345.678/0001-00')).toBe(false);
    });

    it('should return false for CNPJ with wrong length', () => {
      expect(isValidCNPJ('123')).toBe(false);
      expect(isValidCNPJ('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should return true for a valid mobile phone', () => {
      expect(isValidPhone('11999887766')).toBe(true);
      expect(isValidPhone('(21) 98765-4321')).toBe(true);
    });

    it('should return false for a landline phone', () => {
      expect(isValidPhone('1133334444')).toBe(false);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('0099988776655')).toBe(false);
    });
  });

  describe('generateMfaCode', () => {
    it('should generate a 6-digit string', () => {
      const code = generateMfaCode();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes', () => {
      const codes = new Set(
        Array.from({ length: 10 }, () => generateMfaCode()),
      );
      expect(codes.size).toBeGreaterThan(1);
    });
  });
});
