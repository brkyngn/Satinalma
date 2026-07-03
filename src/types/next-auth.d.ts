import type { DefaultSession } from "next-auth";
import type { RoleName } from "../../generated/prisma/enums";

declare module "next-auth" {
  interface User {
    roles: RoleName[];
  }

  interface Session {
    user: {
      id: string;
      roles: RoleName[];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    roles: RoleName[];
  }
}
