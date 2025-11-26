'use server';

import pool from './db';
import { revalidatePath } from 'next/cache';
import { differenceInCalendarDays } from 'date-fns';

import type { Mood, Period } from './types';
import { sendSuperMoodAlert } from './email';
export type { Mood, Period } from './types';

// 保存心情记录
// Save mood record
export async function saveMood(formData: FormData) {
  const id = formData.get('id') as string;
  const mood = formData.get('mood') as string;
  const intensity = parseInt(formData.get('intensity') as string);
  const note = formData.get('note') as string;
  const isPeriodStart = formData.get('is_period_start') === 'on';

  if (!mood) throw new Error('Mood is required');

  if (id) {
    // 只允许修改最近三天内的记录（包括当天）
    const { rows } = await pool.query(
      'SELECT created_at FROM moods WHERE id = ?',
      [id]
    );

    if (!rows[0]) {
      throw new Error('Mood not found');
    }

    const createdAt = new Date(rows[0].created_at);
    const daysDiff = differenceInCalendarDays(new Date(), createdAt);

    if (daysDiff > 2) {
      throw new Error('只能修改最近三天内的记录哦');
    }

    // 更新现有记录
    await pool.query(
      'UPDATE moods SET mood = ?, intensity = ?, note = ? WHERE id = ?',
      [mood, intensity, note, id]
    );
  } else {
    // 插入新记录
    await pool.query(
      'INSERT INTO moods (mood, intensity, note) VALUES (?, ?, ?)',
      [mood, intensity, note]
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

