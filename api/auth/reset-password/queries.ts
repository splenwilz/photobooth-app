import { createMutationHook } from "@/api/utils/query-helpers";
import { resetPassword } from "./services";
import type { ResetPasswordRequest, ResetPasswordResponse } from "./types";

export const useResetPassword = createMutationHook<
	ResetPasswordRequest,
	ResetPasswordResponse
>(resetPassword);
