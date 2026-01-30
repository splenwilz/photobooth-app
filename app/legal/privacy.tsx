/**
 * Privacy Policy Screen
 *
 * Displays the Privacy Policy for PhotoBoothX.
 * GDPR and CCPA compliant privacy document.
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import { CustomHeader } from "@/components/custom-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  BRAND_COLOR,
  Spacing,
  withAlpha,
} from "@/constants/theme";
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

interface DataItemProps {
  icon: string;
  title: string;
  description: string;
}

function DataItem({ icon, title, description }: DataItemProps) {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={[styles.dataItem, { backgroundColor: cardBg, borderColor }]}>
      <View
        style={[
          styles.dataIcon,
          { backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
        ]}
      >
        <IconSymbol name={icon as any} size={20} color={BRAND_COLOR} />
      </View>
      <View style={styles.dataContent}>
        <ThemedText type="defaultSemiBold" style={styles.dataTitle}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.dataDescription, { color: textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
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
        title="Privacy Policy"
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
          At {COMPANY_NAME}, we take your privacy seriously. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information
          when you use our {APP_NAME} mobile application and related services.
        </ThemedText>

        <Section title="1. Information We Collect">
          We collect information you provide directly and data generated through
          your use of the Service:
        </Section>

        {/* Data Categories */}
        <View style={styles.dataList}>
          <DataItem
            icon="person.fill"
            title="Account Information"
            description="Name, email address, password, and profile information you provide during registration."
          />
          <DataItem
            icon="building.2.fill"
            title="Business Information"
            description="Photo booth names, locations, addresses, and operational settings."
          />
          <DataItem
            icon="creditcard.fill"
            title="Transaction Data"
            description="Payment records, revenue data, credits, and financial transactions processed through your booths."
          />
          <DataItem
            icon="chart.bar.fill"
            title="Analytics Data"
            description="Booth performance metrics, usage statistics, customer patterns, and operational insights."
          />
          <DataItem
            icon="gear"
            title="Device Information"
            description="Booth hardware status, system information, IP addresses, and connection data."
          />
          <DataItem
            icon="bell.fill"
            title="Communication Data"
            description="Alerts, notifications, support requests, and correspondence with our team."
          />
        </View>

        <Section title="2. How We Use Your Information">
          We use the collected information for:
          {"\n\n"}• Providing and maintaining the {APP_NAME} service
          {"\n"}• Processing transactions and managing your account
          {"\n"}• Sending alerts and notifications about your booths
          {"\n"}• Generating analytics and performance reports
          {"\n"}• Improving our services and developing new features
          {"\n"}• Communicating updates, security alerts, and support
          {"\n"}• Ensuring compliance with legal obligations
          {"\n"}• Detecting and preventing fraud or abuse
        </Section>

        <Section title="3. Data Sharing and Disclosure">
          We may share your information with:
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Service Providers:</ThemedText>
          {" "}Third-party vendors who assist in operating our service (payment
          processors, cloud hosting, analytics).
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Legal Requirements:</ThemedText>
          {" "}When required by law, court order, or to protect our rights and
          safety.
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Business Transfers:</ThemedText>
          {" "}In connection with a merger, acquisition, or sale of assets.
          {"\n\n"}
          We do NOT sell your personal information to third parties for
          marketing purposes.
        </Section>

        <Section title="4. Data Security">
          We implement industry-standard security measures to protect your data:
          {"\n\n"}• End-to-end encryption for data in transit (TLS/SSL)
          {"\n"}• Encrypted storage for sensitive data at rest
          {"\n"}• Secure authentication with token-based sessions
          {"\n"}• Regular security audits and vulnerability assessments
          {"\n"}• Access controls and employee training
          {"\n\n"}
          While we strive to protect your information, no method of transmission
          over the Internet is 100% secure. We cannot guarantee absolute
          security.
        </Section>

        <Section title="5. Data Retention">
          We retain your data for as long as your account is active or as needed
          to provide services. Specifically:
          {"\n\n"}• Account data: Until account deletion + 30 days
          {"\n"}• Transaction records: 7 years (legal/tax requirements)
          {"\n"}• Analytics data: 3 years from collection
          {"\n"}• Booth logs: 1 year from generation
          {"\n\n"}
          You may request deletion of your data at any time, subject to legal
          retention requirements.
        </Section>

        <Section title="6. Your Privacy Rights">
          Depending on your location, you may have the following rights:
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Access:</ThemedText>
          {" "}Request a copy of your personal data.
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Correction:</ThemedText>
          {" "}Request correction of inaccurate data.
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Deletion:</ThemedText>
          {" "}Request deletion of your personal data.
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Portability:</ThemedText>
          {" "}Receive your data in a portable format.
          {"\n\n"}
          <ThemedText type="defaultSemiBold">Opt-Out:</ThemedText>
          {" "}Opt out of certain data processing activities.
          {"\n\n"}
          To exercise these rights, contact us at privacy@photoboothx.com.
        </Section>

        <Section title="7. GDPR Compliance (EU Users)">
          For users in the European Economic Area, we process data under the
          following legal bases:
          {"\n\n"}• Contract performance (providing services you requested)
          {"\n"}• Legitimate interests (improving services, security)
          {"\n"}• Legal obligations (tax, compliance requirements)
          {"\n"}• Consent (where explicitly provided)
          {"\n\n"}
          You have the right to lodge a complaint with your local data protection
          authority.
        </Section>

        <Section title="8. CCPA Compliance (California Users)">
          California residents have additional rights under CCPA:
          {"\n\n"}• Right to know what personal information we collect
          {"\n"}• Right to delete personal information
          {"\n"}• Right to opt-out of sale (we do not sell data)
          {"\n"}• Right to non-discrimination for exercising rights
          {"\n\n"}
          To submit a verifiable consumer request, email privacy@photoboothx.com.
        </Section>

        <Section title="9. Third-Party Services">
          Our app may integrate with third-party services:
          {"\n\n"}• Authentication: Google Sign-In, Apple Sign-In
          {"\n"}• Payment Processing: Stripe, Square
          {"\n"}• Analytics: Google Analytics, Mixpanel
          {"\n"}• Cloud Services: AWS, Google Cloud
          {"\n\n"}
          These services have their own privacy policies. We encourage you to
          review them.
        </Section>

        <Section title="10. Children's Privacy">
          {APP_NAME} is not intended for users under 18 years of age. We do not
          knowingly collect personal information from children. If we discover
          we have collected information from a child, we will delete it
          immediately.
        </Section>

        <Section title="11. International Data Transfers">
          Your data may be transferred to and processed in countries other than
          your residence. We ensure adequate safeguards are in place through:
          {"\n\n"}• Standard contractual clauses (SCCs)
          {"\n"}• Privacy Shield certification (where applicable)
          {"\n"}• Data processing agreements with sub-processors
        </Section>

        <Section title="12. Cookies and Tracking">
          Our mobile app uses:
          {"\n\n"}• Local storage for authentication tokens
          {"\n"}• Analytics SDKs for usage tracking
          {"\n"}• Push notification tokens for alerts
          {"\n\n"}
          You can manage these through your device settings.
        </Section>

        <Section title="13. Changes to This Policy">
          We may update this Privacy Policy periodically. We will notify you of
          material changes via:
          {"\n\n"}• Email notification
          {"\n"}• In-app notification
          {"\n"}• Updated {'"'}Last Updated{'"'} date
          {"\n\n"}
          Continued use after changes constitutes acceptance of the updated
          policy.
        </Section>

        <Section title="14. Contact Us">
          For privacy-related inquiries or to exercise your rights:
          {"\n\n"}
          {COMPANY_NAME}
          {"\n"}Privacy Officer
          {"\n"}Email: privacy@photoboothx.com
          {"\n"}Support: support@photoboothx.com
          {"\n\n"}
          We aim to respond to all requests within 30 days.
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
  dataList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dataItem: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  dataIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  dataContent: {
    flex: 1,
  },
  dataTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  dataDescription: {
    fontSize: 13,
    lineHeight: 18,
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

