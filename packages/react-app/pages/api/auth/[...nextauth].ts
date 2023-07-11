import NextAuth, { NextAuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export const authOptions: NextAuthOptions = { // TODO review docs for this. Why is the file named like this?
    providers: [
        TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID as string,
            clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
            version: "2.0",
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET, // TODO do we need this?
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, user }) {
            token.username = user.id
            return token;
        },
        async session({ session, token }) {
            console.log("session", session);
            console.log("token", token)
            session.user = {
                name: token.name,
                email: token.email,
                image: token.picture
            }
            if (typeof token.username === "string") { // TODO
                session.user.email = token.username; // override email since we don't need it
            }
            return session;
        },
    },
    debug: true, // TODO toggle this based on env? 
    logger: { // TODO do we need this? 
        error(code, metadata) {
            console.error(code, metadata);
        },
    },
}

export default NextAuth(authOptions);
