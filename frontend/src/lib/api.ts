import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Registration {
  id: string;
  name: string;
  email: string;
  documentType: 'CPF' | 'CNPJ' | null;
  document: string | null;
  phone: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  currentStep: 'IDENTIFICATION' | 'DOCUMENT' | 'CONTACT' | 'ADDRESS' | 'REVIEW';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  mfaVerified: boolean;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface CepResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const registrationApi = {
  create: (data: { name: string; email: string }) =>
    api.post<Registration>('/registrations', data),

  verifyMfa: (id: string, code: string) =>
    api.post<Registration>(`/registrations/${id}/verify-mfa`, { code }),

  updateDocument: (id: string, data: { documentType: 'CPF' | 'CNPJ'; document: string }) =>
    api.patch<Registration>(`/registrations/${id}/step/document`, data),

  updateContact: (id: string, data: { phone: string }) =>
    api.patch<Registration>(`/registrations/${id}/step/contact`, data),

  updateAddress: (id: string, data: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  }) =>
    api.patch<Registration>(`/registrations/${id}/step/address`, data),

  complete: (id: string) =>
    api.patch<Registration>(`/registrations/${id}/complete`),

  findOne: (id: string) =>
    api.get<Registration>(`/registrations/${id}`),
};

export const cepApi = {
  lookup: (cep: string) =>
    api.get<CepResult>(`/cep/${cep}`),
};

export default api;
