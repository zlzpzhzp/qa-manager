import { describe, it, expect } from 'vitest';
import { createAuthToken, verifyAuthToken, signToken } from '../src/lib/supabase';

describe('auth token', () => {
  it('생성된 토큰 검증 통과', () => {
    const token = createAuthToken();
    expect(verifyAuthToken(token)).toBe(true);
  });

  it('잘못된 토큰 거부', () => {
    expect(verifyAuthToken('invalid-token')).toBe(false);
    expect(verifyAuthToken('')).toBe(false);
    expect(verifyAuthToken('teacher:abc:def')).toBe(false);
  });

  it('변조된 토큰 거부', () => {
    const token = createAuthToken();
    const parts = token.split(':');
    parts[2] = 'tampered';
    expect(verifyAuthToken(parts.join(':'))).toBe(false);
  });

  it('만료된 토큰 거부', () => {
    const expired = Date.now() - 1000;
    const payload = `teacher:${expired}`;
    const sig = signToken(payload);
    const token = `${payload}:${sig}`;
    expect(verifyAuthToken(token)).toBe(false);
  });

  it('토큰 형식: role:expires:sig', () => {
    const token = createAuthToken();
    const parts = token.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('teacher');
    expect(Number(parts[1])).toBeGreaterThan(Date.now());
  });
});
