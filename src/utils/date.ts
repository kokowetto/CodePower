/**
 * 全系统统一东八区（UTC+8 / Asia/Shanghai）时间处理工具
 */

export function parseUtcDate(dateStr: string | Date | undefined | null): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  let s = String(dateStr).trim();
  if (!s) return new Date();

  // SQLite CURRENT_TIMESTAMP 格式为 'YYYY-MM-DD HH:mm:ss'（以UTC存储，缺Z标识）
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('T')) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (!s.endsWith('Z') && !s.includes('+') && s.includes('T')) {
    s = s + 'Z';
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(dateStr) : d;
}

/**
 * 格式化为东八区标准时间格式：YYYY-MM-DD HH:mm:ss
 */
export function formatEast8DateTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const d = parseUtcDate(dateStr);

  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 基于东八区计算所属月份的最后一天：YYYY-MM-DD
 */
export function getEast8MonthEnd(dateStr: string | Date | undefined | null): string {
  const d = parseUtcDate(dateStr);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric'
  });

  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);

  const lastDay = new Date(year, month, 0);
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day = String(lastDay.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
}
