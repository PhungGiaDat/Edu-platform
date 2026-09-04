/**
 * NotificationSettingsPage - "Thời điểm vàng" (parent-facing reminder settings)
 *
 * Rewritten 2026-09-03 for the Web Push pipeline (kid-friendly, 1 nudge/day):
 * - State A: Safari tab / browser (not installed) → home-screen install guide
 *   (iOS 16.4+ push ONLY works in the standalone PWA).
 * - State B: installed, not subscribed → permission + subscribe (user gesture).
 * - State C: subscribed → manage preferred hour / disable.
 * Prefs persist server-side (notification_prefs) — no more localStorage TODO.
 */
import { useState, useEffect } from 'react';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { Switch } from '@/shared/components/ui/Switch';
import { Badge } from '@/shared/components/ui/Badge';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { colors, shadows, withOpacity } from '../design-tokens/claymorphic';
import {
  requestPermissionAndSubscribe,
  unsubscribeFromPush,
  isStandalonePwa,
  notificationsSupported,
  notificationPermission,
} from '../services/notifications';
import { apiClient } from '../services/apiClient';
import { Link } from 'react-router-dom';

interface Prefs {
  user_id: string;
  enabled: boolean;
  preferred_hour: number;
  timezone: string;
}

const HOUR_ICONS: Record<number, string> = {
  7: '🌅', 8: '🌅', 9: '🌤️', 12: '☀️', 13: '☀️', 14: '🌤️',
  17: '🌆', 18: '🌆', 19: '🌆', 20: '🌙', 21: '🌙',
};

