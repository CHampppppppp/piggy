-- Migration: 初始数据库结构 (PostgreSQL 版本)
-- 创建核心表：moods, periods, account_locks, login_logs
-- 兼容 PostgreSQL 12+

-- ============================================
-- moods 表：心情记录
-- ============================================
CREATE TABLE IF NOT EXISTS moods (
  id BIGSERIAL PRIMARY KEY,
  mood VARCHAR(50) NOT NULL,
  intensity SMALLINT NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_key VARCHAR(20)
);

COMMENT ON TABLE moods IS '心情记录表';
COMMENT ON COLUMN moods.id IS '主键';
COMMENT ON COLUMN moods.mood IS '心情类型';
COMMENT ON COLUMN moods.intensity IS '强度（1-3）';
COMMENT ON COLUMN moods.note IS '备注';
COMMENT ON COLUMN moods.created_at IS '创建时间';
COMMENT ON COLUMN moods.date_key IS '日期键（YYYY-MM-DD，用于时区处理）';

CREATE INDEX IF NOT EXISTS idx_moods_created_at ON moods (created_at);

-- ============================================
-- periods 表：经期记录
-- ============================================
CREATE TABLE IF NOT EXISTS periods (
  id BIGSERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE periods IS '经期记录表';
COMMENT ON COLUMN periods.id IS '主键';
COMMENT ON COLUMN periods.start_date IS '经期开始日期';
COMMENT ON COLUMN periods.created_at IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_periods_start_date ON periods (start_date);

-- ============================================
-- account_locks 表：账号锁定记录
-- ============================================
CREATE TABLE IF NOT EXISTS account_locks (
  id BIGSERIAL PRIMARY KEY,
  locked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL,
  lock_type VARCHAR(20) NOT NULL DEFAULT 'password'
);

COMMENT ON TABLE account_locks IS '账号锁定记录表';
COMMENT ON COLUMN account_locks.id IS '主键';
COMMENT ON COLUMN account_locks.locked_at IS '锁定时间';
COMMENT ON COLUMN account_locks.duration_minutes IS '锁定时长（分钟）';
COMMENT ON COLUMN account_locks.reason IS '锁定原因';
COMMENT ON COLUMN account_locks.lock_type IS '锁定类型：password / security';

CREATE INDEX IF NOT EXISTS idx_account_locks_lock_type ON account_locks (lock_type, locked_at DESC);

-- ============================================
-- login_logs 表：登录日志
-- ============================================
CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  logged_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address VARCHAR(45)
);

COMMENT ON TABLE login_logs IS '登录日志表';
COMMENT ON COLUMN login_logs.id IS '主键';
COMMENT ON COLUMN login_logs.logged_in_at IS '登录时间';
COMMENT ON COLUMN login_logs.user_agent IS '浏览器信息';
COMMENT ON COLUMN login_logs.ip_address IS 'IP 地址';

CREATE INDEX IF NOT EXISTS idx_login_logs_logged_in_at ON login_logs (logged_in_at DESC);

-- ============================================
-- period_alerts 表：经期预警记录
-- ============================================
CREATE TABLE IF NOT EXISTS period_alerts (
  id SERIAL PRIMARY KEY,
  target_date DATE NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE period_alerts IS '经期预警发送记录';
COMMENT ON COLUMN period_alerts.target_date IS '预警的目标经期日期';
COMMENT ON COLUMN period_alerts.sent_at IS '发送时间';

CREATE INDEX IF NOT EXISTS idx_period_alerts_sent_at ON period_alerts (sent_at);

-- 说明:
-- moods: 存储用户的心情记录，包括类型、强度、备注和时间
-- periods: 存储经期开始日期，用于预测未来经期
-- account_locks: 记录账号锁定信息（密码错误等），支持密码和密保两种锁定类型
-- login_logs: 记录成功登录的日志（隐式记录，不显示给用户）
-- period_alerts: 记录经期预警邮件的发送记录，用于防重发和冷却控制
-- 
-- PostgreSQL 语法说明:
-- - BIGSERIAL/SERIAL: 自动递增的整数类型（相当于 MySQL 的 AUTO_INCREMENT）
-- - SMALLINT: 小整数（相当于 MySQL 的 TINYINT）
-- - TIMESTAMP: 时间戳类型（MySQL 的 datetime 和 timestamp 在 PostgreSQL 中都用 TIMESTAMP）
-- - COMMENT ON: PostgreSQL 使用单独的语句添加注释
-- - CREATE INDEX IF NOT EXISTS: PostgreSQL 支持此语法（9.5+）
