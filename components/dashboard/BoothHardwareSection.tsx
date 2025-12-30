/**
 * BoothHardwareSection Component
 *
 * Displays detailed hardware status for a single booth.
 * Shows camera, printer, and payment controller with status indicators.
 *
 * Used in Dashboard when viewing a specific booth.
 *
 * @see app/(tabs)/index.tsx - Dashboard screen
 * @see components/ui/status-card.tsx - StatusCard component
 */

import React from "react";
import type { BoothHardware } from "@/api/booths/types";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { StatusCard } from "@/components/ui/status-card";
import { StatusColors } from "@/constants/theme";
import {
	getCameraStatusColor,
	getPaymentControllerStatusColor,
	getPrinterStatusColor,
	mapCameraStatus,
	mapPaymentControllerStatus,
	mapPrinterStatus,
} from "@/utils";

interface BoothHardwareSectionProps {
	/** Hardware data from booth detail API */
	hardware: BoothHardware;
}

/**
 * BoothHardwareSection - Detailed hardware status for a single booth
 *
 * Displays:
 * - Camera: Status, model, capture count
 * - Printer: Status, model, paper/ink levels, prints remaining
 * - Payment Controller: Status, payment methods, transactions today
 *
 * Each component shows "Not connected" if the hardware is null.
 */
export function BoothHardwareSection({ hardware }: BoothHardwareSectionProps) {
	return (
		<>
			{/* Camera Status */}
			{hardware?.camera ? (
				<StatusCard
					title="Camera"
					status={mapCameraStatus(hardware.camera.status)}
					subtitle={
						hardware.camera.model ?? hardware.camera.name ?? "Unknown"
					}
					infoText={
						hardware.camera.error ??
						`${hardware.camera.total_captures?.toLocaleString() ?? 0} total captures`
					}
					icon={
						<IconSymbol
							name="camera"
							size={20}
							color={getCameraStatusColor(hardware.camera.status)}
						/>
					}
				/>
			) : (
				<StatusCard
					title="Camera"
					status="unknown"
					subtitle="Not connected"
					infoText="No camera data available"
					icon={<IconSymbol name="camera" size={20} color={StatusColors.neutral} />}
				/>
			)}

			{/* Printer Status with supply levels */}
			{hardware?.printer ? (
				<StatusCard
					title="Printer"
					status={mapPrinterStatus(hardware.printer.status)}
					subtitle={
						hardware.printer.model ?? hardware.printer.name ?? "Unknown"
					}
					progress={hardware.printer.paper_percent ?? undefined}
					progressLabel="Paper"
					secondaryProgress={hardware.printer.ink_percent ?? undefined}
					secondaryProgressLabel="Ink"
					infoText={
						hardware.printer.error ??
						`~${hardware.printer.prints_remaining ?? 0} prints remaining`
					}
					icon={
						<IconSymbol
							name="printer"
							size={20}
							color={getPrinterStatusColor(hardware.printer.status)}
						/>
					}
				/>
			) : (
				<StatusCard
					title="Printer"
					status="unknown"
					subtitle="Not connected"
					infoText="No printer data available"
					icon={<IconSymbol name="printer" size={20} color={StatusColors.neutral} />}
				/>
			)}

			{/* Payment Controller Status */}
			{hardware?.payment_controller ? (
				<StatusCard
					title="Payment Controller"
					status={mapPaymentControllerStatus(hardware.payment_controller.status)}
					subtitle={hardware.payment_controller.payment_methods}
					infoText={
						hardware.payment_controller.error ??
						`${hardware.payment_controller.transactions_today ?? 0} transactions today`
					}
					icon={
						<IconSymbol
							name="creditcard"
							size={20}
							color={getPaymentControllerStatusColor(hardware.payment_controller.status)}
						/>
					}
				/>
			) : (
				<StatusCard
					title="Payment Controller"
					status="unknown"
					subtitle="Not connected"
					infoText="No payment controller data available"
					icon={<IconSymbol name="creditcard" size={20} color={StatusColors.neutral} />}
				/>
			)}
		</>
	);
}

