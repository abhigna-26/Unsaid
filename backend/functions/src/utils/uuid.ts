import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export function generateUUID(): string {
  return uuidv4();
}

export function isValidUUID(uuid: string): boolean {
  return typeof uuid === 'string' && validateUuid(uuid);
}
