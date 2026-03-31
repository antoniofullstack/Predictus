'use client';

import React from 'react';

interface FormStepProps {
  title: string;
  subtitle?: string;
  stepNumber?: number;
  totalSteps?: number;
  children: React.ReactNode;
}

export default function FormStep({ title, subtitle, stepNumber, totalSteps, children }: FormStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        {stepNumber !== undefined && totalSteps !== undefined && (
          <p className="text-sm font-semibold text-primary-500">
            Etapa {stepNumber} de {totalSteps}
          </p>
        )}
        <h2 className="text-3xl font-bold text-primary-900 leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
