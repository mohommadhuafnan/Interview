import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import DynamicIsland from '@/components/DynamicIsland';
import './globals.css';

export const metadata: Metadata = {
  title: 'InterviewGuard AI - Interview Integrity Platform',
  description: 'AI-powered interview monitoring and candidate authenticity detection',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <DynamicIsland />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
