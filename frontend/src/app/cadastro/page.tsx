'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { registrationApi, cepApi, Registration } from '@/lib/api';
import { maskCPF, maskCNPJ, maskPhone, maskCEP, formatCPF, formatCNPJ, formatPhone, formatCEP } from '@/lib/masks';
import TextInput from '@/components/ui/TextInput';
import MaskedInput from '@/components/ui/MaskedInput';
import Button from '@/components/ui/Button';
import StepIndicator from '@/components/ui/StepIndicator';
import FormStep from '@/components/ui/FormStep';
import SuccessScreen from '@/components/ui/SuccessScreen';

const STEPS = [
  { label: 'Identificação', key: 'IDENTIFICATION' },
  { label: 'Verificação', key: 'MFA' },
  { label: 'Documento', key: 'DOCUMENT' },
  { label: 'Contato', key: 'CONTACT' },
  { label: 'Endereço', key: 'ADDRESS' },
  { label: 'Revisão', key: 'REVIEW' },
];

type DocType = 'CPF' | 'CNPJ';

export default function CadastroPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8 flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CadastroContent />
    </Suspense>
  );
}

function CadastroContent() {
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  // Step 1 - Identification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 - MFA
  const [mfaCode, setMfaCode] = useState('');

  // Step 3 - Document
  const [docType, setDocType] = useState<DocType>('CPF');
  const [document, setDocument] = useState('');

  // Step 4 - Contact
  const [phone, setPhone] = useState('');

  // Step 5 - Address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const stepToIndex = useCallback((step: string, mfaVerified: boolean): number => {
    switch (step) {
      case 'IDENTIFICATION': return mfaVerified ? 2 : 0;
      case 'DOCUMENT': return 2;
      case 'CONTACT': return 3;
      case 'ADDRESS': return 4;
      case 'REVIEW': return 5;
      default: return 0;
    }
  }, []);

  const loadRegistration = useCallback(async (id: string) => {
    try {
      const res = await registrationApi.findOne(id);
      const reg = res.data;
      setRegistrationId(reg.id);
      setName(reg.name || '');
      setEmail(reg.email || '');

      if (reg.status === 'COMPLETED') {
        setCompleted(true);
        return;
      }

      if (reg.documentType) setDocType(reg.documentType);
      if (reg.document) setDocument(reg.documentType === 'CPF' ? formatCPF(reg.document) : formatCNPJ(reg.document));
      if (reg.phone) setPhone(formatPhone(reg.phone));
      if (reg.cep) setCep(formatCEP(reg.cep));
      if (reg.street) setStreet(reg.street);
      if (reg.number) setNumber(reg.number);
      if (reg.complement) setComplement(reg.complement);
      if (reg.neighborhood) setNeighborhood(reg.neighborhood);
      if (reg.city) setCity(reg.city);
      if (reg.state) setState(reg.state);

      setCurrentStep(stepToIndex(reg.currentStep, reg.mfaVerified));
    } catch {
      // Registration not found, start fresh
    }
  }, [stepToIndex]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      loadRegistration(id);
    }
  }, [searchParams, loadRegistration]);

  const handleError = (err: any) => {
    if (err.response?.data?.message) {
      const msg = err.response.data.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } else {
      setError('Ocorreu um erro. Tente novamente.');
    }
  };

  // Step 1: Create registration
  const handleIdentification = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await registrationApi.create({ name: name.trim(), email: email.trim() });
      setRegistrationId(res.data.id);
      setCurrentStep(1);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify MFA
  const handleVerifyMfa = async () => {
    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setError('Informe o código de 6 dígitos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registrationApi.verifyMfa(registrationId!, mfaCode.trim());
      setCurrentStep(2);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update document
  const handleDocument = async () => {
    const cleanDoc = document.replace(/\D/g, '');
    if (!cleanDoc) {
      setError('Informe o documento');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registrationApi.updateDocument(registrationId!, {
        documentType: docType,
        document: cleanDoc,
      });
      setCurrentStep(3);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Update contact
  const handleContact = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      setError('Informe o telefone');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registrationApi.updateContact(registrationId!, { phone: cleanPhone });
      setCurrentStep(4);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // CEP lookup
  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await cepApi.lookup(cleanCep);
        setStreet(res.data.street || '');
        setNeighborhood(res.data.neighborhood || '');
        setCity(res.data.city || '');
        setState(res.data.state || '');
      } catch {
        // CEP not found, user fills manually
      } finally {
        setCepLoading(false);
      }
    }
  };

  // Step 5: Update address
  const handleAddress = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (!cleanCep || !street.trim() || !number.trim() || !neighborhood.trim() || !city.trim() || !state.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registrationApi.updateAddress(registrationId!, {
        cep: cleanCep,
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
      });
      setCurrentStep(5);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Complete
  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      await registrationApi.complete(registrationId!);
      setCompleted(true);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <SuccessScreen name={name} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary-900">Predictus</h1>
        <p className="text-sm text-gray-400">Cadastro</p>
      </div>

      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Identification */}
      {currentStep === 0 && (
        <FormStep title="Identificação" subtitle="Informe seu nome e e-mail">
          <div className="space-y-4">
            <TextInput
              label="Nome completo"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
            />
            <TextInput
              label="E-mail"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
            <Button onClick={handleIdentification} loading={loading}>
              Continuar
            </Button>
          </div>
        </FormStep>
      )}

      {/* Step 2: MFA Verification */}
      {currentStep === 1 && (
        <FormStep
          title="Verificação"
          subtitle={`Enviamos um código de 6 dígitos para ${email}`}
        >
          <div className="space-y-4">
            <TextInput
              label="Código de verificação"
              name="mfaCode"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
            />
            <Button onClick={handleVerifyMfa} loading={loading}>
              Verificar
            </Button>
          </div>
        </FormStep>
      )}

      {/* Step 3: Document */}
      {currentStep === 2 && (
        <FormStep title="Documento" subtitle="Informe seu CPF ou CNPJ">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDocType('CPF'); setDocument(''); }}
                className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-colors ${
                  docType === 'CPF'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                CPF
              </button>
              <button
                type="button"
                onClick={() => { setDocType('CNPJ'); setDocument(''); }}
                className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-colors ${
                  docType === 'CNPJ'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                CNPJ
              </button>
            </div>
            <MaskedInput
              label={docType}
              name="document"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              mask={docType === 'CPF' ? maskCPF : maskCNPJ}
              placeholder={docType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
              maxLength={docType === 'CPF' ? 14 : 18}
            />
            <Button onClick={handleDocument} loading={loading}>
              Continuar
            </Button>
          </div>
        </FormStep>
      )}

      {/* Step 4: Contact */}
      {currentStep === 3 && (
        <FormStep title="Contato" subtitle="Informe seu telefone celular">
          <div className="space-y-4">
            <MaskedInput
              label="Telefone celular"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              mask={maskPhone}
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
            <Button onClick={handleContact} loading={loading}>
              Continuar
            </Button>
          </div>
        </FormStep>
      )}

      {/* Step 5: Address */}
      {currentStep === 4 && (
        <FormStep title="Endereço" subtitle="Informe seu endereço completo">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <MaskedInput
                  label="CEP"
                  name="cep"
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value);
                    handleCepLookup(e.target.value);
                  }}
                  mask={maskCEP}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              {cepLoading && (
                <div className="flex items-end pb-3">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <TextInput
              label="Rua"
              name="street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Rua, Avenida..."
            />
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Número"
                name="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="123"
              />
              <TextInput
                label="Complemento"
                name="complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto, Bloco..."
              />
            </div>
            <TextInput
              label="Bairro"
              name="neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Bairro"
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <TextInput
                  label="Cidade"
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <TextInput
                label="UF"
                name="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="SP"
                maxLength={2}
              />
            </div>
            <Button onClick={handleAddress} loading={loading}>
              Continuar
            </Button>
          </div>
        </FormStep>
      )}

      {/* Step 6: Review */}
      {currentStep === 5 && (
        <FormStep title="Revisão" subtitle="Confira seus dados antes de concluir">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <ReviewItem label="Nome" value={name} />
              <ReviewItem label="E-mail" value={email} />
              <ReviewItem label={docType} value={document} />
              <ReviewItem label="Telefone" value={phone} />
              <ReviewItem label="CEP" value={cep} />
              <ReviewItem label="Endereço" value={`${street}, ${number}${complement ? ` - ${complement}` : ''}`} />
              <ReviewItem label="Bairro" value={neighborhood} />
              <ReviewItem label="Cidade/UF" value={`${city} / ${state}`} />
            </div>
            <Button onClick={handleComplete} loading={loading}>
              Concluir Cadastro
            </Button>
          </div>
        </FormStep>
      )}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
