'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface MaskedInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mask: (value: string) => string;
  placeholder?: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  maxLength?: number;
}

export default function MaskedInput({
  label,
  name,
  value,
  onChange,
  mask,
  placeholder,
  error,
  success = false,
  disabled = false,
  maxLength,
}: MaskedInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = mask(raw);
    const syntheticEvent = {
      ...e,
      target: { ...e.target, name, value: masked },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error
              ? 'border-red-400 focus:ring-red-400'
              : success
                ? 'border-primary-500'
                : 'border-gray-300 hover:border-gray-400'
          }`}
        />
        {success && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
