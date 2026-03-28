'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessScreenProps {
  name: string;
}

export default function SuccessScreen({ name }: SuccessScreenProps) {
  return (
    <div className="text-center space-y-6 py-8 animate-in fade-in zoom-in duration-500">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-primary-900">
          Cadastro Concluído!
        </h2>
        <p className="text-gray-500 text-lg">
          Parabéns, <strong>{name}</strong>! Seu cadastro foi realizado com
          sucesso.
        </p>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-green-700 text-sm">
          Você receberá um e-mail de confirmação em breve.
        </p>
      </div>
    </div>
  );
}
