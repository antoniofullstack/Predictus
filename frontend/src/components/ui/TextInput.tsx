'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface TextInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  success?: boolean;
  successMessage?: string;
  disabled?: boolean;
  maxLength?: number;
}

export default function TextInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  success = false,
  successMessage,
  disabled = false,
  maxLength,
}: TextInputProps) {
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
          type={type}
          value={value}
          onChange={onChange}
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
      {success && !error && successMessage && <p className="text-sm text-primary-500">{successMessage}</p>}
    </div>
  );
}
