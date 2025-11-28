import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendPeriodAlert } from '@/lib/email';
import { differenceInCalendarDays, addDays, parseISO, format } from 'date-fns';

export const dynamic = 'force-dynamic'; // 确保不被缓存

type PeriodRecord = {
  id: number;
  start_date: Date | string;
};

type AlertRecord = {
  sent_at: Date | string;
};

/**
 * 计算下一次经期开始时间
 * 
 * 算法：
 * 1. 如果没有记录，无法预测，返回 null
 * 2. 如果只有 1 条记录，假设周期为 28 天
 * 3. 如果有多条记录，计算最近 6 次记录的平均周期
 */
async function predictNextPeriod(): Promise<{ nextDate: Date; avgCycle: number } | null> {
  // 获取最近的经期记录（最多取最近 7 条来计算平均值）
  const { rows } = await pool.query<PeriodRecord>(
    `SELECT start_date FROM periods ORDER BY start_date DESC LIMIT 7`
  );

  if (rows.length === 0) {
    return null;
  }

  // 确保 start_date 是 Date 对象
  const dates = rows.map((r) => new Date(r.start_date));
  const lastPeriod = dates[0];

  // 只有一条记录，默认 28 天
  if (dates.length === 1) {
    return {
      nextDate: addDays(lastPeriod, 28),
      avgCycle: 28
    };
  }

  // 计算平均周期
  // 周期 = (最近一次 - 最早一次) / (记录数 - 1)
  // 例如：3次记录 A, B, C。周期 (A-B + B-C) / 2 = (A-C) / 2
  const firstInWindow = dates[dates.length - 1];
  const totalDays = differenceInCalendarDays(lastPeriod, firstInWindow);
  const cycleCount = dates.length - 1;
  
  const avgCycle = Math.round(totalDays / cycleCount);
  
  // 简单的异常处理：如果平均周期太离谱（<20 或 >45），回退到 28
  const safeAvgCycle = (avgCycle >= 20 && avgCycle <= 45) ? avgCycle : 28;

  return {
    nextDate: addDays(lastPeriod, safeAvgCycle),
    avgCycle: safeAvgCycle
  };
}

export async function GET(request: Request) {
  try {
    // 简单的鉴权：检查是否有 CRON_SECRET (如果在 Vercel 上配置了)
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. 检查最近是否发送过预警（冷却期检查）
    // 如果最近 20 天内发送过预警，则不再检查/发送
    const { rows: recentAlerts } = await pool.query<AlertRecord>(
      `SELECT sent_at FROM period_alerts ORDER BY sent_at DESC LIMIT 1`
    );

    if (recentAlerts.length > 0) {
      const lastSent = new Date(recentAlerts[0].sent_at);
      const daysSinceLastAlert = differenceInCalendarDays(new Date(), lastSent);

      if (daysSinceLastAlert < 20) {
        console.log(`[PeriodCron] Skipping check: Alert sent ${daysSinceLastAlert} days ago. Cooldown active.`);
        return NextResponse.json({
          success: true,
          message: 'Cooldown active (alert sent recently)',
          daysSinceLastAlert
        });
      }
    }

    const prediction = await predictNextPeriod();

    if (!prediction) {
      return NextResponse.json({ message: 'No period records found.' });
    }

    const { nextDate, avgCycle } = prediction;
    const today = new Date();
    
    // 计算距离下一次经期的天数
    const daysUntil = differenceInCalendarDays(nextDate, today);

    // 触发条件：正好剩下 2 天
    if (daysUntil === 2) {
      const formattedDate = format(nextDate, 'yyyy-MM-dd');
      console.log(`[PeriodCron] Sending alert. Next period: ${formattedDate}, Days until: ${daysUntil}`);
      
      await sendPeriodAlert(formattedDate, daysUntil);
      
      // 记录发送日志，激活冷却期
      await pool.query(
        `INSERT INTO period_alerts (target_date, sent_at) VALUES (?, ?)`,
        [formattedDate, new Date()]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Alert sent',
        data: { nextDate, daysUntil, avgCycle }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No alert needed today',
      data: { nextDate, daysUntil, avgCycle }
    });

  } catch (error: any) {
    console.error('[PeriodCron] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
