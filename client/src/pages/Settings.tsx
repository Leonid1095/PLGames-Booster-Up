import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Titlebar from "../components/Titlebar";
import Card from "../components/ui/Card";
import * as api from "../lib/api";
import type { AppSettings } from "../lib/types";

export default function Settings() {
  const navigate = useNavigate();
  const [version, setVersion] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

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

        {/* About */}
        <Card>
          <p className="text-sm text-text-secondary">О программе</p>
          <p className="text-xs text-text-muted mt-1">
            PLGames Booster v{version || "..."}
          </p>
          <p className="text-xs text-text-muted">
            Game network booster with PLG Protocol
          </p>
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
