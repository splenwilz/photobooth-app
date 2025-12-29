import { createMutationHook } from "@/api/utils/query-helpers";
import type { SignoutResponse } from "./types";
import { signout } from "./services";

export const useSignout = createMutationHook<void, SignoutResponse>(signout);