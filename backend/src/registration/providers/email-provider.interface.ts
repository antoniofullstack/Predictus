export interface EmailProvider {
  sendMfaCode(email: string, code: string): Promise<void>;
  sendAbandonmentReminder(email: string, name: string, resumeLink: string): Promise<void>;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
