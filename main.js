const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { machineIdSync } = require('node-machine-id');
const http = require('http');
const fs = require('fs');

// ==========================================
// SERVER MEDIA LOKAL (ANTI-GAGAL WINDOWS)
// ==========================================
let activeMediaPath = '';
let activeMediaType = '';

ipcMain.on('set-media', (event, data) => {
  activeMediaPath = data.filePath;
  activeMediaType = data.mimeType || 'application/octet-stream';
});

const mediaServer = http.createServer((req, res) => {
  if (req.url.startsWith('/bg-media') && activeMediaPath && fs.existsSync(activeMediaPath)) {
    try {
      const stat = fs.statSync(activeMediaPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(activeMediaPath, {start, end});
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': activeMediaType,
          'Access-Control-Allow-Origin': '*'
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': activeMediaType,
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(activeMediaPath).pipe(res);
      }
    } catch(e) {
      res.writeHead(500); res.end();
    }
  } else {
    res.writeHead(404); res.end();
  }
});
// Berjalan di port senyap agar tidak bentrok
mediaServer.listen(49201); 

// ==========================================
// WINDOW MANAGER
// ==========================================
let operatorWindow, ledWindow;

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
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

app.whenReady().then(createOperatorWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
