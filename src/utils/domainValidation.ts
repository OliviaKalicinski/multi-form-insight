/**
 * Validates if an email belongs to the allowed domain
 */
export const ALLOWED_DOMAIN = "@letsfly.com.br";

export function isValidDomain(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  return email.toLowerCase().trim().endsWith(ALLOWED_DOMAIN.toLowerCase());
}

export function getDomainValidationError(): string {
  return `Apenas emails ${ALLOWED_DOMAIN} são permitidos`;
}
