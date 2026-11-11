// Local interaction only; not a server-side anti-bot credential.
export interface LoginCaptchaProof { completedAt: number }
export const LOGIN_PUZZLE_TTL = 120_000;
export function puzzleMatches(position: number, target: number): boolean {
  return Number.isFinite(position) && Number.isFinite(target)
    && position >= 0 && position <= 356 && target >= 100 && target <= 340
    && Math.abs(position - target) <= 6;
}
export function isLoginCaptchaProofValid(proof: LoginCaptchaProof | null | undefined, now = Date.now()): boolean {
  return Boolean(proof && Number.isFinite(proof.completedAt)
    && now >= proof.completedAt && now - proof.completedAt < LOGIN_PUZZLE_TTL);
}
