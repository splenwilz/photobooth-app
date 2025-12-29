/**
 * Onboarding Screen
 * 
 * Welcome screens for first-time users introducing app features.
 * Uses swipeable pages with illustrations, titles, and descriptions.
 * 
 * Features:
 * - Multiple onboarding slides
 * - Skip button
 * - Progress indicators
 * - Get Started button on last slide
 * 
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/auth/primary-button';
import { Spacing, BorderRadius, BRAND_COLOR, withAlpha } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Onboarding slide data
 */
interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'photo.stack',
    title: 'Monitor Your Fleet',
    description: 'Keep track of all your photobooths from one central dashboard. See real-time status, location, and performance at a glance.',
  },
  {
    id: '2',
    icon: 'chart.bar',
    title: 'Track Revenue',
    description: 'Get detailed insights into your earnings. View daily, weekly, monthly, and yearly revenue with trend analysis.',
  },
  {
    id: '3',
    icon: 'printer',
    title: 'Hardware Health',
    description: 'Monitor camera, printer, and payment systems. Get alerts when supplies run low or issues arise.',
  },
  {
    id: '4',
    icon: 'bell',
    title: 'Stay Informed',
    description: 'Receive instant notifications for critical issues, warnings, and sales milestones. Never miss an important update.',
  },
  {
    id: '5',
    icon: 'gear',
    title: 'Remote Control',
    description: 'Adjust settings, pricing, and credits remotely. Manage your entire operation from your phone.',
  },
];

export default function OnboardingScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'card');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  // Handle scroll end to update current index
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  // Skip to auth
  const handleSkip = () => {
    router.replace('/auth/signin');
  };

  // Go to next slide or finish
  const handleNext = () => {
    if (isLastSlide) {
      router.replace('/auth/signup');
    } else {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  // Go to specific slide
  const goToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header with Skip button */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoIcon, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
            <IconSymbol name="photo.stack" size={24} color={BRAND_COLOR} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.logoText}>
            PhotoBoothX
          </ThemedText>
        </View>
        
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip}>
            <ThemedText style={[styles.skipText, { color: textSecondary }]}>
              Skip
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slidesContainer}
      >
        {ONBOARDING_SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Illustration */}
            <View style={[styles.illustrationContainer, { backgroundColor: cardBg }]}>
              <View style={[styles.iconCircle, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
                <IconSymbol name={slide.icon as any} size={64} color={BRAND_COLOR} />
              </View>
            </View>

            {/* Content */}
            <View style={styles.slideContent}>
              <ThemedText type="title" style={styles.slideTitle}>
                {slide.title}
              </ThemedText>
              <ThemedText style={[styles.slideDescription, { color: textSecondary }]}>
                {slide.description}
              </ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Progress Indicators */}
        <View style={styles.indicators}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToSlide(index)}
              style={[
                styles.indicator,
                { 
                  backgroundColor: index === currentIndex 
                    ? BRAND_COLOR 
                    : withAlpha(BRAND_COLOR, 0.3),
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            text={isLastSlide ? 'Get Started' : 'Next'}
            onPress={handleNext}
          />
        </View>

        {/* Sign In Link (on last slide) */}
        {isLastSlide && (
          <View style={styles.signInContainer}>
            <ThemedText style={[styles.signInText, { color: textSecondary }]}>
              Already have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={handleSkip}>
              <ThemedText style={[styles.signInLink, { color: BRAND_COLOR }]}>
                Sign In
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  logoText: {
    fontSize: 18,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  slidesContainer: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.md,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  slideDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    marginBottom: Spacing.md,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

