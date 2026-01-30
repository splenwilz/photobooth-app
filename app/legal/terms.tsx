/**
 * Terms of Service Screen
 *
 * Displays the Terms of Service for PhotoBoothX.
 * Professional legal document covering usage, liability, and user obligations.
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import { CustomHeader } from "@/components/custom-header";
import { ThemedText } from "@/components/themed-text";
import { BorderRadius, BRAND_COLOR, Spacing } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LAST_UPDATED = "December 30, 2025";
const COMPANY_NAME = "PhotoBoothX Inc.";
const APP_NAME = "PhotoBoothX";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.sectionContent, { color: textSecondary }]}>
        {children}
      </ThemedText>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top"]}
    >
      <CustomHeader
        title="Terms of Service"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Last Updated */}
        <View
          style={[styles.lastUpdated, { backgroundColor: cardBg, borderColor }]}
        >
          <ThemedText style={[styles.lastUpdatedText, { color: textSecondary }]}>
            Last Updated: {LAST_UPDATED}
          </ThemedText>
        </View>

        {/* Introduction */}
        <ThemedText style={[styles.intro, { color: textSecondary }]}>
          Welcome to {APP_NAME}. By accessing or using our mobile application
          and services, you agree to be bound by these Terms of Service. Please
          read them carefully before using the Service.
        </ThemedText>

        <Section title="1. Acceptance of Terms">
          By downloading, installing, or using the {APP_NAME} application
          ({'"'}App{'"'}), you agree to these Terms of Service ({'"'}Terms{'"'}) and our Privacy
          Policy. If you do not agree to these Terms, you may not use the App.
          {"\n\n"}
          These Terms constitute a legally binding agreement between you and{" "}
          {COMPANY_NAME} ({'"'}Company,{'"'} {'"'}we,{'"'} {'"'}us,{'"'} or {'"'}our{'"'}) governing your use of
          the App and related services.
        </Section>

        <Section title="2. Description of Service">
          {APP_NAME} is a photo booth management platform that enables users to:
          {"\n\n"}• Monitor and manage photo booth hardware remotely
          {"\n"}• Track revenue, transactions, and analytics
          {"\n"}• Manage credits and payment processing
          {"\n"}• Configure product pricing and booth settings
          {"\n"}• Receive alerts and notifications about booth status
          {"\n"}• Execute remote commands (restart, sync, etc.)
          {"\n\n"}
          The Service is intended for business operators managing photo booth
          equipment and is not intended for consumer photo-taking purposes.
        </Section>

        <Section title="3. Account Registration">
          To use {APP_NAME}, you must create an account by providing accurate and
          complete information. You are responsible for:
          {"\n\n"}• Maintaining the confidentiality of your account credentials
          {"\n"}• All activities that occur under your account
          {"\n"}• Notifying us immediately of any unauthorized access
          {"\n"}• Ensuring your contact information remains current
          {"\n\n"}
          We reserve the right to suspend or terminate accounts that violate
          these Terms or engage in fraudulent activity.
        </Section>

        <Section title="4. Subscription and Payments">
          Certain features of {APP_NAME} may require a paid subscription. By
          subscribing, you agree to:
          {"\n\n"}• Pay all applicable fees as described at the time of purchase
          {"\n"}• Automatic renewal unless cancelled before the renewal date
          {"\n"}• Our right to modify pricing with 30 days notice
          {"\n\n"}
          Credits purchased through the App are non-refundable and may only be
          used within the {APP_NAME} ecosystem. All transactions are final unless
          otherwise required by law.
        </Section>

        <Section title="5. Acceptable Use">
          You agree NOT to use the Service to:
          {"\n\n"}• Violate any applicable laws or regulations
          {"\n"}• Infringe on intellectual property rights
          {"\n"}• Transmit malicious code or interfere with the Service
          {"\n"}• Attempt unauthorized access to our systems
          {"\n"}• Collect user data without proper consent
          {"\n"}• Use the Service for any illegal or harmful purpose
          {"\n"}• Resell or redistribute the Service without authorization
        </Section>

        <Section title="6. Hardware and Third-Party Services">
          {APP_NAME} integrates with photo booth hardware and payment processing
          systems. We are not responsible for:
          {"\n\n"}• Hardware malfunctions or failures
          {"\n"}• Third-party payment processor issues
          {"\n"}• Internet connectivity problems
          {"\n"}• Physical damage to equipment
          {"\n\n"}
          You are solely responsible for maintaining and securing your photo
          booth hardware and ensuring compliance with local regulations.
        </Section>

        <Section title="7. Data and Analytics">
          The App collects and displays data about your photo booth operations
          including:
          {"\n\n"}• Transaction history and revenue metrics
          {"\n"}• Hardware status and performance data
          {"\n"}• Customer usage patterns and analytics
          {"\n\n"}
          You retain ownership of your business data. We use aggregated,
          anonymized data to improve our services. See our Privacy Policy for
          details on data handling.
        </Section>

        <Section title="8. Intellectual Property">
          The {APP_NAME} application, including all content, features, and
          functionality, is owned by {COMPANY_NAME} and protected by copyright,
          trademark, and other intellectual property laws.
          {"\n\n"}
          You are granted a limited, non-exclusive, non-transferable license to
          use the App for its intended purpose. You may not copy, modify,
          distribute, or create derivative works without our written consent.
        </Section>

        <Section title="9. Disclaimer of Warranties">
          THE SERVICE IS PROVIDED {'"'}AS IS{'"'} AND {'"'}AS AVAILABLE{'"'} WITHOUT WARRANTIES
          OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
          {"\n\n"}• The Service will be uninterrupted or error-free
          {"\n"}• Defects will be corrected
          {"\n"}• The Service is free of viruses or harmful components
          {"\n"}• Results from using the Service will be accurate
        </Section>

        <Section title="10. Limitation of Liability">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY_NAME.toUpperCase()}{" "}
          SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:
          {"\n\n"}• Loss of profits or revenue
          {"\n"}• Loss of data or business interruption
          {"\n"}• Equipment damage or malfunction
          {"\n"}• Third-party claims
          {"\n\n"}
          Our total liability shall not exceed the amount you paid for the
          Service in the twelve (12) months preceding the claim.
        </Section>

        <Section title="11. Indemnification">
          You agree to indemnify and hold harmless {COMPANY_NAME}, its officers,
          directors, employees, and agents from any claims, damages, losses, or
          expenses arising from:
          {"\n\n"}• Your use of the Service
          {"\n"}• Your violation of these Terms
          {"\n"}• Your violation of any third-party rights
          {"\n"}• Your photo booth operations
        </Section>

        <Section title="12. Termination">
          We may suspend or terminate your access to the Service at any time for
          violation of these Terms or for any other reason at our discretion.
          Upon termination:
          {"\n\n"}• Your right to use the Service ceases immediately
          {"\n"}• We may delete your account and data
          {"\n"}• Provisions that should survive will remain in effect
        </Section>

        <Section title="13. Modifications to Terms">
          We reserve the right to modify these Terms at any time. We will notify
          you of material changes via email or in-app notification. Continued
          use of the Service after changes constitutes acceptance of the
          modified Terms.
        </Section>

        <Section title="14. Governing Law">
          These Terms shall be governed by and construed in accordance with the
          laws of the State of Delaware, United States, without regard to its
          conflict of law provisions. Any disputes shall be resolved in the
          courts located in Delaware.
        </Section>

        <Section title="15. Contact Information">
          For questions about these Terms of Service, please contact us at:
          {"\n\n"}
          {COMPANY_NAME}
          {"\n"}Email: legal@photoboothx.com
          {"\n"}Support: support@photoboothx.com
        </Section>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: textSecondary }]}>
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </ThemedText>
        </View>
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
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  lastUpdated: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  lastUpdatedText: {
    fontSize: 13,
    textAlign: "center",
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.sm,
    color: BRAND_COLOR,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150,150,150,0.3)",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
  },
});

