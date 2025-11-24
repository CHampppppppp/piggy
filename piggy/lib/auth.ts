'use server';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { securityQuestions } from '@/lib/securityQuestions';

const AUTH_COOKIE = 'piggy-auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type AuthState = {
  error?: string;
};

export type RecoveryState = {
  error?: string;
  success?: boolean;
  password?: string;
};

function computeToken(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export async function hasValidSession() {
  const expected = process.env.GIRLFRIEND_PASSWORD;
  if (!expected) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionCookie) {
    return false;
  }

  return sessionCookie === computeToken(expected);
}

export async function authenticate(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get('password');

  if (typeof password !== 'string' || password.length === 0) {
    return { error: '请输入密码哦~' };
  }

  const expected = process.env.GIRLFRIEND_PASSWORD;
  if (!expected) {
    return { error: '服务器没有配置密码' };
  }

  const normalizedExpected = expected.toLowerCase();
  if (password.toLowerCase() !== normalizedExpected) {
    // Delay a little bit to slow down brute force attempts
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { error: '密码不对呀，再想想~' };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE,
    value: computeToken(expected),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  revalidatePath('/');
  redirect('/');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect('/');
}

export async function recoverPassword(
  _: RecoveryState,
  formData: FormData
): Promise<RecoveryState> {
  const configuredPassword = process.env.GIRLFRIEND_PASSWORD;
  if (!configuredPassword) {
    return { error: '服务器没有配置密码' };
  }

  const allCorrect = securityQuestions.every((question) => {
    const answer = formData.get(question.id);
    return typeof answer === 'string' && answer === question.correctOptionId;
  });

  if (!allCorrect) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { error: '有题答错啦，再想想~' };
  }

  return {
    success: true,
    password: configuredPassword,
  };
}


