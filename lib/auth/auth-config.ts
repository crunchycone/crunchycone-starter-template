import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prismaAuth } from "@/lib/auth/prisma-auth";
import { buildProviders } from "./providers/index";
import { buildCallbacks } from "./callbacks/index";
import { buildEvents } from "./events/index";

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prismaAuth),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: buildProviders(),
  callbacks: buildCallbacks(),
  events: buildEvents(),
};
