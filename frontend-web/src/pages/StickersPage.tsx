/**
 * StickersPage.tsx — Sticker Collection Gallery
 *
 * Duolingo-inspired sticker collection with:
 * - Full sticker catalog display with rarity effects
 * - Manual collect button (user decision: Q1)
 * - Collected/uncollected states
 * - Rarity sparkle CSS effects
 */

import { useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';

interface StickerCatalogItem {
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageUrl: string;
}

interface UserSticker {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string;
  collectedAt?: string;
}

const RARITY_CONFIG = {
  common: {
    bgColor: 'bg-gradient-to-br from-amber-100 to-yellow-200',
    borderColor: 'border-amber-400',
    sparkleColor: 'text-yellow-400',
    badgeColor: 'bg-amber-300',
    badgeText: 'text-amber-800',
    emoji: '⭐',
    chance: '30%',
  },
  rare: {
    bgColor: 'bg-gradient-to-br from-blue-100 to-cyan-200',
    borderColor: 'border-blue-400',
    sparkleColor: 'text-blue-400',
    badgeColor: 'bg-blue-300',
    badgeText: 'text-blue-800',
    emoji: '💎',
    chance: '15%',
  },
  epic: {
    bgColor: 'bg-gradient-to-br from-purple-100 to-pink-200',
    borderColor: 'border-purple-400',
    sparkleColor: 'text-purple-400',
    badgeColor: 'bg-purple-300',
    badgeText: 'text-purple-800',
    emoji: '🌟',
    chance: '8%',
  },
  legendary: {
    bgColor: 'bg-gradient-to-br from-orange-100 to-red-200',
    borderColor: 'border-orange-400',
    sparkleColor: 'text-orange-400',
    badgeColor: 'bg-orange-300',
    badgeText: 'text-orange-800',
    emoji: '👑',
    chance: '3%',
  },
};

// Fallback emoji for missing images
const STICKER_EMOJI_MAP: Record<string, string> = {
  star_gold: '⭐',
  trophy_bronze: '🏅',
  animal_elephant: '🐘',
  heart_pink: '❤️',
  book_blue: '📘',
  star_rainbow: '🌈',
  animal_lion: '🦁',
  rocket: '🚀',
  medal_silver: '🥈',
  trophy_gold: '🏆',
  diamond: '💎',
  unicorn: '🦄',
  crown: '👑',
  dragon: '🐉',
  phoenix: '🔥',
};

function getStickerEmoji(stickerId: string): string {
  return STICKER_EMOJI_MAP[stickerId] || '✨';
}

// Sparkle effect component
function SparkleEffect({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-sparkle"
          style={{
            left: `${15 + (i * 14)}%`,
            top: `${10 + ((i % 3) * 30)}%`,
            animationDelay: `${i * 0.2}s`,
            color,
          }}
        >
          ✦
        </div>
      ))}
    </div>
  );
}

// Sticker card component
function StickerCard({
  stickerId,
  sticker,
  isCollected,
  onCollect,
  isLoading,
}: {
  stickerId: string;
  sticker: StickerCatalogItem;
  isCollected: boolean;
  onCollect: () => void;
  isLoading: boolean;
}) {
  const config = RARITY_CONFIG[sticker.rarity];

  return (
    <div
      className={`relative ${config.bgColor} rounded-2xl p-4 border-2 ${config.borderColor} transition-all duration-300 ${
        isCollected ? 'shadow-lg' : 'opacity-70 hover:opacity-90'
      }`}
    >
      {/* Sparkle effect for higher rarities */}
      {sticker.rarity !== 'common' && <SparkleEffect color={config.sparkleColor} />}

      {/* Sticker image/emoji */}
      <div className="relative z-10 flex h-20 items-center justify-center">
        {isCollected ? (
          <div className="text-6xl">{getStickerEmoji(stickerId)}</div>
        ) : (
          <div className="text-4xl opacity-50 grayscale">{getStickerEmoji(stickerId)}</div>
        )}
      </div>

      {/* Sticker name */}
      <div className="relative z-10 mt-2 text-center">
        <p className="text-sm font-bold text-gray-800">{sticker.name}</p>
      </div>

      {/* Rarity badge */}
      <div className="relative z-10 mt-2 flex justify-center">
        <span className={`${config.badgeColor} ${config.badgeText} rounded-full px-2 py-0.5 text-xs font-bold capitalize`}>
          {sticker.rarity}
        </span>
      </div>

      {/* Collect button */}
      {isCollected ? (
        <div className="relative z-10 mt-3 flex items-center justify-center gap-1 text-green-600">
          <span className="text-lg">✓</span>
          <span className="text-xs font-bold">Collected</span>
        </div>
      ) : (
        <button
          onClick={onCollect}
          disabled={isLoading}
          className="relative z-10 mt-3 w-full rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-white hover:shadow-md disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-block animate-spin">⏳</span>
          ) : (
            'Collect'
          )}
        </button>
      )}
    </div>
  );
}

