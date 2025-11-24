'use server';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { securityQuestions } from '@/lib/securityQuestions';

const AUTH_COOKIE = 'piggy-auth';
const ATTEMPT_COOKIE = 'piggy-auth-attempts';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MAX_ATTEMPTS_BEFORE_LOCK = 6;
const BASE_LOCK_MINUTES = 15;
const LOCK_ESCALATION_MINUTES = 30;

const FAILURE_MESSAGES = [
  '密码打错啦，手抖了嘛宝宝？',
  '是不是最近事情多，忘了密码呀？',
  '好叭没爱了。。。',
  '还是直接来问我吧hh',
  '还真是倔强傲娇小公主。',
  '再输错网站将自我毁灭。'
] as const;

type AttemptState = {
  count: number;
  messageIndex: number;
  lockEscalation: number;
  lockedUntil?: number;
  securityAttempted?: boolean;
};

const INITIAL_ATTEMPT_STATE: AttemptState = {
  count: 0,
  messageIndex: 0,
  lockEscalation: 0,
};

function clampMessageIndex(index: number) {
  return Math.min(Math.max(index, 0), FAILURE_MESSAGES.length - 1);
}

function readAttemptState(rawValue?: string): AttemptState {
  if (!rawValue) {
    return { ...INITIAL_ATTEMPT_STATE };
  }

  try {
    const parsed = JSON.parse(rawValue);
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      messageIndex: clampMessageIndex(
        typeof parsed.messageIndex === 'number' ? parsed.messageIndex : 0
      ),
      lockEscalation:
        typeof parsed.lockEscalation === 'number' ? parsed.lockEscalation : 0,
      lockedUntil:
        typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : undefined,
      securityAttempted: Boolean(parsed.securityAttempted),
    };
  } catch {
    const legacyIndex = Number.parseInt(rawValue, 10) || 0;
    return {
      ...INITIAL_ATTEMPT_STATE,
      messageIndex: clampMessageIndex(legacyIndex),
    };
  }
}

function serializeAttemptState(state: AttemptState) {
  return JSON.stringify(state);
}

function lockDurationMinutes(escalation: number) {
  return BASE_LOCK_MINUTES + escalation * LOCK_ESCALATION_MINUTES;
}

function formatLockRemainingMessage(lockedUntil: number) {
  const remainingMs = lockedUntil - Date.now();
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `当前账号被保护啦，${remainingMinutes}分钟后再试试~`;
}

function applyLock(state: AttemptState) {
  const minutes = lockDurationMinutes(state.lockEscalation);
  state.lockEscalation += 1;
  state.lockedUntil = Date.now() + minutes * 60 * 1000;
  state.count = 0;
  state.messageIndex = FAILURE_MESSAGES.length - 1;
  return minutes;
}

export type AuthState = {
  error?: string;
  locked?: boolean;
  lockedUntil?: number;
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

  const cookieStore = await cookies();
  const attemptState = readAttemptState(cookieStore.get(ATTEMPT_COOKIE)?.value);
  const lockActive =
    typeof attemptState.lockedUntil === 'number' &&
    attemptState.lockedUntil > Date.now();

  if (lockActive) {
    return {
      error: formatLockRemainingMessage(attemptState.lockedUntil),
      locked: true,
      lockedUntil: attemptState.lockedUntil,
    };
  }

  if (attemptState.lockedUntil) {
    // Lock expired, clear timestamp but keep historical escalation.
    delete attemptState.lockedUntil;
    cookieStore.set({
      name: ATTEMPT_COOKIE,
      value: serializeAttemptState(attemptState),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  if (typeof password !== 'string' || password.length === 0) {
    return { error: '是不是漏掉什么没填了呀宝宝？' };
  }

  const expected = process.env.GIRLFRIEND_PASSWORD;
  if (!expected) {
    return { error: '服务器没有配置密码' };
  }

  const normalizedExpected = expected.toLowerCase();
  if (password.toLowerCase() !== normalizedExpected) {
    // Delay a little bit to slow down brute force attempts
    await new Promise((resolve) => setTimeout(resolve, 500));

    attemptState.count += 1;
    const message = FAILURE_MESSAGES[attemptState.messageIndex];
    attemptState.messageIndex = clampMessageIndex(
      attemptState.messageIndex + 1
    );

    if (attemptState.count > MAX_ATTEMPTS_BEFORE_LOCK) {
      const minutes = applyLock(attemptState);
      cookieStore.set({
        name: ATTEMPT_COOKIE,
        value: serializeAttemptState(attemptState),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });

      return {
        error: `输错太多啦，被锁${minutes}分钟，休息一下再来~`,
        locked: true,
        lockedUntil: attemptState.lockedUntil,
      };
    }

    cookieStore.set({
      name: ATTEMPT_COOKIE,
      value: serializeAttemptState(attemptState),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    });

    return { error: message };
  }

  cookieStore.delete(ATTEMPT_COOKIE);
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
  const cookieStore = await cookies();
  const attemptState = readAttemptState(cookieStore.get(ATTEMPT_COOKIE)?.value);
  const lockActive =
    typeof attemptState.lockedUntil === 'number' &&
    attemptState.lockedUntil > Date.now();

  if (lockActive) {
    return { error: formatLockRemainingMessage(attemptState.lockedUntil) };
  }

  if (attemptState.lockedUntil) {
    delete attemptState.lockedUntil;
    cookieStore.set({
      name: ATTEMPT_COOKIE,
      value: serializeAttemptState(attemptState),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  if (attemptState.securityAttempted) {
    return { error: '密保机会已经用过啦，等解锁后再来~' };
  }

  attemptState.securityAttempted = true;

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

    applyLock(attemptState);
    cookieStore.set({
      name: ATTEMPT_COOKIE,
      value: serializeAttemptState(attemptState),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return { error: '密保回答错啦，账号已经进入保护，稍后再试~' };
  }

  cookieStore.set({
    name: ATTEMPT_COOKIE,
    value: serializeAttemptState(attemptState),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return {
    success: true,
    password: configuredPassword,
  };
}


