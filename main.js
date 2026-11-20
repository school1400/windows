'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('MadrasehYar');
if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null, db = null, dbFile = '', saveTimer = null, lastBak = 0;
const SCOPES = ['ls', 'state'];
const okScope = (s) => SCOPES.indexOf(s) !== -1;

/* ---------- local SQLite database (sql.js, saved to one file) ---------- */
async function openDb() {
  const initSqlJs = require('sql.js');
  let dir = path.dirname(require.resolve('sql.js'));
  const unpacked = dir.replace('app.asar', 'app.asar.unpacked');
  if (unpacked !== dir && fs.existsSync(path.join(unpacked, 'sql-wasm.wasm'))) dir = unpacked;
  const SQL = await initSqlJs({ locateFile: (f) => path.join(dir, f) });
  dbFile = path.join(app.getPath('userData'), 'madrasehyar.db');
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  try {
    db = fs.existsSync(dbFile) ? new SQL.Database(fs.readFileSync(dbFile)) : new SQL.Database();
    db.exec('SELECT count(*) FROM sqlite_master');
  } catch (e) {
    try { fs.copyFileSync(dbFile, dbFile + '.corrupt-' + Date.now()); } catch (_) {}
    const bak = dbFile + '.bak';
    db = fs.existsSync(bak) ? new SQL.Database(fs.readFileSync(bak)) : new SQL.Database();
  }
  db.run('CREATE TABLE IF NOT EXISTS kv(scope TEXT NOT NULL, k TEXT NOT NULL, v TEXT, PRIMARY KEY(scope,k))');
}
function flushNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!db) return;
  const data = Buffer.from(db.export());
  const tmp = dbFile + '.tmp';
  fs.writeFileSync(tmp, data);
  if (fs.existsSync(dbFile) && Date.now() - lastBak > 60000) {
    try { fs.copyFileSync(dbFile, dbFile + '.bak'); lastBak = Date.now(); } catch (_) {}
  }
  fs.renameSync(tmp, dbFile);
}
function schedule() { if (!saveTimer) saveTimer = setTimeout(() => { try { flushNow(); } catch (e) { console.error(e); } }, 400); }
function getOne(scope, k) {
  const st = db.prepare('SELECT v FROM kv WHERE scope=? AND k=?');
  st.bind([scope, k]);
  const v = st.step() ? st.get()[0] : null;
  st.free();
  return v;
}

ipcMain.on('kv:all', (e, scope) => {
  const out = {};
  if (okScope(scope)) {
    const st = db.prepare('SELECT k,v FROM kv WHERE scope=?');
    st.bind([scope]);
    while (st.step()) { const r = st.get(); out[r[0]] = r[1]; }
    st.free();
  }
  e.returnValue = out;
});
ipcMain.on('kv:set', (e, scope, k, v) => {
  if (!okScope(scope) || typeof k !== 'string' || typeof v !== 'string') return;
  db.run('INSERT OR REPLACE INTO kv(scope,k,v) VALUES(?,?,?)', [scope, k, v]); schedule();
});
ipcMain.on('kv:del', (e, scope, k) => {
  if (!okScope(scope) || typeof k !== 'string') return;
  db.run('DELETE FROM kv WHERE scope=? AND k=?', [scope, k]); schedule();
});
ipcMain.on('kv:clear', (e, scope) => {
  if (!okScope(scope)) return;
  db.run('DELETE FROM kv WHERE scope=?', [scope]); schedule();
});
ipcMain.on('kv:path', (e) => { e.returnValue = dbFile; });
ipcMain.handle('kv:get', (e, scope, k) => (okScope(scope) ? getOne(scope, k) : null));
ipcMain.handle('kv:put', (e, scope, k, v) => {
  if (!okScope(scope) || typeof k !== 'string' || typeof v !== 'string') return false;
  db.run('INSERT OR REPLACE INTO kv(scope,k,v) VALUES(?,?,?)', [scope, k, v]);
  flushNow();            // important data: written to disk before the call returns
  return true;
});

/* ---------- print -> PDF (Windows 7 has no built-in "Save as PDF") ---------- */
ipcMain.handle('app:pdf', async (e, title, html) => {
  if (typeof html !== 'string') return false;
  const parent = BrowserWindow.fromWebContents(e.sender);
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, devTools: false } });
  try {
    await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
    const name = String(title || 'report').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) + '.pdf';
    const r = await dialog.showSaveDialog(parent, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return false;
    fs.writeFileSync(r.filePath, pdf);
    shell.openPath(r.filePath);
    return true;
  } finally { if (!w.isDestroyed()) w.destroy(); }
});

/* ---------- window ---------- */
function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 1000, minHeight: 640,
    backgroundColor: '#EAF1E9', title: 'مدرسه‌یار', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'src', 'favicon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, devTools: !app.isPackaged }
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|tel|mailto):/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  win.on('closed', () => { win = null; });
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(async () => {
  try { await openDb(); } catch (e) { dialog.showErrorBox('MadrasehYar', 'Database error: ' + e.message); app.quit(); return; }
  createWindow();
});
app.on('before-quit', () => { try { flushNow(); } catch (e) { console.error(e); } });
app.on('window-all-closed', () => app.quit());
