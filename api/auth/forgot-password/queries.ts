import { createMutationHook } from "@/api/utils/query-helpers";
import { forgotPassword } from "./services";
import type { ForgotPasswordRequest, ForgotPasswordResponse } from "./types";

export const useForgotPassword = createMutationHook<ForgotPasswordRequest, ForgotPasswordResponse>(forgotPassword);