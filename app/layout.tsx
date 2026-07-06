import type { Metadata } from "next";
import { Bricolage_Grotesque, Sora, Martian_Mono } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/TopBar";

const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-display" });
const body = Sora({ subsets: ["latin", "latin-ext"], variable: "--font-body" });
const mono = Martian_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "weeto — la noche recién empieza",
  description: "Live streaming social con economía de regalos. Prendé el show.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TopBar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
