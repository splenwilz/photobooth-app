/**
 * Account deletion contract — Apple Guideline 5.1.1(v)
 *
 * Apps that support account creation must offer in-app account deletion
 * (not just sign-out). Verifies the client service hits
 * DELETE /api/v1/users/{user_id} and tears down the local session ONLY on
 * success, and that the mutation hook is exported from the users surface.
 */
jest.mock("@/api/client", () => ({
	apiClient: jest.fn(),
	clearTokens: jest.fn(),
	clearPendingResetData: jest.fn(),
	clearQueryCache: jest.fn(),
}));

import {
	apiClient,
	clearPendingResetData,
	clearQueryCache,
	clearTokens,
} from "@/api/client";
import * as users from "@/api/users";
import { deleteAccount } from "@/api/users/services";

const mockApiClient = apiClient as jest.Mock;

describe("api/users — account deletion (Apple 5.1.1(v))", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("deleteAccount service", () => {
		it("calls DELETE /api/v1/users/{user_id}", async () => {
			mockApiClient.mockResolvedValue({ message: "Account deleted" });
			await deleteAccount("user-123");
			expect(mockApiClient).toHaveBeenCalledWith("/api/v1/users/user-123", {
				method: "DELETE",
			});
		});

		it("clears tokens, reset data, and query cache on success", async () => {
			mockApiClient.mockResolvedValue({ message: "Account deleted" });
			await deleteAccount("user-123");
			expect(clearTokens).toHaveBeenCalledTimes(1);
			expect(clearPendingResetData).toHaveBeenCalledTimes(1);
			expect(clearQueryCache).toHaveBeenCalledTimes(1);
		});

		it("tears down the local session only AFTER the server confirms deletion", async () => {
			// Lock the ordering: a refactor that cleared tokens before awaiting the
			// DELETE would still pass the success/failure tests but would log the
			// user out (losing their session) even when deletion failed.
			const callOrder: string[] = [];
			mockApiClient.mockImplementation(async () => {
				callOrder.push("apiClient");
				return { message: "Account deleted" };
			});
			(clearTokens as jest.Mock).mockImplementation(async () => {
				callOrder.push("clearTokens");
			});
			(clearPendingResetData as jest.Mock).mockImplementation(async () => {
				callOrder.push("clearPendingResetData");
			});
			(clearQueryCache as jest.Mock).mockImplementation(() => {
				callOrder.push("clearQueryCache");
			});

			await deleteAccount("user-123");

			expect(callOrder).toEqual([
				"apiClient",
				"clearTokens",
				"clearPendingResetData",
				"clearQueryCache",
			]);
		});

		it("does NOT clear the local session if the server deletion fails", async () => {
			mockApiClient.mockRejectedValue(new Error("500"));
			await expect(deleteAccount("user-123")).rejects.toThrow();
			expect(clearTokens).not.toHaveBeenCalled();
			expect(clearQueryCache).not.toHaveBeenCalled();
		});
	});

	describe("public surface", () => {
		it("exports the deleteAccount service", () => {
			expect(typeof (users as Record<string, unknown>).deleteAccount).toBe(
				"function",
			);
		});

		it("exports the useDeleteAccount hook", () => {
			expect(
				typeof (users as Record<string, unknown>).useDeleteAccount,
			).toBe("function");
		});
	});
});
