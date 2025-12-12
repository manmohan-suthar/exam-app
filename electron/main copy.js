const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const macaddress = require("macaddress");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

(async () => {
  const { default: Store } = await import('electron-store');
  const store = new Store();

  async function getFingerprint() {
    try {
      const mac = await macaddress.one();
      const uuidFile = path.join(app.getPath("userData"), "device-uuid.txt");
      let uuid;

      if (fs.existsSync(uuidFile)) {
        uuid = fs.readFileSync(uuidFile, "utf8").trim();
      } else {
        uuid = uuidv4();
        fs.writeFileSync(uuidFile, uuid);
      }

      return {
        macAddress: mac,
        uuid,
        hostname: os.hostname(),
        platform: os.platform(),
      };
    } catch (err) {
      console.error("Fingerprint Error:", err);
      throw err;
    }
  }

  function createWindow() {
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"), // preload ab same folder me hai
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // if (app.isPackaged) {

    //   win.loadFile(path.join(__dirname, "../dist/index.html"));
    // } else {
    //   win.loadURL("http://localhost:5173");
    //   win.webContents.openDevTools();
    // }

    // electron/main.js
    if (app.isPackaged) {
      // Option A: loadFile with hash (Electron supports this)
      win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/' });
    } else {
      win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
    }


    win.webContents.on("did-finish-load", async () => {
      try {
        const fingerprint = await getFingerprint();
        win.webContents.send("fingerprint", fingerprint);
      } catch (err) {
        console.error("Fingerprint Error (main process):", err);
      }
    });
  }

  ipcMain.handle("get-fingerprint", async () => {
    return await getFingerprint();
  });

  ipcMain.handle("store-get", (event, key) => {
    return store.get(key);
  });

  ipcMain.handle("store-set", (event, key, value) => {
    store.set(key, value);
  });

  ipcMain.handle("store-delete", (event, key) => {
    store.delete(key);
  });

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
})();
