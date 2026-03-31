'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { registrationApi, cepApi } from '@/lib/api';
import {
  maskCPF,
  maskCNPJ,
  maskPhone,
  maskCEP,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
} from '@/lib/masks';
import {
  ChevronLeft,
  User,
  Building2,
  Check,
  Lock,
  Search,
  CreditCard,
  Mail,
  Pencil,
  CheckCircle,
} from 'lucide-react';
import TextInput from '@/components/ui/TextInput';
import MaskedInput from '@/components/ui/MaskedInput';
import Button from '@/components/ui/Button';
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
      <div className="w-full max-w-md mx-auto flex items-center justify-center min-h-screen">
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
  const [editingFromReview, setEditingFromReview] = useState(false);

  // Step 1 - Identification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 - MFA
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerified, setMfaVerified] = useState(false);

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
      case 'IDENTIFICATION': return mfaVerified ? 2 : 1;
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
      setMfaVerified(reg.mfaVerified);

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

  // Step 1: Create registration (or skip if already created and MFA verified)
  const handleIdentification = async () => {
    if (registrationId && mfaVerified) {
      setEditingFromReview(false);
      setCurrentStep(5);
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
    setLoading(true);
    setError('');
    try {
      await registrationApi.verifyMfa(registrationId!, mfaCode.trim());
      setMfaVerified(true);
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
    setLoading(true);
    setError('');
    try {
      await registrationApi.updateDocument(registrationId!, {
        documentType: docType,
        document: cleanDoc,
      });
      if (editingFromReview) {
        setEditingFromReview(false);
        setCurrentStep(5);
      } else {
        setCurrentStep(3);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Update contact
  const handleContact = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    setLoading(true);
    setError('');
    try {
      await registrationApi.updateContact(registrationId!, { phone: cleanPhone });
      if (editingFromReview) {
        setEditingFromReview(false);
        setCurrentStep(5);
      } else {
        setCurrentStep(4);
      }
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

  const handleRestart = () => {
    setCurrentStep(0);
    setRegistrationId(null);
    setLoading(false);
    setError('');
    setCompleted(false);
    setMfaVerified(false);
    setEditingFromReview(false);
    setName('');
    setEmail('');
    setMfaCode('');
    setDocType('CPF');
    setDocument('');
    setPhone('');
    setCep('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
  };

  if (completed) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-6">
        <SuccessScreen name={name} email={email} onRestart={handleRestart} />
      </div>
    );
  }

  const handleBack = () => {
    if (currentStep === 0) {
      window.history.back();
    } else {
      setError('');
      setCurrentStep(currentStep - 1);
    }
  };

  const handleResendMfa = async () => {
    if (!registrationId) return;
    setLoading(true);
    setError('');
    try {
      await registrationApi.resendMfa(registrationId);
      setError('');
      setMfaCode('');
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = STEPS.length;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-6">
      {/* Header: Back button + Step dots */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-primary-500' : i < currentStep ? 'w-2 bg-primary-300' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
        <div className="w-10" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Identification */}
      {currentStep === 0 && (
        <FormStep title="Vamos começar com sua identidade" subtitle="Informe seu nome completo e e-mail." stepNumber={1} totalSteps={totalSteps}>
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
          </div>
        </FormStep>
      )}

      {/* Step 2: MFA Verification */}
      {currentStep === 1 && (
        <FormStep
          title="Verificação"
          subtitle={`Enviamos um código de 6 dígitos para ${email}`}
          stepNumber={2}
          totalSteps={totalSteps}
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
            <button
              type="button"
              onClick={handleResendMfa}
              disabled={loading}
              className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors disabled:opacity-50"
            >
              Reenviar código
            </button>
          </div>
        </FormStep>
      )}

      {/* Step 3: Document */}
      {currentStep === 2 && (
        <FormStep title="Verificação de identidade" subtitle="Escolha o tipo de documento para continuar o cadastro." stepNumber={3} totalSteps={totalSteps}>
          <div className="space-y-5">
            <p className="text-sm font-medium text-gray-700">Tipo de documento</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setDocType('CPF'); setDocument(''); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  docType === 'CPF'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  docType === 'CPF' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-primary-900">Pessoa Física (CPF)</p>
                  <p className="text-sm text-gray-500">Para contas individuais</p>
                </div>
                {docType === 'CPF' && (
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setDocType('CNPJ'); setDocument(''); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  docType === 'CNPJ'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  docType === 'CNPJ' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-primary-900">Pessoa Jurídica (CNPJ)</p>
                  <p className="text-sm text-gray-500">Para contas empresariais</p>
                </div>
                {docType === 'CNPJ' && (
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            </div>
            <MaskedInput
              label={`Número do ${docType}`}
              name="document"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              mask={docType === 'CPF' ? maskCPF : maskCNPJ}
              placeholder={docType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
              maxLength={docType === 'CPF' ? 14 : 18}
            />
          </div>
        </FormStep>
      )}

      {/* Step 4: Contact */}
      {currentStep === 3 && (
        <FormStep title="Contato" subtitle="Informe seu telefone celular." stepNumber={4} totalSteps={totalSteps}>
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
          </div>
          <div className="mt-8 bg-primary-50 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              Usaremos isso para proteger sua conta. Seu número nunca será compartilhado com terceiros sem sua permissão.
            </p>
          </div>
        </FormStep>
      )}

      {/* Step 5: Address */}
      {currentStep === 4 && (
        <FormStep title="Endereço" subtitle="Informe seu endereço residencial. Utilizado para conformidade e segurança da conta." stepNumber={5} totalSteps={totalSteps}>
          <div className="space-y-5">
            {/* CEP field with search icon */}
            <div className="space-y-1.5">
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700">CEP</label>
              <div className="relative">
                <input
                  id="cep"
                  name="cep"
                  type="text"
                  value={cep}
                  onChange={(e) => {
                    const masked = maskCEP(e.target.value);
                    setCep(masked);
                    handleCepLookup(masked);
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {cepLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Grouped address card */}
            <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
              <TextInput
                label="Rua"
                name="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Avenida Paulista"
              />
              <div className="flex gap-3">
                <div className="w-[30%]">
                  <TextInput
                    label="Número"
                    name="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="1000"
                  />
                </div>
                <div className="w-[70%]">
                  <TextInput
                    label="Complemento (Opcional)"
                    name="complement"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Apto 42"
                  />
                </div>
              </div>
              <TextInput
                label="Bairro"
                name="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Bela Vista"
              />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <TextInput
                    label="Cidade"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
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
            </div>
          </div>
        </FormStep>
      )}

      {/* Step 6: Review */}
      {currentStep === 5 && (
        <FormStep title="Revisão" subtitle="Verifique suas informações antes de criar sua conta." stepNumber={6} totalSteps={totalSteps}>
          <div className="space-y-5">
            {/* Identification Card */}
            <div className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary-500" />
                  </div>
                  <span className="font-semibold text-primary-900">Identificação</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingFromReview(true); setCurrentStep(0); }}
                  className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
                >
                  Editar <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Nome completo</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{docType}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{document}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Endereço</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {street}, {number}{complement ? ` - ${complement}` : ''}, {neighborhood}, {city}/{state} - {cep}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Card */}
            <div className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary-500" />
                  </div>
                  <span className="font-semibold text-primary-900">Contato</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingFromReview(true); setCurrentStep(3); }}
                  className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
                >
                  Editar <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">E-mail</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                    {email} <CheckCircle className="w-4 h-4 text-primary-500" />
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Telefone</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                    {phone} <CheckCircle className="w-4 h-4 text-primary-500" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FormStep>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: Action button + Security footer */}
      <div className="pt-6">
        {currentStep === 0 && (
          <Button onClick={handleIdentification} loading={loading}>
            Continuar
          </Button>
        )}
        {currentStep === 1 && (
          mfaVerified ? (
            <Button onClick={() => setCurrentStep(2)}>
              Avançar
            </Button>
          ) : (
            <Button onClick={handleVerifyMfa} loading={loading}>
              Verificar
            </Button>
          )
        )}
        {currentStep === 2 && (
          <Button onClick={handleDocument} loading={loading}>
            Continuar
          </Button>
        )}
        {currentStep === 3 && (
          <Button onClick={handleContact} loading={loading}>
            Continuar
          </Button>
        )}
        {currentStep === 4 && (
          <Button onClick={handleAddress} loading={loading}>
            Continuar
          </Button>
        )}
        {currentStep === 5 && (
          <Button onClick={handleComplete} loading={loading} variant="outline">
            Criar Conta
          </Button>
        )}
      </div>
    </div>
  );
}
