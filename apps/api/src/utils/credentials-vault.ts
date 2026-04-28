import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALGO = 'aes-256-cbc';

function getKey(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY debe tener exactamente 32 caracteres');
  }
  return Buffer.from(key, 'utf-8');
}

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encHex] = encryptedText.split(':');
  if (!ivHex || !encHex) throw new Error('Invalid encrypted format');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export async function saveCredentials(userId: string, system: string, username: string, password: string): Promise<void> {
  await prisma.userCredentials.upsert({
    where: { userId_system: { userId, system } },
    create: { userId, system, username: encrypt(username), password: encrypt(password) },
    update: { username: encrypt(username), password: encrypt(password) },
  });
}

export async function getCredentials(userId: string, system: string): Promise<{ username: string; password: string } | null> {
  const cred = await prisma.userCredentials.findUnique({
    where: { userId_system: { userId, system } },
  });
  if (!cred) return null;
  return { username: decrypt(cred.username), password: decrypt(cred.password) };
}
