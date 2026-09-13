const { app, BrowserWindow, screen, ipcMain, protocol } = require('electron');
const { machineIdSync } = require('node-machine-id');
const path = require('path'); // MODUL WAJIB UNTUK MEMPERBAIKI PATH WINDOWS

protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { secure: true, bypassCSP: true, stream: true, supportFetchAPI: true } }
]);

let operatorWindow, ledWindow;

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  operatorWindow.loadFile('operator.html');
}

ipcMain.handle('get-hwid', () => machineIdSync());
ipcMain.handle('verify-license', (event, inputKey) => {
  const hwid = machineIdSync();
  const expectedKey = Buffer.from(hwid).toString('base64').split('').reverse().join('');
  return inputKey === expectedKey;
});

ipcMain.on('open-led', () => {
  if (ledWindow) return;
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((display) => display.bounds.x !== 0 || display.bounds.y !== 0);

  let windowOptions = {
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false },
    frame: false, backgroundColor: '#000000'
  };

  if (externalDisplay) {
    windowOptions.x = externalDisplay.bounds.x;
    windowOptions.y = externalDisplay.bounds.y;
    windowOptions.fullscreen = true;
  } else {
    windowOptions.width = 800; windowOptions.height = 450;
  }

  ledWindow = new BrowserWindow(windowOptions);
  ledWindow.loadFile('led.html');
  ledWindow.on('closed', () => { ledWindow = null; });
});

ipcMain.on('send-to-led', (event, data) => {
  if (ledWindow) ledWindow.webContents.send('update-led', data);
});

app.whenReady().then(() => {
  
  // PROTOKOL ANTI-GAGAL KHUSUS WINDOWS
  protocol.registerFileProtocol('asset', (request, callback) => {
    let url = request.url.replace('asset://', '');
    try { url = decodeURIComponent(url); } catch (e) {}

    // Normalisasi jalur file
    let filePath = path.normalize(url);

    // FIX WINDOWS: Hapus garis miring siluman di depan huruf C: (\C:\... menjadi C:\...)
    if (process.platform === 'win32' && filePath.startsWith('\\')) {
      filePath = filePath.slice(1);
    }

    callback({ path: filePath });
  });

  createOperatorWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
