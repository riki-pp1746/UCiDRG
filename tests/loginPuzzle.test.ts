import { expect, it } from 'vitest';
import { isLoginCaptchaProofValid, LOGIN_PUZZLE_TTL, puzzleMatches } from '../src/lib/loginCaptcha';
it('accepts matching pieces and rejects incorrect or invalid positions', () => {
  expect(puzzleMatches(202, 200)).toBe(true);
  expect(puzzleMatches(207, 200)).toBe(false);
  expect(puzzleMatches(NaN, 200)).toBe(false);
  expect(puzzleMatches(0, 0)).toBe(false);
});
it('expires completion and rejects future or missing completion', () => {
  const now = 1_000_000;
  expect(isLoginCaptchaProofValid({ completedAt: now - 1 }, now)).toBe(true);
  expect(isLoginCaptchaProofValid({ completedAt: now - LOGIN_PUZZLE_TTL }, now)).toBe(false);
  expect(isLoginCaptchaProofValid({ completedAt: now + 1 }, now)).toBe(false);
  expect(isLoginCaptchaProofValid(null, now)).toBe(false);
});