// Stats card component
function StatCard({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
  return (
    <div className="clay-stat-card">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="clay-stat-number" style={{ background: `linear-gradient(135deg, ${color}, #FF9F9F)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {value}
      </div>
      <div className="clay-stat-label">{label}</div>
    </div>
  );
}

// Main page component
export default function StickersPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;

  const [catalog, setCatalog] = useState<Record<string, StickerCatalogItem>>({});
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);

  // Load catalog and user stickers
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load catalog (public, no auth needed)
        const catalogData = await apiClient.getStickerCatalog();
        setCatalog(catalogData);

        // Load user's collected stickers
        const userStickers = await apiClient.getStickers(userId);
        const collected = new Set<string>();
        if (Array.isArray(userStickers)) {
          userStickers.forEach((s: UserSticker) => collected.add(s.id));
        }
        setCollectedIds(collected);
      } catch (error) {
        console.error('Failed to load sticker data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // Handle sticker collection
  const handleCollect = async (stickerId: string) => {
    if (!userId) return;

    try {
      setCollectingId(stickerId);
      HapticService.success();
      SoundEffectService.play('success');

      const result = await apiClient.collectSticker(userId, stickerId);

      if (result.success) {
        setCollectedIds(prev => new Set([...prev, stickerId]));
        setNotification({
          type: 'success',
          message: `You collected ${catalog[stickerId]?.name || 'sticker'}! +${result.xp_earned || 0} XP`,
        });

        // Award XP to pet if applicable
        if (result.xp_earned) {
          try {
            await apiClient.feedPet(userId); // Just to update pet stats
          } catch {
            // Pet update is optional
          }
        }
      } else if (result.collected === false) {
        setNotification({
          type: 'error',
          message: 'Already in your collection!',
        });
      }
    } catch (error) {
      console.error('Failed to collect sticker:', error);
      setNotification({
        type: 'error',
        message: 'Could not collect sticker. Try again!',
      });
    } finally {
      setCollectingId(null);
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Filter stickers by rarity
  const filteredStickers = useMemo(() => {
    const entries = Object.entries(catalog);
    if (!filterRarity) return entries;
    return entries.filter(([, sticker]) => sticker.rarity === filterRarity);
  }, [catalog, filterRarity]);

  // Group by rarity for display
  const stickersByRarity = useMemo(() => {
    const grouped: Record<string, [string, StickerCatalogItem][]> = {
      legendary: [],
      epic: [],
      rare: [],
      common: [],
    };
    filteredStickers.forEach(entry => {
      const rarity = entry[1].rarity as keyof typeof grouped;
      if (grouped[rarity]) {
        grouped[rarity].push(entry);
      }
    });
    return grouped;
  }, [filteredStickers]);

  // Stats
  const totalStickers = Object.keys(catalog).length;
  const collectedCount = collectedIds.size;
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    collectedIds.forEach(id => {
      const sticker = catalog[id];
      if (sticker) {
        counts[sticker.rarity] = (counts[sticker.rarity] || 0) + 1;
      }
    });
    return counts;
  }, [collectedIds, catalog]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden clay-bg-playful px-4 pb-28 transition-all duration-300 md:pb-8">
        <div className="text-center">
          <div className="text-6xl mb-4 clay-float-element">✨</div>
          <p className="font-bold text-gray-600">Loading your stickers...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden clay-bg-playful p-4 pb-28 transition-all duration-300 sm:p-6 md:pb-8">
        <div className="clay-card-elevated max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="clay-section-title mb-4">Sign In to Collect Stickers!</h2>
          <p className="text-gray-600 mb-6">
            Create an account to start collecting amazing stickers and track your learning journey!
          </p>
          <button className="clay-cta-primary w-full">
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+13rem)] transition-all duration-300 md:pb-8">
      {/* Decorative Background */}
      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block">
        <div className="clay-shape-circle w-96 h-96 -top-48 -right-48 opacity-30" />
        <div className="clay-shape-circle w-64 h-64 bottom-0 left-0 opacity-25" />
      </div>

      {/* Notification toast */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-6 py-3 shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-800 border-2 border-green-400'
              : 'bg-red-100 text-red-800 border-2 border-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{notification.type === 'success' ? '🎉' : '⚠️'}</span>
            <span className="font-bold">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        {/* Header */}
        <header className="mb-6 text-center sm:mb-8">
          <h1 className="mb-2 text-3xl font-black leading-tight text-gray-800 sm:text-4xl md:text-5xl" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
            My Sticker Collection
          </h1>
          <p className="font-semibold text-gray-600">
            {collectedCount} of {totalStickers} stickers collected
          </p>
        </header>

        {/* Stats Row */}
        <div className="mb-6 grid min-w-0 grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-4 sm:gap-4">
          <StatCard icon="✨" value={collectedCount} label="Total Collected" color="#FFD700" />
          <StatCard icon={RARITY_CONFIG.common.emoji} value={rarityCounts.common || 0} label="Common" color="#F59E0B" />
          <StatCard icon={RARITY_CONFIG.rare.emoji} value={rarityCounts.rare || 0} label="Rare" color="#3B82F6" />
          <StatCard icon={RARITY_CONFIG.epic.emoji} value={(rarityCounts.epic || 0) + (rarityCounts.legendary || 0)} label="Epic/Legendary" color="#A855F7" />
        </div>

        {/* Filter buttons */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setFilterRarity(null)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
              !filterRarity ? 'bg-white shadow-md text-gray-800' : 'bg-white/50 text-gray-600 hover:bg-white/80'
            }`}
          >
            All ({totalStickers})
          </button>
          {Object.entries(RARITY_CONFIG).map(([rarity, config]) => (
            <button
              key={rarity}
              onClick={() => setFilterRarity(rarity === filterRarity ? null : rarity)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                filterRarity === rarity
                  ? `${config.bgColor} shadow-md text-gray-800`
                  : 'bg-white/50 text-gray-600 hover:bg-white/80'
              }`}
            >
              {config.emoji} {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/50" />
            ))}
          </div>
        ) : (
          <>
            {/* Sticker sections by rarity */}
            {Object.entries(stickersByRarity).map(([rarity, stickers]) => {
              if (stickers.length === 0) return null;
              const config = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
              
              return (
                <div key={rarity} className="mb-8">
                  {/* Section header */}
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-gray-800">
                    <span className={`${config.bgColor} rounded-full p-2`}>
                      {config.emoji}
                    </span>
                    <span className="capitalize">{rarity}</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({stickers.filter(([id]) => collectedIds.has(id)).length}/{stickers.length} collected)
                    </span>
                  </h2>

                  {/* Sticker grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {stickers.map(([stickerId, sticker]) => (
                      <StickerCard
                        key={stickerId}
                        stickerId={stickerId}
                        sticker={sticker}
                        isCollected={collectedIds.has(stickerId)}
                        onCollect={() => handleCollect(stickerId)}
                        isLoading={collectingId === stickerId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {filteredStickers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="font-bold text-xl text-gray-800 mb-2">No stickers found</h3>
                <p className="text-gray-600">Try adjusting your filter to see more stickers.</p>
              </div>
            )}
          </>
        )}

        {/* CTA Section */}
        <div className="mt-10 clay-card-elevated p-5 text-center sm:mt-12 sm:p-8">
          <h2 className="text-2xl font-black text-gray-800 mb-2">Want More Stickers?</h2>
          <p className="text-gray-600 mb-6">Complete lessons and earn XP to unlock new stickers!</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <button
              className="clay-cta-primary"
              onClick={() => window.location.href = '/courses'}
            >
              Start Learning
            </button>
            <button
              className="clay-cta-secondary"
              onClick={() => window.location.href = '/progress'}
            >
              View Progress
            </button>
          </div>
        </div>
      </div>

      {/* CSS for sparkle animation */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        .animate-sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
