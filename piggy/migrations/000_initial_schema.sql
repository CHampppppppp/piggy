-- Migration: 初始数据库结构 (MySQL 版本)
-- 创建核心表：moods, periods, account_locks, login_logs
-- 兼容 MySQL 5.7+
-- 
-- 注意：如需 PostgreSQL 版本，请使用 000_initial_schema.postgres.sql

-- ============================================
-- moods 表：心情记录
-- ============================================
CREATE TABLE IF NOT EXISTS moods (
  id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  mood varchar(50) NOT NULL COMMENT '心情类型',
  intensity tinyint NOT NULL COMMENT '强度（1-3）',
  note text COMMENT '备注',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  date_key varchar(20) COMMENT '日期键（YYYY-MM-DD，用于时区处理）',
  INDEX idx_moods_created_at (created_at)
);

-- ============================================
-- periods 表：经期记录
-- ============================================
CREATE TABLE IF NOT EXISTS periods (
  id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  start_date date NOT NULL COMMENT '经期开始日期',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_periods_start_date (start_date)
);

-- ============================================
-- account_locks 表：账号锁定记录
-- ============================================
CREATE TABLE IF NOT EXISTS account_locks (
  id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  locked_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '锁定时间',
  duration_minutes int NOT NULL COMMENT '锁定时长（分钟）',
  reason varchar(255) NOT NULL COMMENT '锁定原因',
  lock_type varchar(20) NOT NULL DEFAULT 'password' COMMENT '锁定类型：password / security',
  INDEX idx_account_locks_lock_type (lock_type, locked_at)
);

-- ============================================
-- login_logs 表：登录日志
-- ============================================
CREATE TABLE IF NOT EXISTS login_logs (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  logged_in_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  user_agent text COMMENT '浏览器信息',
  ip_address varchar(45) COMMENT 'IP 地址',
  INDEX idx_login_logs_logged_in_at (logged_in_at)
);

-- ============================================
-- period_alerts 表：经期预警记录
-- ============================================
CREATE TABLE IF NOT EXISTS period_alerts (
  id int AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  target_date date NOT NULL COMMENT '预警的目标经期日期',
  sent_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  INDEX idx_period_alerts_sent_at (sent_at)
);

-- 说明:
-- moods: 存储用户的心情记录，包括类型、强度、备注和时间
-- periods: 存储经期开始日期，用于预测未来经期
-- account_locks: 记录账号锁定信息（密码错误等），支持密码和密保两种锁定类型
-- login_logs: 记录成功登录的日志（隐式记录，不显示给用户）
-- period_alerts: 记录经期预警邮件的发送记录，用于防重发和冷却控制
-- 
-- 所有索引都在表定义中创建，避免使用 IF NOT EXISTS（MySQL 版本兼容性问题）
