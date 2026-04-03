import { createMutationHook } from "@/api/utils/query-helpers";
import { verifyResetCode } from "./services";
import type { VerifyResetCodeRequest, VerifyResetCodeResponse } from "./types";

export const useVerifyResetCode = createMutationHook<
	VerifyResetCodeRequest,
	VerifyResetCodeResponse
>(verifyResetCode);
