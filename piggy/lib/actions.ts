'use server';

import pool from './db';
import { revalidatePath } from 'next/cache';

import type { Mood, Period } from './types';
import { sendSuperMoodAlert } from './email';
import { addMemories, type MemoryRecord } from './vectorStore';
export type { Mood, Period } from './types';

let dateKeyColumnEnsured = false;

async function ensureDateKeyColumn() {
  if (dateKeyColumnEnsured) return;
  try {
    const { rows } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'moods' AND column_name = 'date_key' LIMIT 1"
    );
    if (!rows || rows.length === 0) {
      await pool.query('ALTER TABLE moods ADD COLUMN date_key VARCHAR(20)');
    }
  } catch (err) {
    console.warn('[actions] Failed to ensure date_key column exists', err);
  } finally {
    dateKeyColumnEnsured = true;
  }
}

// 保存心情记录
// Save mood record
export async function saveMood(formData: FormData) {
  const id = formData.get('id') as string;
  const mood = formData.get('mood') as string;
  const intensity = parseInt(formData.get('intensity') as string);
  const note = formData.get('note') as string;
  const isPeriodStart = formData.get('is_period_start') === 'on';
  const dateKey = (formData.get('date_key') as string) || null;

  if (!mood) throw new Error('Mood is required');

  const now = new Date();
  const datetime = now.toISOString();
  await ensureDateKeyColumn();

  if (id) {
    // 更新现有记录
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
    if (isPeriodStart) {
      await pool.query(
        'INSERT INTO periods (start_date) VALUES (?)',
        [new Date()]
      );
    }
  }

  if (intensity === 3) {
    sendSuperMoodAlert({ mood, note, isUpdate: Boolean(id) }).catch((err) => {
      console.error('Failed to send mood alert email', err);
    });
  }

  // 将心情记录异步写入向量记忆库
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

    // 不阻塞主流程
    addMemories([memory]).catch((err) => {
      console.error('[saveMood] Failed to add memory to vector store', err);
    });
  } catch (err) {
    console.error('[saveMood] Unexpected error when preparing memory', err);
  }

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

