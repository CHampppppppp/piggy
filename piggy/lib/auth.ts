'use server';

import pool from '@/lib/db';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { securityQuestions } from '@/lib/securityQuestions';

const AUTH_COOKIE = 'piggy-auth';
const ATTEMPT_COOKIE = 'piggy-auth-attempts';
const SECURITY_ATTEMPT_COOKIE = 'piggy-security-attempts';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MAX_ATTEMPTS_BEFORE_LOCK = 6;
const MAX_SECURITY_ATTEMPTS_BEFORE_LOCK = 1; // 密保只允许1次错误
const BASE_LOCK_MINUTES = 15;
const LOCK_ESCALATION_MINUTES = 30;

// 锁定类型
type LockType = 'password' | 'security';

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

// 密保尝试状态（独立于密码尝试）
type SecurityAttemptState = {
  count: number;
  lockEscalation: number;
  lockedUntil?: number;
};

const INITIAL_ATTEMPT_STATE: AttemptState = {
  count: 0,
  messageIndex: 0,
  lockEscalation: 0,
};

const INITIAL_SECURITY_ATTEMPT_STATE: SecurityAttemptState = {
  count: 0,
  lockEscalation: 0,
};

// 设置锁定，支持指定锁定类型
async function setAccountLock(minutes: number, reason: string, lockType: LockType = 'password') {
  try {
    await pool.query(
      `INSERT INTO account_locks (locked_at, duration_minutes, reason, lock_type)
       VALUES (NOW(), $1, $2, $3)`,
      [minutes, reason, lockType]
    );
  } catch (error) {
    console.error('Failed to record account lock:', error);
  }
}

// 清除密码锁定（通过插入 duration: 0 的记录）
async function clearPasswordLock() {
  try {
    await pool.query(
      `INSERT INTO account_locks (locked_at, duration_minutes, reason, lock_type)
       VALUES (NOW(), 0, 'Unlocked via security questions', 'password')`
    );
  } catch (error) {
    console.error('Failed to clear password lock:', error);
  }
}

// 获取所有类型锁定的累计次数（用于计算累加锁定时长）
// 两种锁定类型的错误次数会累加影响锁定时长
async function getTotalLockEscalation(): Promise<number> {
  try {
    // 统计所有 duration > 0 的锁定记录数量（不论类型）
    const { rows } = await pool.query(
      `SELECT COUNT(*) as total FROM account_locks WHERE duration_minutes > 0`
    );
    return parseInt(rows[0]?.total || '0', 10);
  } catch (error) {
    console.error('Failed to get total lock escalation:', error);
    return 0;
  }
}

// 登录成功后清除所有错误记录（重置锁定累加）
async function clearAllLockRecords() {
  try {
    await pool.query(`DELETE FROM account_locks`);
  } catch (error) {
    console.error('Failed to clear lock records:', error);
  }
}

// 获取指定类型的锁定状态
export async function getAccountLockStatus(lockType: LockType = 'password') {
  try {
    const { rows } = await pool.query(
      `SELECT locked_at, duration_minutes FROM account_locks 
       WHERE lock_type = $1
       ORDER BY locked_at DESC LIMIT 1`,
      [lockType]
    );

    if (rows.length === 0) {
      return { isLocked: false };
    }

    const lock = rows[0];
    const lockedUntil = new Date(lock.locked_at).getTime() + lock.duration_minutes * 60 * 1000;
    const now = Date.now();
    
    if (now < lockedUntil) {
      return {
        isLocked: true,
        lockedUntil,
        lockedAt: new Date(lock.locked_at).getTime(),
        duration: lock.duration_minutes
      };
    }
  } catch (error) {
    console.error('Failed to check lock status:', error);
  }
  
  return { isLocked: false };
}

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

