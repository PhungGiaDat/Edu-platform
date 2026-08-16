/**
 * StatsDemoCard — aggregate platform stats with animated counters.
 *
 * Shows: total students, courses, avg rating. All from real data or mock.
 * ClayCard with vibrant mintGreen accent and animated number counters.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayIcon } from './icons/ClayIcons';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';

export interface StatsDemoCardProps {
  studentsCount?: number;
  coursesCount?: number;
  avgRating?: number;
  totalXP?: number;
  compact?: boolean;
}

export const StatsDemoCard: React.FC<StatsDemoCardProps> = ({
  studentsCount = 12847,
  coursesCount = 36,
  avgRating = 4.8,
  totalXP = 0,
  compact = false,
}) => {
  return (
    <ClayCard variant="lg" color="white" padding={compact ? SPACING.md : SPACING.base}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerBadge, { backgroundColor: withOpacity(BRAND.neonTeal, 0.12) }]}>
            <Text style={styles.headerBadgeText}>NỀN TẢNG</Text>
          </View>
          <Text style={styles.headerTitle}>Học viên đang học</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatItem
            emoji="👩‍🎓"
            value={studentsCount}
            label="Học viên"
            accentColor={BRAND.vibrantOrange}
          />
          <View style={[styles.divider, { backgroundColor: withOpacity(BRAND.neonTeal, 0.2) }]} />
          <StatItem
            emoji="📚"
            value={coursesCount}
            label="Khóa học"
            accentColor={BRAND.skyBlue}
          />
          <View style={[styles.divider, { backgroundColor: withOpacity(BRAND.neonTeal, 0.2) }]} />
          <StatItem
            emoji="⭐"
            value={avgRating}
            label="Điểm TB"
            accentColor={BRAND.sunshineYellow}
            suffix="/5"
          />
        </View>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { backgroundColor: withOpacity(BRAND.neonTeal, 0.08) }]}>
          <ClayIcon name="bolt" size={14} color={BRAND.neonTeal} />
          <Text style={styles.bottomText}>
            Hơn <Text style={{ fontWeight: '800', color: BRAND.neonTeal }}>{studentsCount.toLocaleString()}</Text> bài học đã hoàn thành trên nền tảng
          </Text>
        </View>
      </View>
    </ClayCard>
  );
};

const StatItem: React.FC<{
  emoji: string;
  value: number;
  label: string;
  accentColor: string;
  prefix?: string;
  suffix?: string;
}> = ({ emoji, value, label, accentColor, prefix, suffix }) => (
  <View style={styles.statItem}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statValue, { color: accentColor }]}>
      {prefix}{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString()}{suffix}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  inner: {
    gap: SPACING.md,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  headerBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  headerBadgeText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    color: BRAND.neonTealDark,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: SPACING.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  bottomText: {
    flex: 1,
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default StatsDemoCard;
