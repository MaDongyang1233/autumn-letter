import { createStore } from './store.js';
import { localDate, validateCredentials, validateDiary, humanError, MAX_IMAGE_BYTES, MAX_PHOTO_BYTES } from './domain.js';
import { mountHouse } from './house.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
let store;
let diaries = [];
let photos = [];
let authMode = 'login';
let activeView = 'home';
let editId = null;
let unsubscribe;
let toastTimer;
let refreshId = 0;
let changeTimer;
let objectUrls = [];
let previewId = null;
let dialogAction;
let photoBusy = false;
let diaryBusy = false;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3600);
}
function authHint(message, success = false) {
  $('#auth-hint').textContent = message;
  $('#auth-hint').classList.toggle('success', success);
}
function setAuthMode(mode) {
  authMode = mode;
  $$('.auth-tab').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.authMode === mode)));
  const register = mode === 'register';
  $('#auth-title').textContent = register ? '为你留了一把钥匙' : '欢迎回家';
  $('#auth-subtitle').textContent = register ? '王琦，这个小家一直在等你。' : '马冬阳和王琦的两人生活记录。';
  $('#auth-submit-label').textContent = register ? '注册并进入小家' : '进入小家';
  $('#auth-name').placeholder = register ? '王琦' : '马冬阳 / 王琦';
  $('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
  authHint('');
}
function switchView(name, scroll = true) {
  activeView = ['home', 'diary', 'gallery', 'letter'].includes(name) ? name : 'home';
  $$('.view').forEach(view => view.classList.toggle('active', view.id === 'view-' + activeView));
  $$('.nav-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.view === activeView);
    if (button.dataset.view === activeView) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  history.replaceState(null, '', '#' + activeView);
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function dateLabel(value) {
  const date = new Date(value.length === 10 ? value + 'T12:00:00+08:00' : value);
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}
function showLoading() {
  $('#sync-state').textContent = '正在打开记忆…';
  $('#refresh-btn').disabled = true;
}
async function refresh({ silent = false } = {}) {
  if (!store?.user) return;
  const id = ++refreshId;
  if (!silent) showLoading();
  const [diaryResult, photoResult] = await Promise.allSettled([store.listDiaries(), store.listPhotos()]);
  if (id !== refreshId || !store.user) return;
  const errors = [];
  if (diaryResult.status === 'fulfilled') diaries = diaryResult.value;
  else errors.push(humanError(diaryResult.reason));
  if (photoResult.status === 'fulfilled') {
    const nextUrls = [];
    const nextPhotos = photoResult.value.map(item => {
      const url = item.blob ? URL.createObjectURL(item.blob) : item.url;
      if (item.blob) nextUrls.push(url);
      return { ...item, url };
    });
    const previousUrls = objectUrls;
    objectUrls = nextUrls;
    photos = nextPhotos;
    if ($('#photo-dialog').open) {
      const currentPhoto = photos.find(item => item.id === previewId);
      if (currentPhoto) $('#preview-image').src = currentPhoto.url;
      else $('#photo-dialog').close();
    }
    previousUrls.forEach(url => URL.revokeObjectURL(url));
  } else errors.push(humanError(photoResult.reason));
  render();
  $('#refresh-btn').disabled = false;
  $('#sync-state').textContent = errors.length ? '部分内容未能加载 · 点击刷新' : store.mode === 'cloud' ? '两个人的记忆，已同步' : '本地体验 · 仅当前浏览器保存';
  if (errors.length && !silent) toast(errors[0]);
}
function scheduleRefresh() {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => refresh({ silent: true }), 200);
}
async function enter() {
  $('#auth-shell').hidden = true;
  $('#app-shell').hidden = false;
  $('#demo-banner').hidden = store.mode !== 'demo';
  $('#user-name-label').textContent = store.user.display_name;
  $('#user-avatar').textContent = store.user.display_name.slice(0, 1);
  $('#diary-date').value = localDate();
  $('#today-stamp').textContent = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  switchView(location.hash.slice(1) || 'home', false);
  unsubscribe?.();
  unsubscribe = store.subscribe(scheduleRefresh);
  await refresh();
  window.scrollTo(0, 0);
}
async function leave() {
  if (photoBusy || diaryBusy) { toast('正在保存，请稍等片刻再切换。'); return; }
  await store.signOut();
  unsubscribe?.();
  unsubscribe = null;
  ++refreshId;
  clearTimeout(changeTimer);
  diaries = []; photos = [];
  objectUrls.forEach(url => URL.revokeObjectURL(url));
  objectUrls = [];
  $('#app-shell').hidden = true;
  $('#auth-shell').hidden = false;
  $('#auth-form').reset();
  $('#diary-form').reset();
  resetEditor();
  $('#photo-caption').value = '';
  $('#upload-status').textContent = '';
  $('#delete-dialog').close();
  $('#photo-dialog').close();
  setAuthMode('login');
  switchView('home', false);
  window.scrollTo(0, 0);
}
function render() {
  $('#diary-count').textContent = diaries.length;
  $('#photo-count').textContent = photos.length;
  $('#diary-total-label').textContent = diaries.length + ' 条记录';
  $('#photo-total-label').textContent = photos.length + ' 张照片';
  $('#recent-diaries').innerHTML = diaries.length ? diaries.slice(0, 3).map(item => `<button class="recent-item recent-button" data-go-diary="${escape(item.id)}"><span class="recent-date">${escape(item.entry_date.slice(5))}</span><span><span class="recent-text">${escape(item.content)}</span><span class="record-author">${escape(item.author_name)}</span></span><span class="mood-dot">${escape(item.mood)}</span></button>`).join('') : '<div class="empty">还没有日记。<br>把今天的第一句话写下来吧。</div>';
  $('#diary-list').innerHTML = diaries.length ? diaries.map(item => `<article class="diary-item" id="entry-${escape(item.id)}">${item.author_id === store.user.id ? `<div class="record-actions"><button type="button" data-edit-diary="${escape(item.id)}">编辑</button><button type="button" data-delete-diary="${escape(item.id)}">删除</button></div>` : ''}<div class="diary-meta"><span class="mood-dot">${escape(item.mood)}</span><time datetime="${escape(item.entry_date)}">${dateLabel(item.entry_date)}</time><span>${escape(item.author_name)}</span></div><p class="diary-content">${escape(item.content)}</p></article>`).join('') : '<div class="empty">时间线还是空的。<br>写下第一篇日记，它就会出现在这里。</div>';
  $('#recent-photos').innerHTML = photos.length ? photos.slice(0, 3).map(item => `<button class="gallery-thumb" type="button" data-open-photo="${escape(item.id)}"><img src="${escape(item.url)}" alt="${escape(item.caption || item.name)}" loading="lazy"></button>`).join('') : '<div class="gallery-thumb empty-thumb">＋</div><div class="gallery-thumb empty-thumb">♡</div><div class="gallery-thumb empty-thumb">✦</div>';
  $('#gallery-grid').innerHTML = photos.length ? photos.map(item => `<figure class="photo-card"><button class="photo-open" type="button" data-open-photo="${escape(item.id)}"><img src="${escape(item.url)}" alt="${escape(item.caption || item.name)}" loading="lazy"></button><figcaption>${escape(item.caption || '生活里的小瞬间')}<small>${escape(item.author_name)} · ${dateLabel(item.created_at)}</small></figcaption>${item.author_id === store.user.id ? `<button class="photo-remove" type="button" data-delete-photo="${escape(item.id)}" aria-label="删除照片">×</button>` : ''}</figure>`).join('') : '<div class="empty" style="grid-column:1/-1">相册还没有照片。<br>选一张今天的光景放进来吧。</div>';
}
function resetEditor() {
  editId = null;
  $('#diary-editor-title').textContent = '写下今天';
  $('#diary-save-label').textContent = '保存这篇日记';
  $('#cancel-edit').hidden = true;
  $('#diary-text').value = '';
  $('#diary-status').textContent = '';
  $('#diary-date').value = localDate();
}
async function saveDiary(event) {
  event.preventDefault();
  if (diaryBusy) return;
  const button = $('#diary-save');
  try {
    const input = validateDiary({ content: $('#diary-text').value, entry_date: $('#diary-date').value, mood: $('#diary-mood').value });
    diaryBusy = true; button.disabled = true;
    await store.saveDiary(input, editId);
    resetEditor();
    await refresh({ silent: true });
    $('#diary-status').textContent = '已收进时间线。';
    toast('这份心情已经保存。');
  } catch (error) { $('#diary-status').textContent = humanError(error); }
  finally { diaryBusy = false; button.disabled = false; }
}
function editDiary(id) {
  const item = diaries.find(record => record.id === id);
  if (!item || item.author_id !== store.user.id) return;
  editId = id;
  $('#diary-date').value = item.entry_date;
  $('#diary-mood').value = item.mood;
  $('#diary-text').value = item.content;
  $('#diary-editor-title').textContent = '再添几笔';
  $('#diary-save-label').textContent = '保存修改';
  $('#cancel-edit').hidden = false;
  $('#diary-status').textContent = '';
  $('#diary-text').focus();
  $('.editor').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function confirmDelete(message, action) {
  $('#delete-message').textContent = message;
  dialogAction = action;
  $('#delete-dialog').showModal();
}
async function performDelete() {
  const button = $('#confirm-delete');
  button.disabled = true;
  try {
    const message = await dialogAction?.();
    $('#delete-dialog').close();
    await refresh({ silent: true });
    toast(message || '已移除这条记录。');
  } catch (error) { toast(humanError(error)); }
  finally { button.disabled = false; }
}
async function compressImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WEBP 图片。');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('单张原图请小于 20 MB。');
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!blob || blob.size > MAX_PHOTO_BYTES) throw new Error('图片处理后仍然太大，请换一张较小的图片。');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
async function uploadFiles(fileList) {
  if (photoBusy || !fileList?.length) return;
  const files = [...fileList];
  if (files.length > 12) { toast('每次最多上传 12 张照片，请分批选择。'); return; }
  photoBusy = true;
  $('#photo-input').disabled = true;
  $('#dropzone').classList.add('busy');
  const caption = $('#photo-caption').value.trim().slice(0, 200);
  let saved = 0;
  const errors = [];
  try {
    for (let index = 0; index < files.length; index++) {
      $('#upload-status').textContent = `正在收好照片 ${index + 1} / ${files.length}…`;
      try {
        const blob = await compressImage(files[index]);
        await store.uploadPhoto(blob, files[index].name.slice(0, 200), caption);
        saved++;
      } catch (error) { errors.push(files[index].name + '：' + humanError(error)); }
    }
    await refresh({ silent: true });
    $('#upload-status').textContent = `已保存 ${saved} 张${errors.length ? '；' + errors.length + ' 张未保存。' + errors[0] : '，把这一刻收好了。'}`;
    if (!errors.length) $('#photo-caption').value = '';
    if (saved) toast('照片已经放进相册。');
  } finally {
    photoBusy = false;
    $('#photo-input').disabled = false;
    $('#dropzone').classList.remove('busy');
  }
}
function openPhoto(id) {
  const item = photos.find(photo => photo.id === id);
  if (!item) return;
  previewId = id;
  $('#preview-image').src = item.url;
  $('#preview-image').alt = item.caption || item.name;
  $('#preview-caption').textContent = item.caption || item.name;
  $('#preview-author').textContent = item.author_name + ' · ' + dateLabel(item.created_at);
  $('#photo-dialog').showModal();
}
function bindEvents() {
  $$('.auth-tab').forEach(button => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
  $('#auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('#auth-form button[type=submit]');
    if (button.disabled) return;
    button.disabled = true;
    authHint('');
    try {
      const name = $('#auth-name').value.trim();
      const password = $('#auth-password').value;
      validateCredentials(name, password, authMode === 'register');
      if (authMode === 'register') await store.signUp(name, password);
      else await store.signIn(name, password);
      $('#auth-password').value = '';
      await enter();
    } catch (error) { authHint(humanError(error)); }
    finally { button.disabled = false; }
  });
  $$('[data-demo-name]').forEach(button => button.addEventListener('click', async () => {
    try { await store.enterDemo(button.dataset.demoName); await enter(); }
    catch (error) { authHint(humanError(error)); }
  }));
  $('#logout-btn').addEventListener('click', () => leave().catch(error => toast(humanError(error))));
  $$('[data-view]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); switchView(button.dataset.view); }));
  $('#diary-form').addEventListener('submit', saveDiary);
  $('#cancel-edit').addEventListener('click', resetEditor);
  $('#confirm-delete').addEventListener('click', performDelete);
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $('#' + button.dataset.closeDialog).close()));
  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-diary]');
    const removeDiary = event.target.closest('[data-delete-diary]');
    const removePhoto = event.target.closest('[data-delete-photo]');
    const photo = event.target.closest('[data-open-photo]');
    const recent = event.target.closest('[data-go-diary]');
    if (edit) editDiary(edit.dataset.editDiary);
    if (removeDiary) confirmDelete('确定删除这篇日记吗？删除后不能恢复。', async () => { await store.deleteDiary(removeDiary.dataset.deleteDiary); if (editId === removeDiary.dataset.deleteDiary) resetEditor(); });
    if (removePhoto) confirmDelete('确定从相册移除这张照片吗？删除后不能恢复。', () => store.deletePhoto(removePhoto.dataset.deletePhoto));
    if (photo) openPhoto(photo.dataset.openPhoto);
    if (recent) { switchView('diary', false); setTimeout(() => $('#entry-' + recent.dataset.goDiary)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); }
  });
  $('#photo-input').addEventListener('change', event => { uploadFiles(event.target.files); event.target.value = ''; });
  const dropzone = $('#dropzone');
  ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', event => uploadFiles(event.dataTransfer.files));
  $$('.model-toggle button').forEach(button => button.addEventListener('click', () => {
    $$('.model-toggle button').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    $('#house-card').classList.toggle('night', button.dataset.modelMode === 'night');
  }));
  $('#refresh-btn').addEventListener('click', () => refresh());
  window.addEventListener('online', () => refresh({ silent: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh({ silent: true }); });
  window.addEventListener('beforeunload', event => { if (photoBusy || diaryBusy || $('#diary-text').value.trim()) { event.preventDefault(); event.returnValue = ''; } });
  // Polling also recovers from a disconnected realtime websocket and renews signed URLs.
  setInterval(() => { if (!document.hidden && store?.user) refresh({ silent: true }); }, 45000);
}
async function init() {
  mountHouse($('.home-viewport'), switchView);
  bindEvents();
  setAuthMode('login');
  try {
    store = await createStore(window.LITTLE_HOME_CONFIG);
    $('#demo-options').hidden = store.mode !== 'demo';
    $('#auth-privacy').textContent = store.mode === 'demo' ? '当前为本地体验。连接云端后，马冬阳和王琦可在各自设备上共享记录。' : '仅马冬阳和王琦可进入。每个账号有自己的密码，两个人共用一本记录簿。';
    const user = await store.restore();
    if (user) await enter();
  } catch (error) {
    authHint(humanError(error));
    $('#auth-form button[type=submit]').disabled = true;
  }
}
init();
