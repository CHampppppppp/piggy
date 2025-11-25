'use server';

import pool from './db';
import { revalidatePath } from 'next/cache';

export type Mood = {
  id: number;
  mood: string;
  intensity: number;
  note: string;
  created_at: Date;
};

export type Period = {
  id: number;
  start_date: Date;
  created_at: Date;
};

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
    // 更新现有记录
    await pool.query(
      'UPDATE moods SET mood = $1, intensity = $2, note = $3 WHERE id = $4',
      [mood, intensity, note, id]
    );
  } else {
    // 插入新记录
    await pool.query(
      'INSERT INTO moods (mood, intensity, note) VALUES ($1, $2, $3)',
      [mood, intensity, note]
    );

    // 如果是经期开始，保存经期记录
    if (isPeriodStart) {
      await pool.query(
        'INSERT INTO periods (start_date) VALUES ($1)',
        [new Date()]
      );
    }
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

