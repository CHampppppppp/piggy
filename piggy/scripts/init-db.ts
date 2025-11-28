#!/usr/bin/env tsx
/**
 * 数据库初始化脚本
 * 自动执行 migrations 来创建数据库表
 * 
 * 使用方法:
 *   npm run init-db
 *   或
 *   npx tsx scripts/init-db.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { Pool as NeonPool } from '@neondatabase/serverless';
import mysql from 'mysql2/promise';

// 加载环境变量（优先加载 .env.local，然后是 .env）
config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

// 确定使用哪个数据库
const DB_CLIENT =
  process.env.DB_CLIENT ||
  (process.env.NODE_ENV === 'development' ? 'mysql' : 'postgres');//本地开发mysql，线上部署用postgres

async function initMySQL() {
  const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
  const MYSQL_USER = process.env.MYSQL_USER || 'root';
  const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
  const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'piggy_diary';

  if (!MYSQL_PASSWORD) {
    throw new Error('MYSQL_PASSWORD environment variable is required for MySQL connection');
  }

  if (!MYSQL_DATABASE) {
    throw new Error('MySQL database name is not configured');
  }

  console.log(`[MySQL] Connecting to ${MYSQL_HOST}/${MYSQL_DATABASE}...`);

  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    multipleStatements: true, // 允许执行多条 SQL 语句
  });

  try {
    const sqlPath = join(process.cwd(), 'migrations', '000_initial_schema.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('[MySQL] Executing migrations...');
    await connection.query(sql);
    
    console.log('[MySQL] ✅ Database initialized successfully!');
    console.log('[MySQL] Created tables: moods, periods, account_locks, login_logs');
  } catch (error: any) {
    console.error('[MySQL] ❌ Failed to initialize database:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function initPostgreSQL() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('[PostgreSQL] Connecting to database...');

  const pool = new NeonPool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const sqlPath = join(process.cwd(), 'migrations', '000_initial_schema.postgres.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('[PostgreSQL] Executing migrations...');
    await pool.query(sql);
    
    console.log('[PostgreSQL] ✅ Database initialized successfully!');
    console.log('[PostgreSQL] Created tables: moods, periods, account_locks, login_logs');
  } catch (error: any) {
    console.error('[PostgreSQL] ❌ Failed to initialize database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log(`\n🚀 Initializing database (${DB_CLIENT})...\n`);

  try {
    if (DB_CLIENT === 'mysql') {
      await initMySQL();
    } else {
      await initPostgreSQL();
    }
    console.log('\n✨ Done! You can now start the application.\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database server is running');
    console.error('2. Environment variables are correctly set');
    console.error('3. Database exists (for MySQL, create it first: CREATE DATABASE piggy_diary;)');
    console.error('\n');
    process.exit(1);
  }
}

main();

