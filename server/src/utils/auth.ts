import { User } from '../db';

export function generateToken(user: User): string {
  const tokenData = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
} 