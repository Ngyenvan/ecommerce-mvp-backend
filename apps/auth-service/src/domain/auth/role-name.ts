export const RoleName = {
  Customer: 'CUSTOMER',
  Admin: 'ADMIN',
} as const;

export type RoleName =
  (typeof RoleName)[keyof typeof RoleName];

export function isRoleName(value: string): value is RoleName {
  return Object.values(RoleName).some((role) => role === value);
}
