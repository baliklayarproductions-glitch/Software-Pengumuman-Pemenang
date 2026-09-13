const { app, BrowserWindow, screen, ipcMain, protocol } = require('electron');
const { machineIdSync } = require('node-machine-id');

// HARUS DI DEKLARASIKAN SEBELUM APP READY AGAR VIDEO LOKAL BISA DIPUTAR DI .EXE
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-media', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
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
  // Daftarkan Custom Protocol untuk Video/Image Background
  protocol.registerFileProtocol('local-media', (request, callback) => {
    const url = request.url.replace('local-media://', '');
    try { return callback(decodeURIComponent(url)); } 
    catch (error) { console.error(error); }
  });

  createOperatorWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
