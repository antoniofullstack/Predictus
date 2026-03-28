'use client';

import React from 'react';

interface MaskedInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mask: (value: string) => string;
  placeholder?: string;
  error?: string;
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
            : 'border-gray-300 hover:border-gray-400'
        }`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
