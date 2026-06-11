export { passwordSchema } from '@njstore/utils/schemas';

type PasswordRequirementKey = 'length' | 'lowercase' | 'uppercase' | 'number' | 'symbol';

export interface PasswordRequirement {
  key: PasswordRequirementKey;
  label: string;
  met: boolean;
}

export interface PasswordStrengthSummary {
  label: string;
  tone: 'neutral' | 'weak' | 'fair' | 'strong';
  score: number;
  entropyBits: number;
  filledBars: number;
  requirements: PasswordRequirement[];
  feedback: string;
}

const PASSWORD_REQUIREMENTS: Array<{ key: PasswordRequirementKey; label: string; test: (value: string) => boolean }> = [
  { key: 'length', label: '8+ characters', test: (value) => value.length >= 8 },
  { key: 'lowercase', label: 'Lowercase letter', test: (value) => /[a-z]/.test(value) },
  { key: 'uppercase', label: 'Uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { key: 'number', label: 'Number', test: (value) => /\d/.test(value) },
  { key: 'symbol', label: 'Symbol', test: (value) => /[^A-Za-z\d]/.test(value) }
];

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const getCharacterPoolSize = (password: string): number => {
  let pool = 0;

  if (/[a-z]/.test(password)) {
    pool += 26;
  }

  if (/[A-Z]/.test(password)) {
    pool += 26;
  }

  if (/\d/.test(password)) {
    pool += 10;
  }

  if (/[^A-Za-z\d]/.test(password)) {
    pool += 33;
  }

  return pool;
};

const formatMissingRequirements = (requirements: PasswordRequirement[]): string => {
  const missing = requirements.filter((requirement) => !requirement.met).map((requirement) => requirement.label.toLowerCase());

  if (missing.length === 0) {
    return 'Everything looks good.';
  }

  if (missing.length === 1) {
    return `Add ${missing[0]}.`;
  }

  if (missing.length === 2) {
    return `Add ${missing[0]} and ${missing[1]}.`;
  }

  const lastMissing = missing[missing.length - 1];

  return `Add ${missing.slice(0, -1).join(', ')}, and ${lastMissing}.`;
};

export const getPasswordStrengthSummary = (password: string): PasswordStrengthSummary => {
  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    key: requirement.key,
    label: requirement.label,
    met: requirement.test(password)
  }));
  const metCount = requirements.filter((requirement) => requirement.met).length;
  const poolSize = getCharacterPoolSize(password);
  const entropyBits = password.length > 0 && poolSize > 0 ? password.length * Math.log2(poolSize) : 0;
  const uniqueRatio = password.length > 0 ? new Set(password).size / password.length : 0;
  const entropyScore = entropyBits * (0.58 + uniqueRatio * 0.42);
  const varietyBonus = metCount * 7;
  const lengthBonus = Math.min(16, Math.max(0, password.length - 8) * 1.8);
  const shortPenalty = password.length > 0 && password.length < 8 ? 16 : 0;
  const score = clamp(entropyScore + varietyBonus + lengthBonus - shortPenalty, 0, 100);

  if (password.length === 0) {
    return {
      label: 'Start typing',
      tone: 'neutral',
      score: 0,
      entropyBits: 0,
      filledBars: 0,
      requirements,
      feedback: 'Use 8+ characters with uppercase, lowercase, a number, and a symbol.'
    };
  }

  if (password.length < 8 || metCount < 3 || score < 46) {
    return {
      label: 'Weak',
      tone: 'weak',
      score,
      entropyBits,
      filledBars: 1,
      requirements,
      feedback: formatMissingRequirements(requirements)
    };
  }

  if (metCount < 5 || score < 74) {
    return {
      label: 'Fair',
      tone: 'fair',
      score,
      entropyBits,
      filledBars: 2,
      requirements,
      feedback: 'Close. Hit every rule and add a little more length for a stronger password.'
    };
  }

  return {
    label: 'Strong',
    tone: 'strong',
    score,
    entropyBits,
    filledBars: 4,
    requirements,
    feedback: `Strong password. Estimated entropy is about ${Math.round(entropyBits)} bits.`
  };
};