// 应用密码锁定（使用数据库累计的escalation值来计算锁定时长）
async function applyLock(state: AttemptState) {
  // 从数据库获取累计锁定次数（密码+密保的总次数）
  const totalEscalation = await getTotalLockEscalation();
  const minutes = lockDurationMinutes(totalEscalation);
  state.lockEscalation = totalEscalation + 1; // 保存新的escalation值
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
  
  // Check DB lock first (only password lock)
  const dbLock = await getAccountLockStatus('password');
  if (dbLock.isLocked && dbLock.lockedUntil) {
    return {
      error: formatLockRemainingMessage(dbLock.lockedUntil),
      locked: true,
      lockedUntil: dbLock.lockedUntil,
    };
  }

  const lockActive =
    typeof attemptState.lockedUntil === 'number' &&
    attemptState.lockedUntil > Date.now();

  if (lockActive) {
    return {
      error: formatLockRemainingMessage(attemptState.lockedUntil!),
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
      const minutes = await applyLock(attemptState);
      await setAccountLock(minutes, 'Password retry limit exceeded', 'password');

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

  // 登录成功！清除所有cookie和数据库中的错误记录
  cookieStore.delete(ATTEMPT_COOKIE);
  cookieStore.delete(SECURITY_ATTEMPT_COOKIE);
  
  // 清除数据库中的所有锁定记录（重置错误时长累加）
  await clearAllLockRecords();
  
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

// 读取密保尝试状态
function readSecurityAttemptState(rawValue?: string): SecurityAttemptState {
  if (!rawValue) {
    return { ...INITIAL_SECURITY_ATTEMPT_STATE };
  }

  try {
    const parsed = JSON.parse(rawValue);
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      lockEscalation:
        typeof parsed.lockEscalation === 'number' ? parsed.lockEscalation : 0,
      lockedUntil:
        typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : undefined,
    };
  } catch {
    return { ...INITIAL_SECURITY_ATTEMPT_STATE };
  }
}

function serializeSecurityAttemptState(state: SecurityAttemptState) {
  return JSON.stringify(state);
}

// 应用密保锁定（使用数据库累计的escalation值来计算锁定时长）
async function applySecurityLock(state: SecurityAttemptState) {
  // 从数据库获取累计锁定次数（密码+密保的总次数）
  const totalEscalation = await getTotalLockEscalation();
  const minutes = lockDurationMinutes(totalEscalation);
  state.lockEscalation = totalEscalation + 1; // 保存新的escalation值
  state.lockedUntil = Date.now() + minutes * 60 * 1000;
  state.count = 0;
  return minutes;
}

export async function recoverPassword(
  _: RecoveryState,
  formData: FormData
): Promise<RecoveryState> {
  const cookieStore = await cookies();
  
  // 读取密保独立的尝试状态
  const securityAttemptState = readSecurityAttemptState(
    cookieStore.get(SECURITY_ATTEMPT_COOKIE)?.value
  );
  
  // 检查密保是否被锁定（独立于密码锁定）
  const securityDbLock = await getAccountLockStatus('security');
  if (securityDbLock.isLocked && securityDbLock.lockedUntil) {
    return { 
      error: `密保功能被锁定了，${Math.ceil((securityDbLock.lockedUntil - Date.now()) / 60000)}分钟后再试~` 
    };
  }
  
  // 检查 cookie 中的密保锁定
  const securityLockActive =
    typeof securityAttemptState.lockedUntil === 'number' &&
    securityAttemptState.lockedUntil > Date.now();

  if (securityLockActive) {
    return { 
      error: `密保功能被锁定了，${Math.ceil((securityAttemptState.lockedUntil! - Date.now()) / 60000)}分钟后再试~` 
    };
  }

  // 如果锁定已过期，清除时间戳
  if (securityAttemptState.lockedUntil) {
    delete securityAttemptState.lockedUntil;
  }

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

    securityAttemptState.count += 1;

    // 密保错误次数超限，锁定密保功能（1次错误即锁定）
    if (securityAttemptState.count >= MAX_SECURITY_ATTEMPTS_BEFORE_LOCK) {
      const minutes = await applySecurityLock(securityAttemptState);
      await setAccountLock(minutes, 'Security question failed', 'security');
      
      cookieStore.set({
        name: SECURITY_ATTEMPT_COOKIE,
        value: serializeSecurityAttemptState(securityAttemptState),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });

      return { error: `密保答错太多次了，密保功能被锁${minutes}分钟~` };
    }
    
    cookieStore.set({
      name: SECURITY_ATTEMPT_COOKIE,
      value: serializeSecurityAttemptState(securityAttemptState),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    const remaining = MAX_SECURITY_ATTEMPTS_BEFORE_LOCK - securityAttemptState.count;
    return { error: `密保回答错啦，还有${remaining}次机会~` };
  }

  // 密保验证成功！
  // 1. 清除密码锁定（通过插入 duration: 0 的记录）
  await clearPasswordLock();

  // 2. 重置密码尝试状态
  const newPasswordState = { ...INITIAL_ATTEMPT_STATE };
  cookieStore.set({
    name: ATTEMPT_COOKIE,
    value: serializeAttemptState(newPasswordState),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  // 3. 重置密保尝试状态
  const newSecurityState = { ...INITIAL_SECURITY_ATTEMPT_STATE };
  cookieStore.set({
    name: SECURITY_ATTEMPT_COOKIE,
    value: serializeSecurityAttemptState(newSecurityState),
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


