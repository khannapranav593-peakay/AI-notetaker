import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

interface AudioWaveformProps {
  isActive: boolean;
  meteringLevel: number; // 0..1
  barCount?: number;
  height?: number;
}

const BAR_COUNT = 32;

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  meteringLevel,
  barCount = BAR_COUNT,
  height = 60,
}) => {
  const { theme } = useTheme();
  const bars = Array.from({ length: barCount });
  const animValues = useRef(
    bars.map(() => useSharedValue(0.1))
  ).current;

  useEffect(() => {
    if (isActive) {
      animValues.forEach((val, i) => {
        const phase = i / barCount;
        const randomness = 0.3 + Math.random() * 0.7;
        const target = Math.max(0.05, meteringLevel * randomness);
        val.value = withSpring(target, { damping: 8, stiffness: 180 });
      });
    } else {
      animValues.forEach((val) => {
        val.value = withTiming(0.05, {
          duration: 600,
          easing: Easing.out(Easing.ease),
        });
      });
    }
  }, [isActive, meteringLevel]);

  // Idle animation when not active
  useEffect(() => {
    if (!isActive) {
      animValues.forEach((val, i) => {
        const delay = i * 40;
        setTimeout(() => {
          val.value = withRepeat(
            withTiming(0.15, { duration: 800 + i * 20 }),
            -1,
            true
          );
        }, delay);
      });
    }
  }, [isActive]);

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((_, i) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const animStyle = useAnimatedStyle(() => ({
          height: `${animValues[i].value * 100}%`,
          opacity: 0.5 + animValues[i].value * 0.5,
        }));

        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              animStyle,
              {
                backgroundColor: isActive ? theme.primary : theme.textTertiary,
                width: `${(1 / barCount) * 80}%`,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 16,
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
});

export default AudioWaveform;
