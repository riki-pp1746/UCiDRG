export const registrationPasswordMinLength = 8;
export const registrationPasswordHelp = 'Minimal 8 karakter. Gunakan huruf besar, huruf kecil, angka, dan simbol seperti ! atau @.';

// Match the character groups accepted by Supabase Auth.
const passwordSymbols = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export function meetsRegistrationPasswordRules(password: string): boolean {
  return Array.from(password).length >= registrationPasswordMinLength
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && Array.from(password).some(character => passwordSymbols.includes(character));
}
