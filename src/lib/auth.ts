import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

const githubClientId = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (process.env.NODE_ENV !== "production") {
  // Helps diagnose OAuth misconfiguration during local development.
  // eslint-disable-next-line no-console
  console.log("[auth] configured providers:", {
    github: Boolean(githubClientId && githubClientSecret),
    google: Boolean(googleClientId && googleClientSecret),
  });
}

export const authOptions: NextAuthOptions = {
  debug: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    ...(githubClientId && githubClientSecret
      ? [
          GitHubProvider({
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          }),
        ]
      : []),
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        // eslint-disable-next-line no-console
        console.log("[auth] authorize called:", { email });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          // eslint-disable-next-line no-console
          console.log("[auth] no user found:", { email });
          return null;
        }
        if (!user?.password) {
          // eslint-disable-next-line no-console
          console.log("[auth] user has no password (OAuth-only):", { email });
          return null;
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          // eslint-disable-next-line no-console
          console.log("[auth] invalid password:", { email });
          return null;
        }

        // eslint-disable-next-line no-console
        console.log("[auth] login successful:", { email, userId: user.id });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) session.user.id = token.id as string;
      return session;
    },
  },
};

