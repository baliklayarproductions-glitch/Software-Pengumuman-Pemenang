const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { machineIdSync } = require('node-machine-id');

let operatorWindow;
let ledWindow;

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1280, height: 800,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  operatorWindow.loadFile('operator.html');
}

// IPC untuk Sistem Lisensi
ipcMain.handle('get-hwid', () => machineIdSync());

ipcMain.handle('verify-license', (event, inputKey) => {
  const hwid = machineIdSync();
  // Algoritma: Base64 -> Reverse (Sama dengan Key Generator Web)
  const expectedKey = Buffer.from(hwid).toString('base64').split('').reverse().join('');
  return inputKey === expectedKey;
});

// IPC untuk Membuka Layar ke-2 (LED)
ipcMain.on('open-led', () => {
  if (ledWindow) return; // Jangan buka dua kali

  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((display) => display.bounds.x !== 0 || display.bounds.y !== 0);

  let windowOptions = {
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    frame: false,
    backgroundColor: '#000000'
  };

  if (externalDisplay) {
    // Jika ada layar ke-2 (Proyektor/LED), lempar ke sana fullscreen
    windowOptions.x = externalDisplay.bounds.x;
    windowOptions.y = externalDisplay.bounds.y;
    windowOptions.fullscreen = true;
  } else {
    // Jika hanya 1 monitor (untuk test/preview), buka window ukuran kecil
    windowOptions.width = 800;
    windowOptions.height = 450;
  }

  ledWindow = new BrowserWindow(windowOptions);
  ledWindow.loadFile('led.html');

  ledWindow.on('closed', () => {
    ledWindow = null;
  });
});

// IPC untuk mengirim data dari Operator ke LED
ipcMain.on('send-to-led', (event, data) => {
  if (ledWindow) {
    ledWindow.webContents.send('update-led', data);
  }
});

app.whenReady().then(createOperatorWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
