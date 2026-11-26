export const NAMES = Object.freeze(['马冬阳', '王琦']);
export const MOODS = Object.freeze(['☀️', '🌿', '🌷', '🌧️', '✨']);
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export function loginAddress(name) {
  if (name === '马冬阳') return 'madongyang@little-home.example';
  if (name === '王琦') return 'wangqi@little-home.example';
  throw new Error('这个小家只向马冬阳和王琦开放。');
}

export function validateCredentials(name, password, register = false) {
  if (register && name !== '王琦') throw new Error('只有王琦可以注册。马冬阳请使用房主账号登录。');
  loginAddress(name);
  if (password.length < 8) throw new Error('密码至少需要 8 位。');
  if (password.length > 72) throw new Error('密码不能超过 72 位。');
}

export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function validateDiary(input) {
  const content = input.content.trim();
  if (!content) throw new Error('写一点今天的心情再保存吧。');
  if (content.length > 10000) throw new Error('一篇日记最多可以写 10000 字。');
  const parsedDate = new Date(input.entry_date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entry_date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.entry_date) throw new Error('请选择有效的日期。');
  if (!MOODS.includes(input.mood)) throw new Error('请选择一种心情。');
  return { content, entry_date: input.entry_date, mood: input.mood };
}

export function humanError(error) {
  const message = error?.message || '暂时没有成功，请再试一次。';
  if (/Invalid login credentials/i.test(message)) return '姓名或密码不正确，请检查后再试。';
  if (/already registered|already been registered/i.test(message)) return '王琦已经注册，请切换到登录。';
  if (/Email not confirmed/i.test(message)) return '账号尚未激活，请房主检查后台的邮箱确认设置。';
  if (/rate limit|too many requests/i.test(message)) return '操作有点频繁，请稍后再试。';
  if (/fetch|network|Failed to load/i.test(message)) return '网络连接暂时不可用，请检查网络后重试。';
  if (/row-level security|permission denied|not allowed|not invited/i.test(message)) return '这个账号没有进入小家的权限。';
  if (/Database error saving new user/i.test(message)) return '注册未成功，请房主检查后台的姓名限制和建库脚本。';
  return message;
}
