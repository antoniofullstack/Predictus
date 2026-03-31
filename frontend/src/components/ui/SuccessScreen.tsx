'use client';

import React from 'react';
import { Check, RotateCcw, Mail } from 'lucide-react';

interface SuccessScreenProps {
  name: string;
  email?: string;
  onRestart?: () => void;
}

export default function SuccessScreen({ name, email, onRestart }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center w-full flex-1">
      {/* Large green checkmark */}
      <div className="flex justify-center mt-8 mb-6">
        <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </div>
      </div>

      {/* Title and subtitle */}
      <div className="text-center space-y-3 mb-8">
        <h2 className="text-3xl font-bold text-primary-900">
          Cadastro Concluído!
        </h2>
        <p className="text-gray-500 text-base leading-relaxed">
          Bem-vindo ao Predictus, <strong>{name}</strong>! Sua conta está
          pronta e totalmente verificada.
        </p>
      </div>

      {/* Email confirmation message */}
      <div className="w-full bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
        <Mail className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600 leading-relaxed">
          Enviamos um e-mail de confirmação para{' '}
          {email ? <strong>{email}</strong> : 'o seu endereço de e-mail'}.
          Verifique sua caixa de entrada.
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom buttons */}
      <div className="w-full pt-6 space-y-3">
        <button
          onClick={() => window.location.href = '/'}
          className="w-full font-semibold py-4 px-6 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200 text-base"
        >
          Ir para o Dashboard
        </button>
        {onRestart && (
          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors py-2"
          >
            <RotateCcw className="w-4 h-4" />
            Novo Cadastro
          </button>
        )}
      </div>
    </div>
  );
}
