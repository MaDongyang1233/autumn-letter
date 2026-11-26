import { NAMES, loginAddress } from './domain.js';

const DEMO_KEY = 'little-home-demo-user';

// IndexedDB transactions keep simultaneous demo tabs from overwriting one another.
export class DemoStore {
  mode = 'demo';
  user = null;
  listeners = new Set();
  constructor() {
    this.ready = new Promise((resolve, reject) => {
      const request = indexedDB.open('little-home-demo-v2', 1);
      request.onupgradeneeded = () => {
        for (const table of ['diaries', 'photos']) request.result.createObjectStore(table, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('浏览器未允许本地保存，请退出无痕模式或允许网站存储。'));
    });
    this.ready.catch(() => {});
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('little-home-demo') : null;
    if (this.channel) this.channel.onmessage = () => this.notify();
  }
  async restore() {
    await this.ready;
    const name = sessionStorage.getItem(DEMO_KEY);
    if (NAMES.includes(name)) this.user = this.makeUser(name);
    return this.user;
  }
  makeUser(name) { return { id: name === '王琦' ? 'demo-partner' : 'demo-owner', display_name: name }; }
  async enterDemo(name) {
    await this.ready;
    if (!NAMES.includes(name)) throw new Error('请选择体验身份。');
    this.user = this.makeUser(name);
    sessionStorage.setItem(DEMO_KEY, name);
    return this.user;
  }
  async signIn() { throw new Error('正式登录需要先连接云端。可以先选择下方的体验身份。'); }
  async signUp() { throw new Error('正式注册需要先连接云端。连接后只有王琦可以注册。'); }
  async signOut() { this.user = null; sessionStorage.removeItem(DEMO_KEY); }
  requireUser() { if (!this.user) throw new Error('请先进入小家。'); }
  async query(table, operation, value) {
    const db = await this.ready;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(table, operation === 'getAll' ? 'readonly' : 'readwrite');
      const request = transaction.objectStore(table)[operation](value);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error || new Error('本地保存失败，可能是浏览器空间不足。'));
      transaction.onerror = () => {};
    });
  }
  async listDiaries() { this.requireUser(); return (await this.query('diaries', 'getAll')).sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at)); }
  async saveDiary(input, id) {
    this.requireUser();
    const existing = id ? (await this.query('diaries', 'getAll')).find(item => item.id === id) : null;
    if (id && (!existing || existing.author_id !== this.user.id)) throw new Error('只能修改自己的日记。');
    const item = { ...(existing || {}), ...input, id: id || crypto.randomUUID(), author_id: this.user.id, author_name: this.user.display_name, created_at: existing?.created_at || new Date().toISOString() };
    await this.query('diaries', 'put', item);
    this.changed();
  }
  async deleteDiary(id) {
    this.requireUser();
    const item = (await this.query('diaries', 'getAll')).find(item => item.id === id);
    if (!item || item.author_id !== this.user.id) throw new Error('只能删除自己的日记。');
    await this.query('diaries', 'delete', id); this.changed();
  }
  async listPhotos() {
    this.requireUser();
    return (await this.query('photos', 'getAll')).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async uploadPhoto(blob, name, caption) {
    this.requireUser();
    await this.query('photos', 'put', { id: crypto.randomUUID(), author_id: this.user.id, author_name: this.user.display_name, blob, name, caption, created_at: new Date().toISOString() });
    this.changed();
  }
  async deletePhoto(id) {
    this.requireUser();
    const item = (await this.query('photos', 'getAll')).find(item => item.id === id);
    if (!item || item.author_id !== this.user.id) throw new Error('只能删除自己上传的照片。');
    await this.query('photos', 'delete', id); this.changed();
  }
  subscribe(callback) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  notify() { this.listeners.forEach(listener => listener()); }
  changed() { this.notify(); this.channel?.postMessage('changed'); }
}

