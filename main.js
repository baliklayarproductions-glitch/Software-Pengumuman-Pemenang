const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');

let operatorWindow, ledWindow;

function createWindows() {
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((display) => display.bounds.x !== 0 || display.bounds.y !== 0);

  // Window Operator
  operatorWindow = new BrowserWindow({
    width: 1280, height: 800,
    backgroundColor: '#0f172a', // Dark theme production
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  operatorWindow.loadFile('operator.html');

  // Window LED (hanya muncul jika ada layar kedua)
  if (externalDisplay) {
    ledWindow = new BrowserWindow({
      x: externalDisplay.bounds.x, y: externalDisplay.bounds.y,
      fullscreen: true, frame: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    ledWindow.loadFile('led.html');
  }
}

// Logika Lisensi (Device Lock)
ipcMain.handle('get-hwid', () => machineIdSync());

ipcMain.handle('verify-license', (event, inputKey) => {
  const hwid = machineIdSync();
  // Algoritma verifikasi sederhana: HWID di-encode base64 lalu di-reverse (Sesuaikan dengan KeyGen Android)
  const expectedKey = Buffer.from(hwid).toString('base64').split('').reverse().join('');
  return inputKey === expectedKey;
});

// Broadcast dari Operator ke LED
ipcMain.on('send-to-led', (event, data) => {
  if (ledWindow) ledWindow.webContents.send('update-led', data);
});

app.whenReady().then(createWindows);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
