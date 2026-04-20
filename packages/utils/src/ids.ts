import { customAlphabet } from 'nanoid';

const idAlphabet = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 16);

export function createId(prefix: string): string {
  return `${prefix}_${idAlphabet()}`;
}