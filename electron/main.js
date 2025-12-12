const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const macaddress = require("macaddress");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// 🔔 Auto-update (GitHub Releases)
const { autoUpdater } = require("electron-updater");

// (Windows notifications & updater metadata)
if (process.platform === "win32") {
  app.setAppUserModelId("com.onlineexam.app"); // appId == build.appId
}

(async () => {
  const { default: Store } = await import("electron-store");
  const store = new Store();

  const isDev = !app.isPackaged;

  // ✅ Device Fingerprint
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

  let win;

  // ✅ Create Window
  function createWindow() {
    win = new BrowserWindow({
      width: 1000,
      height: 700,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // ✅ REMOVE MENU (File / Edit / View / Developer)
    win.setMenu(null);
    Menu.setApplicationMenu(null);

    // ✅ Load app
    if (isDev) {
      win.loadURL("http://localhost:5173");
      win.webContents.openDevTools(); // ONLY DEV
    } else {
      win.loadFile(path.join(__dirname, "../dist/index.html"), { hash: "/" });
    }

    // ✅ Send fingerprint to renderer
    win.webContents.on("did-finish-load", async () => {
      try {
        const fingerprint = await getFingerprint();
        win.webContents.send("fingerprint", fingerprint);
      } catch (err) {
        console.error("Fingerprint send error:", err);
      }
    });
  }

  // ✅ Auto-Updater wiring
  function setupAutoUpdater() {
    // Optional: beta/alpha channels (false = only stable)
    autoUpdater.allowPrerelease = false;

    // Check only in packaged apps
    if (!isDev) {
      // Wait for window to be ready
      const checkForUpdates = () => {
        if (!win) {
          console.warn("Window not ready, retrying...");
          setTimeout(checkForUpdates, 500);
          return;
        }

        autoUpdater.checkForUpdates()
          .then(() => {
            console.log("Update check initiated successfully");
          })
          .catch((e) => {
            console.error("checkForUpdates error:", e);
            win.webContents.send("update:status", {
              state: "error",
              message: e?.message || String(e),
            });
          });
      };

      // Start update check with proper window validation
      setTimeout(checkForUpdates, 1000);
    }

    // Events -> renderer
    autoUpdater.on("checking-for-update", () => {
      if (win) {
        win.webContents.send("update:status", { state: "checking" });
      }
    });
    autoUpdater.on("update-available", (info) => {
      if (win) {
        win.webContents.send("update:status", { state: "available", info });
      }
    });
    autoUpdater.on("update-not-available", () => {
      if (win) {
        win.webContents.send("update:status", { state: "none" });
      }
    });
    autoUpdater.on("error", (err) => {
      if (win) {
        win.webContents.send("update:status", {
          state: "error",
          message: err?.message || String(err),
        });
      }
    });
    autoUpdater.on("download-progress", (p) => {
      if (win) {
        win.webContents.send("update:progress", {
          percent: p.percent,
          bytesPerSecond: p.bytesPerSecond,
          transferred: p.transferred,
          total: p.total,
        });
      }
    });
    autoUpdater.on("update-downloaded", (info) => {
      if (win) {
        win.webContents.send("update:status", { state: "downloaded", info });
      }
    });

    // Renderer -> manual controls with proper error handling
    ipcMain.handle("update:check", async () => {
      try {
        await autoUpdater.checkForUpdates();
        return { success: true };
      } catch (error) {
        console.error("Manual update check failed:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("update:download", async () => {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        console.error("Update download failed:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("update:install", () => {
      if (win) {
        // Clean up before restart
        win.removeAllListeners();
        autoUpdater.quitAndInstall();
        return true;
      }
      return false;
    });
  }

  // ✅ IPC HANDLERS (your existing)
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

  // ✅ Disable DevTools shortcut (Ctrl + Shift + I)
  app.on("browser-window-created", (_, window) => {
    window.webContents.on("before-input-event", (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === "i") {
        event.preventDefault();
      }
    });
  });

  // ✅ App lifecycle
  app.whenReady().then(() => {
    createWindow();
    setupAutoUpdater();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
})();
