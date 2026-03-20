import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextFlow — AI Workflow Builder",
  description: "Visual workflow builder for LLM pipelines",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "#141416",
          colorInputBackground: "#0f0f11",
          colorInputText: "#e4e4e7",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="bg-[#0a0a0b] text-[#e4e4e7] antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
