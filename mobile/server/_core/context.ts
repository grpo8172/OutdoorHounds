import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  // Raw slug from the X-Tenant-Slug header, unresolved — resolution (and
  // the absent-vs-invalid distinction) happens in withTenant (see _core/
  // trpc.ts), not here, so an absent header never costs a DB lookup.
  tenantSlug: string | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const rawSlug = opts.req.headers["x-tenant-slug"];
  const tenantSlug = typeof rawSlug === "string" && rawSlug.trim() ? rawSlug.trim() : null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantSlug,
  };
}
