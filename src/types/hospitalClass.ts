export const hospitalClasses = ['A', 'B', 'C', 'D'] as const;
export type HospitalClass = typeof hospitalClasses[number];

export function isHospitalClass(value: unknown): value is HospitalClass {
  return hospitalClasses.some(hospitalClass => hospitalClass === value);
}
