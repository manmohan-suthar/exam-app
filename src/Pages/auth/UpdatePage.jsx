import React, { useEffect, useMemo, useRef, useState } from "react";

const fmtBytes = (n = 0) => {
  if (!n) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
};

export default function UpdatePage() {
  const [state, setState] = useState("idle"); // 'idle'|'checking'|'available'|'none'|'downloaded'|'error'
  const [info, setInfo] = useState(null);
  const [percent, setPercent] = useState(0);
  const [bps, setBps] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // flags for button spinners
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // show "No updates" only when triggered via manual check
  const manualCheckRef = useRef(false);
  const [showNoUpdateBanner, setShowNoUpdateBanner] = useState(false);

  useEffect(() => {
    const offStatus = window.electronAPI?.updater?.onStatus((payload) => {
      const next = payload.state || "idle";
      setState(next);

      if (payload.info) setInfo(payload.info);

      if (next !== "error" && next !== "idle") setErrorMsg("");

      // reset progress if new cycle starts
      if (next === "checking") {
        setPercent(0);
        setBps(0);
        setShowNoUpdateBanner(false);
      }

      // show "No updates" banner only if user clicked Check
      if (next === "none") {
        if (manualCheckRef.current) {
          setShowNoUpdateBanner(true);
          // auto-hide after a few seconds (optional)
          setTimeout(() => setShowNoUpdateBanner(false), 4000);
        }
        manualCheckRef.current = false;
      }

      // if available, clear any previous "no update" banner
      if (next === "available" || next === "downloaded") {
        setShowNoUpdateBanner(false);
      }
    });

    const offProgress = window.electronAPI?.updater?.onProgress((p) => {
      setPercent(Math.round(p.percent || 0));
      setBps(p.bytesPerSecond || 0);
    });

    return () => {
      offStatus && offStatus();
      offProgress && offProgress();
    };
  }, []);

  const canDownload = state === "available";
  const canInstall  = state === "downloaded";
  const isBusy = state === "checking" || (percent > 0 && percent < 100);

  const handleCheck = async () => {
    if (isChecking || isDownloading || isInstalling) return;
    manualCheckRef.current = true; // mark as manual
    setIsChecking(true);
    setErrorMsg("");
    setShowNoUpdateBanner(false);
    try {
      const result = await window.electronAPI?.updater?.check?.();
      if (result?.error) setErrorMsg(result.error);
    } catch (error) {
      setErrorMsg(error.message || "Failed to check for updates");
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading || !canDownload) return;
    setIsDownloading(true);
    setErrorMsg("");
    try {
      const result = await window.electronAPI?.updater?.download?.();
      if (result?.error) setErrorMsg(result.error);
    } catch (error) {
      setErrorMsg(error.message || "Failed to download update");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    if (isInstalling || !canInstall) return;
    setIsInstalling(true);
    try {
      await window.electronAPI?.updater?.install?.();
    } catch (error) {
      setErrorMsg(error.message || "Failed to install update");
      setIsInstalling(false);
    }
  };

  const headline = useMemo(() => {
    switch (state) {
      case "checking":   return "Checking for updates…";
      case "available":  return `Update available${info?.version ? `: v${info.version}` : ""}`;
      case "downloaded": return `Ready to install${info?.version ? `: v${info.version}` : ""}`;
      case "none":       return "No updates available";
      case "error":      return "Update failed";
      default:           return "App Updates";
    }
  }, [state, info]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white shadow-lg rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{headline}</h1>
              <p className="text-sm text-gray-500 mt-1">
                This page lets you check, download, and install new versions of the app.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm disabled:opacity-50"
                onClick={handleCheck}
                disabled={isChecking || isDownloading || isInstalling}
              >
                {isChecking ? "Checking…" : "Check"}
              </button>

              <button
                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={handleDownload}
                disabled={!canDownload || isDownloading || isInstalling}
              >
                {isDownloading ? "Downloading…" : "Download"}
              </button>

              <button
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
                onClick={handleInstall}
                disabled={!canInstall || isInstalling}
              >
                {isInstalling ? "Installing…" : "Restart to Update"}
              </button>
            </div>
          </div>

          {/* manual-check "no update" banner */}
          {showNoUpdateBanner && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
              <p className="text-sm">You already have the latest version. No updates available right now.</p>
            </div>
          )}

          {/* available */}
          {state === "available" && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
              <p className="text-sm">
                A new version is available{info?.version ? ` (v${info.version})` : ""}. Click <b>Download</b> to start.
              </p>
            </div>
          )}

          {/* error */}
          {state === "error" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
              <p className="text-sm">Error: {errorMsg}</p>
            </div>
          )}

          {/* progress */}
          {percent > 0 && percent < 100 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Downloading update…</span>
                <span>{percent}% • {fmtBytes(bps)}</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-[width] duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* downloaded */}
          {state === "downloaded" && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="text-sm">
                Update downloaded{info?.version ? ` (v${info.version})` : ""}. Click <b>Restart to Update</b> to finish.
              </p>
            </div>
          )}

          {/* details */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-gray-50">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium text-gray-900 capitalize mt-1">{state}</p>
            </div>
            <div className="p-4 rounded-xl border bg-gray-50">
              <p className="text-xs text-gray-500">Available Version</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{info?.version || "—"}</p>
            </div>
            <div className="p-4 rounded-xl border bg-gray-50">
              <p className="text-xs text-gray-500">Release Notes</p>
              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                {info?.releaseNotes
                  ? (typeof info.releaseNotes === "string"
                      ? info.releaseNotes
                      : "See GitHub Release Notes")
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Tip: Click <b>Check</b>. If an update is found, click <b>Download</b>, then <b>Restart to Update</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
