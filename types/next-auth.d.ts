import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "OPERATOR" | "ACCOUNTANT" | "VIEWER";

declare module "next-auth" {
  interface User {
    role?: AppRole;
  }
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: AppRole;
  }
}
