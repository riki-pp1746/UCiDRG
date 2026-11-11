export const loginCaptchaId = import.meta.env.VITE_GEETEST_CAPTCHA_ID?.trim() ?? '';

export interface LoginCaptchaProof {
  lot_number: string;
  captcha_output: string;
  pass_token: string;
  gen_time: string;
}
