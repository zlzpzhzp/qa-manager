import { describe, it, expect } from 'vitest';
import { createAuthToken, verifyAuthToken, signToken } from '../src/lib/supabase';

describe('auth token', () => {
  it('생성된 토큰 검증 통과', async () => {
    const token = await createAuthToken();
    expect(await verifyAuthToken(token)).toBe(true);
  });

  it('잘못된 토큰 거부', async () => {
    expect(await verifyAuthToken('invalid-token')).toBe(false);
    expect(await verifyAuthToken('')).toBe(false);
    expect(await verifyAuthToken('teacher:abc:def')).toBe(false);
  });

  it('변조된 토큰 거부', async () => {
    const token = await createAuthToken();
    const parts = token.split(':');
    parts[2] = 'tampered';
    expect(await verifyAuthToken(parts.join(':'))).toBe(false);
  });

  it('만료된 토큰 거부', async () => {
    const expired = Date.now() - 1000;
    const payload = `teacher:${expired}`;
    const sig = await signToken(payload);
    const token = `${payload}:${sig}`;
    expect(await verifyAuthToken(token)).toBe(false);
  });

  it('토큰 형식: role:expires:sig', async () => {
    const token = await createAuthToken();
    const parts = token.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('teacher');
    expect(Number(parts[1])).toBeGreaterThan(Date.now());
  });
});
