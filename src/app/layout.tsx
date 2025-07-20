import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  ClerkProvider,
} from "@clerk/nextjs";
import ProfileGuard from "@/components/ProfileGuard";
import "./globals.css";

const neueHaasDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/NeueHaasDisplayThin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayLight.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayRoman.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayMediu.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayBold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-neue-haas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GYST - Get Your Shit Together",
  description: "AI-powered job application automation platform for new graduates and early-career professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/auth/login"
      signUpUrl="/auth/signup"
      afterSignInUrl="/pages/search"
      afterSignUpUrl="/auth/profile-setup"
    >
      <html lang="en">
        <body
          className={`${neueHaasDisplay.variable} antialiased`}
        >
          <ProfileGuard>
            {children}
          </ProfileGuard>
        </body>
      </html>
    </ClerkProvider>
  );
}
