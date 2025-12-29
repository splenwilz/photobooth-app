/**
 * Settings Screen
 * 
 * Booth configuration and settings management.
 * Uses cohesive brand color throughout - no random accent colors.
 * 
 * Features:
 * - Booth configuration (name, location, operation mode)
 * - Products & pricing management
 * - Credits management
 * - System actions (restart, sync, etc.)
 * 
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CustomHeader } from '@/components/custom-header';
import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BorderRadius, BRAND_COLOR, withAlpha } from '@/constants/theme';

// Demo data
import { DEMO_BOOTHS, DEMO_PRODUCTS, DEMO_CURRENT_CREDITS } from '@/constants/demo-data';

/**
 * Settings Menu Item Component
 * All items use brand color for consistency
 */
interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  showArrow?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  value,
  showArrow = true,
  showSwitch = false,
  switchValue = false,
  onSwitchChange,
  onPress,
}) => {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tint = useThemeColor({}, 'tint');

  const content = (
    <View style={[styles.settingsItem, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.settingsIconContainer, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
        <IconSymbol name={icon as any} size={20} color={BRAND_COLOR} />
      </View>
      <View style={styles.settingsContent}>
        <ThemedText type="defaultSemiBold" style={styles.settingsTitle}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={[styles.settingsSubtitle, { color: textSecondary }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: borderColor, true: BRAND_COLOR }}
          thumbColor="white"
        />
      ) : (
        <View style={styles.settingsRight}>
          {value && (
            <ThemedText style={[styles.settingsValue, { color: textSecondary }]}>
              {value}
            </ThemedText>
          )}
          {showArrow && (
            <IconSymbol name="chevron.right" size={16} color={textSecondary} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress && !showSwitch) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

/**
 * Settings Screen Component
 */
export default function SettingsScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // State for toggles
  const [billAcceptorEnabled, setBillAcceptorEnabled] = useState(true);
  const [cardReaderEnabled, setCardReaderEnabled] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [rfidEnabled, setRfidEnabled] = useState(false);

  // Current booth
  const currentBooth = DEMO_BOOTHS[0];

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <CustomHeader title="Settings" />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Booth Info */}
        <View style={styles.section}>
          <SectionHeader 
            title="Current Booth" 
            subtitle={currentBooth.name}
          />
          
          <SettingsItem
            icon="photo.stack"
            title={currentBooth.name}
            subtitle={currentBooth.location}
            value={currentBooth.operationMode === 'coin' ? 'Coin Op' : 'Free Play'}
            onPress={() => console.log('Edit booth info')}
          />
        </View>

        {/* Credits Management */}
        <View style={styles.section}>
          <SectionHeader 
            title="Credits" 
            subtitle="Manage booth credits"
          />
          
          <View style={[styles.creditsCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.creditsHeader}>
              <ThemedText style={[styles.creditsLabel, { color: textSecondary }]}>
                Current Balance
              </ThemedText>
              <ThemedText type="title" style={[styles.creditsValue, { color: BRAND_COLOR }]}>
                {DEMO_CURRENT_CREDITS.balance}
              </ThemedText>
              <ThemedText style={[styles.creditsUnit, { color: textSecondary }]}>
                credits
              </ThemedText>
            </View>
            <View style={styles.creditsActions}>
              <TouchableOpacity 
                style={[styles.creditButton, { backgroundColor: BRAND_COLOR }]}
                onPress={() => console.log('Add credits')}
              >
                <IconSymbol name="plus" size={18} color="white" />
                <ThemedText style={styles.creditButtonText}>Add Credits</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.creditButton, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}
                onPress={() => console.log('View history')}
              >
                <IconSymbol name="clock" size={18} color={BRAND_COLOR} />
                <ThemedText style={[styles.creditButtonText, { color: BRAND_COLOR }]}>History</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Products & Pricing */}
        <View style={styles.section}>
          <SectionHeader 
            title="Products & Pricing" 
            subtitle="Configure available products"
          />
          
          {DEMO_PRODUCTS.map((product) => (
            <SettingsItem
              key={product.id}
              icon="photo"
              title={product.name}
              subtitle={product.description}
              value={formatCurrency(product.basePrice)}
              onPress={() => console.log('Edit product:', product.id)}
            />
          ))}
        </View>

        {/* Payment Settings */}
        <View style={styles.section}>
          <SectionHeader 
            title="Payment Settings" 
            subtitle="Configure payment methods"
          />
          
          <SettingsItem
            icon="dollarsign.circle"
            title="Pulses Per Credit"
            value="4"
            onPress={() => console.log('Edit pulses')}
          />
          
          <SettingsItem
            icon="creditcard"
            title="Bill Acceptor"
            subtitle="Accept paper bills"
            showSwitch
            showArrow={false}
            switchValue={billAcceptorEnabled}
            onSwitchChange={setBillAcceptorEnabled}
          />
          
          <SettingsItem
            icon="creditcard"
            title="Card Reader"
            subtitle="Accept credit/debit cards"
            showSwitch
            showArrow={false}
            switchValue={cardReaderEnabled}
            onSwitchChange={setCardReaderEnabled}
          />
        </View>

        {/* Hardware Settings */}
        <View style={styles.section}>
          <SectionHeader 
            title="Hardware Settings" 
            subtitle="Camera and printer options"
          />
          
          <SettingsItem
            icon="bolt"
            title="Flash"
            subtitle="Enable camera flash"
            showSwitch
            showArrow={false}
            switchValue={flashEnabled}
            onSwitchChange={setFlashEnabled}
          />
          
          <SettingsItem
            icon="wifi"
            title="RFID Reader"
            subtitle="Enable RFID card detection"
            showSwitch
            showArrow={false}
            switchValue={rfidEnabled}
            onSwitchChange={setRfidEnabled}
          />
          
          <SettingsItem
            icon="printer"
            title="Prints Per Roll"
            value="200"
            onPress={() => console.log('Edit prints per roll')}
          />
        </View>

        {/* System Actions */}
        <View style={styles.section}>
          <SectionHeader 
            title="System Actions" 
            subtitle="Remote control options"
          />
          
          <SettingsItem
            icon="arrow.clockwise"
            title="Sync Settings"
            subtitle="Push settings to booth"
            onPress={() => console.log('Sync settings')}
          />
          
          <SettingsItem
            icon="bolt"
            title="Restart Booth"
            subtitle="Remotely restart the booth software"
            onPress={() => console.log('Restart booth')}
          />
          
          <SettingsItem
            icon="doc.text"
            title="View Logs"
            subtitle="View system and error logs"
            onPress={() => console.log('View logs')}
          />
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <SectionHeader 
            title="About" 
          />
          
          <SettingsItem
            icon="info.circle"
            title="App Version"
            value="1.0.0"
            showArrow={false}
          />
          
          <SettingsItem
            icon="doc.text"
            title="Terms of Service"
            onPress={() => console.log('Terms')}
          />
          
          <SettingsItem
            icon="doc.text"
            title="Privacy Policy"
            onPress={() => console.log('Privacy')}
          />
        </View>

        {/* Bottom spacing */}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginTop: Spacing.lg,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 14,
  },
  settingsSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingsValue: {
    fontSize: 13,
  },
  creditsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  creditsHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  creditsLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  creditsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 56,
  },
  creditsUnit: {
    fontSize: 14,
  },
  creditsActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  creditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  creditButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
