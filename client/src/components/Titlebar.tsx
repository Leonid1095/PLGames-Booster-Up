import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as api from "../lib/api";

export default function Titlebar() {
  const appWindow = getCurrentWindow();
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const handleClose = () => {
    setShowCloseDialog(true);
  };

  const handleMinimizeToTray = async () => {
    setShowCloseDialog(false);
    await appWindow.hide();
  };

  const handleQuit = async () => {
    setShowCloseDialog(false);
    await api.quit();
  };

  return (
    <>
      <div
        data-tauri-drag-region
        className="h-8 flex items-center justify-between px-3 bg-surface-bg border-b border-surface-border select-none shrink-0"
      >
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <div className="w-3 h-3 rounded-full bg-brand" />
          <span className="text-xs font-medium text-text-secondary">
            PLGames Booster
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => appWindow.minimize()}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-hover transition-colors"
          >
            <svg
              width="10"
              height="1"
              viewBox="0 0 10 1"
              className="text-text-muted"
            >
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400 transition-colors text-text-muted"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M1 1L9 9M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Close dialog overlay */}
      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface-card border border-surface-border rounded-xl p-5 mx-6 w-full max-w-xs shadow-2xl">
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Закрыть приложение?
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Выберите действие при закрытии окна
            </p>
            <div className="space-y-2">
              <button
                onClick={handleMinimizeToTray}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-bg border border-surface-border hover:border-brand/50 transition-all text-left"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-brand shrink-0">
                  <path d="M3 13h10M8 3v7M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-text-primary">Свернуть в трей</p>
                  <p className="text-[10px] text-text-muted">Приложение продолжит работать</p>
                </div>
              </button>
              <button
                onClick={handleQuit}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-bg border border-surface-border hover:border-red-500/50 transition-all text-left"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-red-400 shrink-0">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-text-primary">Закрыть полностью</p>
                  <p className="text-[10px] text-text-muted">Завершить работу приложения</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowCloseDialog(false)}
              className="w-full mt-3 text-xs text-text-muted hover:text-text-secondary transition-colors py-1"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  );
}
