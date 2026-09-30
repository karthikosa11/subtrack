import { useFont } from '@shopify/react-native-skia';
import { View } from 'react-native';
import { CartesianChart, HorizontalBar } from 'victory-native';

import { money } from '@/lib/format';
import { label, type CategoryStat } from '@/lib/types';
import { useTheme } from '@/theme';

const ROW_HEIGHT = 52;

/** Monthly spend per category as horizontal bars, biggest first. */
export function CategoryChart({ stats }: { stats: CategoryStat[] }) {
  const t = useTheme();
  const font = useFont(require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'), 13);
  const data = stats.map((s, i) => ({ i, amount: s.monthly_total }));
  const max = Math.max(...stats.map((s) => s.monthly_total), 1);

  return (
    <View
      style={{ height: ROW_HEIGHT * stats.length + 32 }}
      accessible
      accessibilityLabel={stats.map((s) => `${label.category(s.category)} ${money(s.monthly_total)}`).join(', ')}
    >
      <CartesianChart
        data={data}
        xKey="i"
        yKeys={['amount']}
        orientation="horizontal"
        // In horizontal mode `x` is the value axis. Leave headroom on the right
        // so the amount printed at the end of each bar fits.
        domain={{ x: [0, max * 1.35] }}
        domainPadding={{ top: ROW_HEIGHT / 2, bottom: ROW_HEIGHT / 2 }}
        xAxis={{
          font,
          tickCount: 0,
          lineColor: 'transparent',
          labelColor: t.muted,
          formatXLabel: () => '',
        }}
        yAxis={[
          {
            font,
            tickValues: data.map((d) => d.i),
            tickCount: data.length,
            lineColor: 'transparent',
            labelColor: t.ink,
            formatYLabel: (i) => label.category(stats[Number(i)]?.category ?? 'other'),
          },
        ]}
        frame={{ lineColor: 'transparent' }}
      >
        {({ points, chartBounds }) => (
          <HorizontalBar
            points={points.amount}
            chartBounds={chartBounds}
            color={t.accent}
            barWidth={18}
            labels={{ position: 'right', font, color: t.ink, formatLabel: (v) => money(Number(v ?? 0)) }}
          />
        )}
      </CartesianChart>
    </View>
  );
}
