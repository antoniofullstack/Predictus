'use client';

import React from 'react';

interface FormStepProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function FormStep({ title, subtitle, children }: FormStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-primary-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
