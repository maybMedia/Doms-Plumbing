import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const bodyFont = localFont({
  src: "./fonts/IBMPlexSans-Variable.ttf",
  variable: "--font-body",
  weight: "100 700",
  display: "swap",
});
const displayFont = localFont({
  src: "./fonts/Bungee-Regular.ttf",
  variable: "--font-display",
  weight: "400",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Dom’s Plumbing Services | The Hills District",
  description:
    "Plumbing repairs, blocked drains, hot water and emergency callouts in the Hills District and surrounding areas. Request a quote from Dom’s Plumbing Services.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-64.png", type: "image/png", sizes: "64x64" },
    ],
    apple: "/apple-touch-icon.png",
  },
};
const themeScript = `try{var t=localStorage.getItem('doms-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-AU"
      className={`${bodyFont.variable} ${displayFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <noscript>
          <style>{`.brand-loader{display:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
