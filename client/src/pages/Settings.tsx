import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Titlebar from "../components/Titlebar";
import Card from "../components/ui/Card";
import * as api from "../lib/api";
import type { AppSettings, UpdateInfo } from "../lib/types";

export default function Settings() {
  const navigate = useNavigate();
  const [version, setVersion] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    api.getAppVersion().then(setVersion);
    api.getSettings().then(setSettings);
  }, []);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setSaving(key);
    try {
      const updated = await api.updateSetting(key, String(!currentValue));
      setSettings(updated);
    } catch (e) {
      console.error("Failed to update setting:", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Titlebar />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-text-primary">
            Настройки
          </h1>
        </div>

        {/* Settings list */}
        <Card>
          {settings ? (
            <div className="space-y-4">
              <SettingRow
                label="Автозапуск с Windows"
                description="Запускать при загрузке системы"
                enabled={settings.auto_start}
                loading={saving === "auto_start"}
                onToggle={() => handleToggle("auto_start", settings.auto_start)}
              />
              <SettingRow
                label="Автоподключение"
                description="Включать буст при запуске игры"
                enabled={settings.auto_connect}
                loading={saving === "auto_connect"}
                onToggle={() => handleToggle("auto_connect", settings.auto_connect)}
              />
              <SettingRow
                label="Multipath"
                description="Дублирование трафика (снижает потери)"
                enabled={settings.multipath}
                loading={saving === "multipath"}
                onToggle={() => handleToggle("multipath", settings.multipath)}
              />
              <SettingRow
                label="Сворачивать в трей"
                description="При закрытии окна"
                enabled={settings.minimize_to_tray}
                loading={saving === "minimize_to_tray"}
                onToggle={() => handleToggle("minimize_to_tray", settings.minimize_to_tray)}
              />
            </div>
          ) : (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </Card>

        {/* About & Updates */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-text-secondary">О программе</p>
              <p className="text-xs text-text-muted mt-1">
                PLGames Booster v{version || "..."}
              </p>
            </div>
            {updateInfo?.available ? (
              <button
                onClick={async () => {
                  setInstallingUpdate(true);
                  setUpdateError("");
                  try {
                    await api.installUpdate();
                  } catch (e) {
                    setUpdateError(String(e));
                    setInstallingUpdate(false);
                  }
                }}
                disabled={installingUpdate}
                className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {installingUpdate ? "Установка..." : `Обновить до v${updateInfo.version}`}
              </button>
            ) : (
              <button
                onClick={async () => {
                  setCheckingUpdate(true);
                  setUpdateError("");
                  setUpdateInfo(null);
                  try {
                    const info = await api.checkUpdate();
                    setUpdateInfo(info);
                  } catch (e) {
                    setUpdateError(String(e));
                  } finally {
                    setCheckingUpdate(false);
                  }
                }}
                disabled={checkingUpdate}
                className="px-3 py-1.5 rounded-lg bg-surface-border text-text-secondary text-xs font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                {checkingUpdate ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                    Проверка...
                  </span>
                ) : "Проверить обновления"}
              </button>
            )}
          </div>
          {updateInfo && !updateInfo.available && (
            <p className="text-xs text-green-400">У вас последняя версия</p>
          )}
          {updateInfo?.available && updateInfo.body && (
            <p className="text-xs text-text-muted mt-1">{updateInfo.body}</p>
          )}
          {updateError && (
            <p className="text-xs text-red-400 mt-1">{updateError}</p>
          )}
        </Card>
      </div>
    </>
  );
}

function SettingRow({
  label,
  description,
  enabled,
  loading,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  loading?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`w-10 h-5 rounded-full transition-colors relative ${
          enabled ? "bg-brand" : "bg-surface-border"
        } ${loading ? "opacity-50" : ""}`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
