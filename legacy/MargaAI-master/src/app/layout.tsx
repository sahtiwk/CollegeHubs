import type { Metadata } from 'next';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Learn | CollegeHubs', description: 'Your college Hub learning session' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Archivo:wght@400;500;600;700&display=swap" /></head><body>{children}</body></html>;
}
