import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const twoFaSchema = z.object({
  type: z.literal("2fa_verified"),
  userId: z.string(),
  verificationToken: z.string(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          requiresTwoFactor: user.twoFactorEnabled,
        };
      },
    }),
    Credentials({
      id: "2fa-verified",
      name: "2fa-verified",
      credentials: {
        type: { label: "Type", type: "text" },
        userId: { label: "User ID", type: "text" },
        verificationToken: { label: "Verification Token", type: "text" },
      },
      async authorize(credentials) {
        const parsed = twoFaSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { userId, verificationToken } = parsed.data;

        // Look up the verification token stored in PasswordResetToken
        const tokenRecord = await prisma.passwordResetToken.findFirst({
          where: {
            userId,
            token: `2FA_VERIFIED_${verificationToken}`,
            expiresAt: { gt: new Date() },
          },
        });

        if (!tokenRecord) return null;

        // Consume the token
        await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          requiresTwoFactor: false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role?: string }).role;
        token.emailConfirmed = (user as unknown as { emailVerified?: boolean }).emailVerified ?? false;
        token.requiresTwoFactor = (user as unknown as { requiresTwoFactor?: boolean }).requiresTwoFactor ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as unknown as { role?: string }).role = token.role as string;
        (session.user as unknown as { emailConfirmed?: boolean }).emailConfirmed = token.emailConfirmed as boolean;
        (session.user as unknown as { requiresTwoFactor?: boolean }).requiresTwoFactor = token.requiresTwoFactor as boolean;
      }
      return session;
    },
  },
});