export class CloudStore {
  mode = 'cloud';
  user = null;
  constructor(client) { this.client = client; }
  async profile(session) {
    if (!session) { this.user = null; return null; }
    const { data, error } = await this.client.from('members').select('id,display_name').eq('id', session.user.id).single();
    if (error || !data) { await this.client.auth.signOut({ scope: 'local' }); throw new Error('此账号不属于这个小家，请联系房主。'); }
    this.user = data;
    return data;
  }
  async restore() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return this.profile(data.session);
  }
  async signIn(name, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email: loginAddress(name), password });
    if (error) throw error;
    return this.profile(data.session);
  }
  async signUp(name, password) {
    const { data, error } = await this.client.auth.signUp({ email: loginAddress(name), password, options: { data: { display_name: name } } });
    if (error) throw error;
    if (!data.session) throw new Error('请房主在 Supabase 中关闭邮箱确认，激活账号后再登录。');
    return this.profile(data.session);
  }
  async signOut() {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    this.user = null;
  }
  async listDiaries() {
    const { data, error } = await this.client.from('diary_entries').select('*,members(display_name)').order('entry_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({ ...item, author_name: item.members?.display_name || '小家成员' }));
  }
  async saveDiary(input, id) {
    const request = id ? this.client.from('diary_entries').update(input).eq('id', id) : this.client.from('diary_entries').insert({ ...input, author_id: this.user.id });
    const { data, error } = await request.select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('没有保存成功，你只能修改自己的日记。');
  }
  async deleteDiary(id) {
    const { data, error } = await this.client.from('diary_entries').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('日记已被移除，或你没有删除权限。');
  }
  async listPhotos() {
    const { data, error } = await this.client.from('photos').select('*,members(display_name)').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data.length) return [];
    const { data: signed, error: signingError } = await this.client.storage.from('home-photos').createSignedUrls(data.map(item => item.object_path), 3600);
    if (signingError) throw signingError;
    return data.map((item, index) => ({ ...item, url: signed[index]?.signedUrl || '', author_name: item.members?.display_name || '小家成员' }));
  }
  async uploadPhoto(blob, name, caption) {
    const id = crypto.randomUUID();
    const path = `${this.user.id}/${id}.jpg`;
    const { error } = await this.client.storage.from('home-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    const { error: insertError } = await this.client.from('photos').insert({ id, author_id: this.user.id, object_path: path, name, caption, size_bytes: blob.size });
    if (insertError) {
      await this.client.storage.from('home-photos').remove([path]);
      throw insertError;
    }
  }
  async deletePhoto(id) {
    const { data, error } = await this.client.from('photos').delete().eq('id', id).select('object_path');
    if (error) throw error;
    if (!data?.length) throw new Error('照片已被移除，或你没有删除权限。');
    const { error: storageError } = await this.client.storage.from('home-photos').remove([data[0].object_path]);
    if (storageError) return '照片记录已删除；云端文件暂未清理，可由房主在 Storage 中清理。';
  }
  subscribe(callback) {
    const channel = this.client.channel('little-home-records-' + crypto.randomUUID())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary_entries' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, callback)
      .subscribe();
    return () => { this.client.removeChannel(channel); };
  }
}

export async function createStore(config) {
  const url = config?.supabaseUrl?.trim();
  const key = config?.supabaseKey?.trim();
  if (!url && !key) return new DemoStore();
  if (!url || !key || !url.startsWith('https://')) throw new Error('云端配置不完整，请检查 config.js 中的项目地址和公钥。');
  let legacyRole = '';
  try { legacyRole = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch {}
  if (key.startsWith('sb_secret_') || legacyRole === 'service_role') throw new Error('config.js 只能使用 publishable / anon 公钥，不能使用服务端管理密钥。');
  const { createClient } = await import('./vendor/supabase.js');
  // Auth-js broadcasts sign-in/out events using storageKey even with sessionStorage.
  // Each document needs a private channel while its stored session survives reloads.
  const channelKey = 'little-home-auth-' + crypto.randomUUID();
  const persistentKey = key => key.replace(channelKey, 'little-home-cloud-auth');
  const tabStorage = {
    getItem: key => sessionStorage.getItem(persistentKey(key)),
    setItem: (key, value) => sessionStorage.setItem(persistentKey(key), value),
    removeItem: key => sessionStorage.removeItem(persistentKey(key))
  };
  return new CloudStore(createClient(url, key, {
    auth: { storage: tabStorage, storageKey: channelKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  }));
}
