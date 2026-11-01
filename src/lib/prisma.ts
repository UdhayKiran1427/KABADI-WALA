import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

/**
 * Health check that verifies MongoDB connection and replica set status.
 * Fails loudly if MongoDB is connected in standalone mode rather than replica set.
 */
export async function assertReplicaSetHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    // In MongoDB replica set, hello or isMaster returns setName or hosts
    // With Prisma, we can run $runCommandRaw
    const result = (await prisma.$runCommandRaw({ hello: 1 })) as {
      setName?: string;
      hosts?: string[];
      isWritablePrimary?: boolean;
      ismaster?: boolean;
    };

    if (!result.setName) {
      const msg = "CRITICAL: MongoDB is running as a STANDALONE instance. A Replica Set (e.g. rs0) is MANDATORY for transactions and sync!";
      console.error(msg);
      return { ok: false, message: msg };
    }

    return {
      ok: true,
      message: `MongoDB Replica Set '${result.setName}' is healthy and writable.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Database connection failed:", errorMsg);
    return { ok: false, message: errorMsg };
  }
}

