/**
 * NotificationSettingsPage - Thời điểm vàng Settings
 * Configure spaced repetition push notification schedules
 */
import { useState, useEffect } from 'react';
import { ClayCard } from '../components/ClayCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { colors, shadows, radius } from '../design-tokens/claymorphic';
import { useAuth } from '../contexts/AuthContext';

interface ScheduleWindow {
  id: string;
  time: string; // HH:mm
  enabled: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  timezone: string;
  windows: ScheduleWindow[];
}

export function NotificationSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    timezone: 'Asia/Ho_Chi_Minh',
    windows: [
      { id: '1', time: '08:00', enabled: true },
      { id: '2', time: '12:00', enabled: true },
      { id: '3', time: '18:00', enabled: true },
      { id: '4', time: '21:00', enabled: true },
    ],
  });

  // Load settings from localStorage (or API later)
  useEffect(() => {
    const saved = localStorage.getItem('notification_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('[NotificationSettings] Parse failed:', e);
      }
    }
    setLoading(false);
  }, []);

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('notification_settings', JSON.stringify(settings));

      // Request notification permission if enabled
      if (settings.enabled && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          scheduleNotifications();
        }
      }

      alert('Đã lưu cài đặt!');
    } catch (e) {
      console.error('[NotificationSettings] Save failed:', e);
      alert('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Schedule local notifications
  const scheduleNotifications = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Clear existing notifications
    // In production, use a notification library like notifee or expo-notifications

    // Schedule notifications based on windows
    settings.windows.forEach((window) => {
      if (window.enabled) {
        console.log(`[NotificationSettings] Scheduled for ${window.time}`);
        // TODO: Use Web Notification API with showTrigger for scheduled notifications
      }
    });
  };

  // Toggle main switch
  const toggleEnabled = () => {
    setSettings((s) => ({ ...s, enabled: !s.enabled }));
  };

  // Toggle window
  const toggleWindow = (id: string) => {
    setSettings((s) => ({
      ...s,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled } : w
      ),
    }));
  };

  // Update window time
  const updateWindowTime = (id: string, time: string) => {
    setSettings((s) => ({
      ...s,
      windows: s.windows.map((w) => (w.id === id ? { ...w, time } : w)),
    }));
  };

  // Add new window
  const addWindow = () => {
    const newWindow: ScheduleWindow = {
      id: Date.now().toString(),
      time: '12:00',
      enabled: true,
    };
    setSettings((s) => ({
      ...s,
      windows: [...s.windows, newWindow],
    }));
  };

  // Remove window
  const removeWindow = (id: string) => {
    setSettings((s) => ({
      ...s,
      windows: s.windows.filter((w) => w.id !== id),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.backgroundBase }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: colors.backgroundBase }}>
      {/* Header */}
      <div
        className="px-4 pt-8 pb-6"
        style={{
          background: `linear-gradient(135deg, ${colors.sunshineYellow}40, ${colors.coralPink}40)`,
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2" style={{ color: colors.deepSlate }}>
            ⏰ Thời điểm vàng
          </h1>
          <p className="text-sm" style={{ color: colors.mediumGray }}>
            Nhắc nhở ôn tập từ vựng đúng lúc
          </p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Main Toggle */}
        <ClayCard className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: settings.enabled ? colors.neonTeal + '30' : colors.lightGray,
                }}
              >
                🔔
              </div>
              <div>
                <h2 className="font-bold" style={{ color: colors.deepSlate }}>
                  Bật thông báo
                </h2>
                <p className="text-sm" style={{ color: colors.mediumGray }}>
                  Nhận nhắc nhở ôn tập từ vựng
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onChange={toggleEnabled}
              activeColor={colors.neonTeal}
            />
          </div>
        </ClayCard>

        {/* Schedule Windows */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold" style={{ color: colors.deepSlate }}>
              🕐 Lịch nhắc nhở
            </h2>
            <Badge variant="secondary" size="sm">
              {settings.windows.filter((w) => w.enabled).length} active
            </Badge>
          </div>

          {settings.windows.map((window) => (
            <ClayCard key={window.id} className="p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{
                    backgroundColor: window.enabled
                      ? colors.skyBlue + '30'
                      : colors.lightGray,
                  }}
                >
                  {window.time === '08:00' ? '🌅' :
                   window.time === '12:00' ? '☀️' :
                   window.time === '18:00' ? '🌆' :
                   window.time === '21:00' ? '🌙' : '⏰'}
                </div>

                <div className="flex-1">
                  <Input
                    type="time"
                    value={window.time}
                    onChange={(e) => updateWindowTime(window.id, e.target.value)}
                    disabled={!settings.enabled}
                    className="w-32"
                  />
                  <p className="text-xs mt-1" style={{ color: colors.mediumGray }}>
                    {getTimeDescription(window.time)}
                  </p>
                </div>

                <Switch
                  checked={window.enabled}
                  onChange={() => toggleWindow(window.id)}
                  disabled={!settings.enabled}
                  activeColor={colors.skyBlue}
                />

                {settings.windows.length > 1 && (
                  <button
                    onClick={() => removeWindow(window.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.coralPink + '20' }}
                  >
                    <span style={{ color: colors.coralPink }}>×</span>
                  </button>
                )}
              </div>
            </ClayCard>
          ))}

          <Button
            variant="outline"
            onClick={addWindow}
            disabled={!settings.enabled || settings.windows.length >= 6}
            className="w-full"
          >
            + Thêm giờ nhắc
          </Button>
        </div>

        {/* SM-2 Interval Info */}
        <ClayCard className="p-4" style={{ backgroundColor: colors.lavender + '20' }}>
          <h3 className="font-bold mb-2 flex items-center gap-2" style={{ color: colors.deepSlate }}>
            📊 Cách hoạt động
          </h3>
          <div className="space-y-2 text-sm" style={{ color: colors.mediumGray }}>
            <p>• <strong>SM-2 Algorithm</strong>: Ôn tập theo khoảng cách tối ưu</p>
            <p>• Lần đầu: ôn sau <strong>1 ngày</strong></p>
            <p>• Lần 2: ôn sau <strong>6 ngày</strong></p>
            <p>• Lần 3+: khoảng cách tăng dần theo độ khó</p>
            <p className="pt-2 border-t" style={{ borderColor: colors.lightGray }}>
              💡 <strong>Mẹo</strong>: 4 lần/ngày cho kết quả tốt nhất!
            </p>
          </div>
        </ClayCard>

        {/* Notification Preview */}
        <ClayCard className="p-4">
          <h3 className="font-bold mb-3" style={{ color: colors.deepSlate }}>
            📱 Xem trước
          </h3>
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: colors.warmWhite,
              border: `2px solid ${colors.skyBlue}`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: colors.sunshineYellow }}
              >
                📚
              </div>
              <div className="flex-1">
                <p className="font-bold" style={{ color: colors.deepSlate }}>
                  EduAR - Đến lúc ôn tập!
                </p>
                <p className="text-sm" style={{ color: colors.mediumGray }}>
                  Bạn có <strong>5 từ</strong> cần xem lại ngay. Nhấn để luyện tập!
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="primary" size="sm">📖 Luyện tập</Badge>
                  <Badge variant="secondary" size="sm">⏰ Nhắc lại</Badge>
                </div>
              </div>
            </div>
          </div>
        </ClayCard>

        {/* Save Button */}
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 text-lg"
          style={{
            backgroundColor: colors.neonTeal,
            boxShadow: shadows.clay,
          }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" /> Đang lưu...
            </span>
          ) : (
            '✓ Lưu cài đặt'
          )}
        </Button>

        {/* PWA Install Reminder */}
        {!settings.enabled || (
          <div className="text-center text-xs p-4" style={{ color: colors.mediumGray }}>
            <p>💡 Để nhận thông báo, hãy cài đặt EduAR lên màn hình chính</p>
            <p className="mt-1">Safari → Chia sẻ → Thêm vào Màn hình chính</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeDescription(time: string): string {
  const [hours] = time.split(':').map(Number);
  if (hours < 10) return 'Buổi sáng sớm';
  if (hours < 12) return 'Buổi sáng';
  if (hours < 14) return 'Buổi trưa';
  if (hours < 18) return 'Buổi chiều';
  if (hours < 21) return 'Buổi tối';
  return 'Đêm khuya';
}

export default NotificationSettingsPage;
