import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Debug: log authentication errors
    const authHeader = opts.req.headers.authorization;
    console.log("[Auth Debug] Auth failed", {
      hasAuthHeader: !!authHeader,
      origin: opts.req.headers.origin,
      path: opts.req.path,
      error: error instanceof Error ? error.message : String(error),
    });
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
