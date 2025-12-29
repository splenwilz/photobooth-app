import { createMutationHook } from "@/api/utils/query-helpers";
import type { AuthResponse } from "../types";
import { resetPassword } from "./services";
import type { ResetPasswordRequest } from "./types";

export const useResetPassword = createMutationHook<ResetPasswordRequest, AuthResponse>(resetPassword);