export function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [installed] = useState(() => isStandalonePwa());
  const [supported] = useState(() => notificationsSupported());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => notificationPermission());
  const [prefs, setPrefs] = useState<Prefs>({
    user_id: '',
    enabled: false,
    preferred_hour: 17,
    timezone: 'Asia/Ho_Chi_Minh',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.get('/api/v1/notifications/prefs') as Prefs;
        setPrefs(data);
      } catch (err) {
        console.error('[NotificationSettings] Load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleEnablePush = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const result = await requestPermissionAndSubscribe();
      setPermission(notificationPermission());
      if (result.success) {
        const saved = await apiClient.put('/api/v1/notifications/prefs', {
          enabled: true,
          preferred_hour: prefs.preferred_hour,
          timezone: prefs.timezone,
        }) as Prefs;
        setPrefs(saved);
        setStatus('Đã bật nhắc nhở! Lexi sẽ mời con chơi mỗi ngày 🐶');
      } else {
        setStatus(reasonText(result.reason));
      }
    } catch (err) {
      console.error('[NotificationSettings] Enable failed:', err);
      setStatus('Bật chưa thành công, thử lại nhé');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await unsubscribeFromPush();
      const saved = await apiClient.put('/api/v1/notifications/prefs', {
        enabled: false,
        preferred_hour: prefs.preferred_hour,
        timezone: prefs.timezone,
      }) as Prefs;
      setPrefs(saved);
      setPermission(notificationPermission());
      setStatus('Đã tắt nhắc nhở');
    } catch (err) {
      console.error('[NotificationSettings] Disable failed:', err);
      setStatus('Tắt chưa thành công');
    } finally {
      setSaving(false);
    }
  };

  const handleHourChange = async (hour: number) => {
    setPrefs((p) => ({ ...p, preferred_hour: hour }));
    try {
      const saved = await apiClient.put('/api/v1/notifications/prefs', {
        enabled: prefs.enabled,
        preferred_hour: hour,
        timezone: prefs.timezone,
      }) as Prefs;
      setPrefs(saved);
    } catch (err) {
      console.error('[NotificationSettings] Hour update failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.backgroundBase }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const subscribed = prefs.enabled && permission === 'granted';

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: colors.backgroundBase }}>
      {/* Header */}
      <div
        className="px-4 pt-8 pb-6"
        style={{
          background: `linear-gradient(135deg, ${withOpacity(colors.sunshineYellow, 0.4)}, ${withOpacity(colors.coralPink, 0.4)})`,
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black mb-2" style={{ color: colors.deepSlate }}>
            ⏰ Thời điểm vàng
          </h1>
          <p className="text-sm font-semibold" style={{ color: colors.mediumGray }}>
            Mỗi ngày Lexi chỉ mời con chơi đúng một lần thôi — không làm phiền!
          </p>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* STATE A: not installed (iOS in-browser cannot push) */}
        {supported && !installed && (
          <ClayCard className="p-5">
            <h2 className="font-black mb-3 flex items-center gap-2" style={{ color: colors.deepSlate }}>
              📲 Cài EduAR lên Màn hình chính
            </h2>
            <p className="text-sm mb-3" style={{ color: colors.mediumGray }}>
              Trên iPhone, nhắc nhở chỉ hoạt động khi app được cài như một ứng dụng. Làm theo 2 bước nhé:
            </p>
            <ol className="space-y-2 text-sm" style={{ color: colors.deepSlate }}>
              <li className="flex gap-2">
                <Badge variant="primary" size="sm">1</Badge>
                <span>
                  Mở trang web bằng <strong>Safari (iOS)</strong> hoặc <strong>Chrome (Android)</strong>:{' '}
                  <strong>https://learnvocab.pages.dev</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <Badge variant="primary" size="sm">2</Badge>
                <span>
                  Nhấn nút <strong>Chia sẻ</strong> → chọn <strong>“Thêm vào Màn hình chính”</strong>
                </span>
              </li>
            </ol>
            <Link
              to="/install"
              className="w-full mt-4 flex items-center justify-center gap-2 font-black"
              style={{
                borderRadius: 24,
                padding: '14px 22px',
                background: withOpacity(colors.sunshineYellow, 0.9),
                boxShadow: shadows.clayYellow,
                color: colors.deepSlate,
              }}
            >
              <span className="msr" style={{ fontSize: 20 }}>install_mobile</span>
              Mở hướng dẫn cài đặt
            </Link>
            <p className="mt-3 text-xs" style={{ color: colors.mediumGray }}>
              Sau đó mở EduAR từ biểu tượng trên Màn hình chính và quay lại đây để bật nhắc nhở 🌱
            </p>
          </ClayCard>
        )}

        {!supported && (
          <ClayCard className="p-5">
            <h2 className="font-black mb-2" style={{ color: colors.deepSlate }}>🔔 Thiết bị chưa hỗ trợ</h2>
            <p className="text-sm" style={{ color: colors.mediumGray }}>
              Trình duyệt này chưa hỗ trợ thông báo. Bạn thử Chrome hoặc Safari mới hơn nhé!
            </p>
          </ClayCard>
        )}

        {/* STATE B/C: main toggle + preferred hour */}
        {supported && installed && (
          <>
            <ClayCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                    style={{
                      backgroundColor: withOpacity(colors.neonTeal, 0.25),
                      boxShadow: shadows.claySm,
                    }}
                  >
                    🔔
                  </div>
                  <div>
                    <h2 className="font-black" style={{ color: colors.deepSlate }}>
                      {subscribed ? 'Nhắc nhở đang bật' : 'Bật nhắc nhở'}
                    </h2>
                    <p className="text-sm" style={{ color: colors.mediumGray }}>
                      {subscribed ? 'Lexi sẽ mời con vào vườn từ mỗi ngày 🌱' : 'Một lời mời chơi mỗi ngày từ Lexi'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={subscribed}
                  onChange={() => (subscribed ? handleDisable() : handleEnablePush())}
                  activeColor={colors.neonTeal}
                />
              </div>

              {!subscribed && (
                <Button
                  variant="primary"
                  onClick={handleEnablePush}
                  disabled={saving}
                  className="w-full mt-4"
                  style={{ backgroundColor: colors.neonTeal, color: colors.deepSlate }}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" /> Đang bật...
                    </span>
                  ) : (
                    '🌱 Bật nhắc nhở cho con'
                  )}
                </Button>
              )}
            </ClayCard>

            <ClayCard className="p-5">
              <h2 className="font-black mb-3" style={{ color: colors.deepSlate }}>
                🕐 Giờ Lexi sẽ mời con
              </h2>
              <div className="flex flex-wrap gap-2">
                {[7, 12, 17, 19, 20].map((hour) => {
                  const active = prefs.preferred_hour === hour;
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleHourChange(hour)}
                      aria-pressed={active}
                      className="rounded-2xl px-4 py-3 font-bold cursor-pointer transition-colors duration-200"
                      style={{
                        backgroundColor: active ? withOpacity(colors.skyBlue, 0.35) : withOpacity(colors.warmWhite, 0.9),
                        color: colors.deepSlate,
                        boxShadow: active ? shadows.claySm : 'none',
                      }}
                    >
                      {HOUR_ICONS[hour] ?? '⏰'} {String(hour).padStart(2, '0')}:00
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-3" style={{ color: colors.mediumGray }}>
                Từ 20:30 đến 07:30 là giờ ngủ — Lexi không gửi thông báo trong khung này.
              </p>
            </ClayCard>

            {/* Notification Preview — pet voice */}
            <ClayCard className="p-4">
              <h3 className="font-black mb-3" style={{ color: colors.deepSlate }}>
                📱 Mời từ Lexi trông như thế này
              </h3>
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: colors.warmWhite, border: `2px solid ${colors.skyBlue}` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: colors.sunshineYellow, boxShadow: shadows.claySm }}
                  >
                    🌱
                  </div>
                  <div className="flex-1">
                    <p className="font-black" style={{ color: colors.deepSlate }}>
                      Lexi có tin vui! 🌱
                    </p>
                    <p className="text-sm" style={{ color: colors.mediumGray }}>
                      Vườn từ của con có 5 hạt cần tưới nè. Vào chơi cùng Lexi nhé?
                    </p>
                  </div>
                </div>
              </div>
            </ClayCard>
          </>
        )}

        {status && (
          <div
            className="rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{ backgroundColor: withOpacity(colors.mintGreen, 0.3), color: colors.deepSlate }}
            role="status"
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

function reasonText(reason?: string): string {
  switch (reason) {
    case 'needs-home-screen-install':
      return 'iPhone cần cài EduAR lên Màn hình chính trước đã!';
    case 'permission-denied':
      return 'Quyền thông báo chưa được cho. Vào Cài đặt → EduAR để bật lại nhé';
    case 'server-not-configured':
      return 'Máy chủ chưa sẵn sàng gửi thông báo — thử lại sau nhé';
    case 'unsupported':
      return 'Thiết bị chưa hỗ trợ thông báo';
    default:
      return 'Bật chưa thành công, thử lại nhé';
  }
}

export default NotificationSettingsPage;
