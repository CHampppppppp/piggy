'use server';

import pool from './db';
import { revalidatePath } from 'next/cache';

import type { Mood, Period } from './types';
import { sendSuperMoodAlert } from './email';
import { addMemories, type MemoryRecord } from './vectorStore';
export type { Mood, Period } from './types';

// 标记 date_key 列是否已确保存在（避免重复检查）
let dateKeyColumnEnsured = false;

/**
 * 确保 moods 表存在 date_key 列
 * 
 * 这是一个数据库迁移辅助函数，用于向后兼容
 * 如果表还没有 date_key 列，则添加它
 * 
 * 使用标志位避免重复检查，提升性能
 */
async function ensureDateKeyColumn() {
  if (dateKeyColumnEnsured) return;
  try {
    // 检查列是否存在
    const { rows } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'moods' AND column_name = 'date_key' LIMIT 1"
    );
    if (!rows || rows.length === 0) {
      // 列不存在，添加它
      await pool.query('ALTER TABLE moods ADD COLUMN date_key VARCHAR(20)');
    }
  } catch (err) {
    console.warn('[actions] Failed to ensure date_key column exists', err);
  } finally {
    dateKeyColumnEnsured = true; // 无论成功失败，都标记为已检查
  }
}

/**
 * 保存心情记录
 * 
 * 这个函数处理心情记录的创建和更新，以及相关的副作用：
 * 1. 保存心情到数据库
 * 2. 如果是经期开始，记录经期
 * 3. 如果心情强度为3（超级），发送邮件提醒
 * 4. 将心情记录异步写入向量记忆库（用于 RAG）
 * 
 * @param formData - 表单数据，包含心情信息
 * 
 * 处理流程：
 * - 如果有 id，更新现有记录
 * - 如果没有 id，插入新记录
 * - 如果是经期开始，额外插入经期记录
 * - 如果强度为3，发送邮件提醒（异步，不阻塞）
 * - 将心情记录写入向量库（异步，不阻塞）
 */
export async function saveMood(formData: FormData) {
  const id = formData.get('id') as string;
  const mood = formData.get('mood') as string;
  const intensity = parseInt(formData.get('intensity') as string);
  const note = formData.get('note') as string;
  const isPeriodStart = formData.get('is_period_start') === 'on';
  const dateKey = (formData.get('date_key') as string) || null; // 前端生成的日期键，用于时区处理

  if (!mood) throw new Error('Mood is required');

  const now = new Date();
  const datetime = now.toISOString();
  await ensureDateKeyColumn(); // 确保 date_key 列存在

  if (id) {
    // 更新现有记录
    // 使用 COALESCE 确保如果 dateKey 为 null，保留原有值
    await pool.query(
      'UPDATE moods SET mood = ?, intensity = ?, note = ?, date_key = COALESCE(?, date_key) WHERE id = ?',
      [mood, intensity, note, dateKey, id]
    );
  } else {
    // 插入新记录
    await pool.query(
      'INSERT INTO moods (mood, intensity, note, date_key) VALUES (?, ?, ?, ?)',
      [mood, intensity, note, dateKey]
    );

    // 如果是经期开始，保存经期记录
    // 使用前端传入的 date_key 来构造日期，避免时区问题
    // 如果 date_key 不存在，则使用当前日期（作为后备方案）
    if (isPeriodStart) {
      let periodDate: Date;
      if (dateKey) {
        // 使用 date_key (格式: YYYY-MM-DD) 构造日期
        // 设置为当地时间的 00:00:00，避免时区转换问题
        const [year, month, day] = dateKey.split('-').map(Number);
        periodDate = new Date(year, month - 1, day);
      } else {
        // 后备方案：使用当前日期（服务器时区）
        periodDate = new Date();
        periodDate.setHours(0, 0, 0, 0);
      }
      
      await pool.query(
        'INSERT INTO periods (start_date) VALUES (?)',
        [periodDate]
      );
    }
  }

  // 如果心情强度为3（超级），发送邮件提醒
  // 异步执行，不阻塞主流程
  if (intensity === 3) {
    sendSuperMoodAlert({ mood, note, isUpdate: Boolean(id) }).catch((err) => {
      console.error('Failed to send mood alert email', err);
    });
  }

  /**
   * 将心情记录异步写入向量记忆库
   * 
   * 这样 AI 在聊天时可以回忆起之前的心情记录
   * 例如："你还记得我上周心情不好的时候吗"
   */
  try {
    const textParts = [
      `日期：${now.toLocaleString('zh-CN', { hour12: false })}`,
      `心情类型：${mood}`,
      `强烈程度：${intensity}`,
    ];
    if (note) {
      textParts.push(`备注：${note}`);
    }
    const memoryText = textParts.join('\n');

    const memory: MemoryRecord = {
      id: `mood-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: memoryText,
      metadata: {
        type: 'mood',
        author: 'piggy',
        datetime,
      },
    };

    // 异步执行，不阻塞主流程
    // 即使向量库写入失败，心情记录也已经保存到数据库了
    addMemories([memory]).catch((err) => {
      console.error('[saveMood] Failed to add memory to vector store', err);
    });
  } catch (err) {
    console.error('[saveMood] Unexpected error when preparing memory', err);
  }

  // 重新验证页面缓存，确保 UI 显示最新数据
  revalidatePath('/');
}

// 获取所有心情记录
// Get all mood records
export async function getMoods() {
  const { rows } = await pool.query('SELECT * FROM moods ORDER BY created_at DESC');
  return rows as Mood[];
}

// 获取所有经期记录
export async function getPeriods() {
  const { rows } = await pool.query('SELECT * FROM periods ORDER BY start_date DESC');
  return rows as Period[];
}

// AI 调用的心情记录函数
export async function logMoodFromAI({ mood, intensity, note }: { mood: string; intensity: number; note?: string }) {
  const now = new Date();
  const datetime = now.toISOString();
  const dateKey = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

  await ensureDateKeyColumn();

  await pool.query(
    'INSERT INTO moods (mood, intensity, note, date_key) VALUES (?, ?, ?, ?)',
    [mood, intensity, note || '', dateKey]
  );

  // Mood alert email
  if (intensity === 3) {
    sendSuperMoodAlert({ mood, note: note || '', isUpdate: false }).catch((err) => {
      console.error('Failed to send mood alert email', err);
    });
  }

  // Vector Store
  try {
    const textParts = [
      `日期：${now.toLocaleString('zh-CN', { hour12: false })}`,
      `心情类型：${mood}`,
      `强烈程度：${intensity}`,
    ];
    if (note) {
      textParts.push(`备注：${note}`);
    }
    const memoryText = textParts.join('\n');

    const memory: MemoryRecord = {
      id: `mood-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: memoryText,
      metadata: {
        type: 'mood',
        author: 'piggy',
        datetime,
      },
    };

    addMemories([memory]).catch((err) => {
      console.error('[logMoodFromAI] Failed to add memory to vector store', err);
    });
  } catch (err) {
    console.error('[logMoodFromAI] Unexpected error when preparing memory', err);
  }
  
  revalidatePath('/');
  return { success: true };
}

// AI 调用的经期记录函数
export async function trackPeriodFromAI({ startDate }: { startDate?: string }) {
  const date = startDate ? new Date(startDate) : new Date();
  await pool.query(
    'INSERT INTO periods (start_date) VALUES (?)',
    [date]
  );
  revalidatePath('/');
  return { success: true, date: date.toISOString() };
}
