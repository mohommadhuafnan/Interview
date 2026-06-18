import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          InterviewGuard AI
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <Link href="/features" className="nav-link">Features</Link>
        <Link href="/about" className="nav-link">About</Link>
        <Link href="/contact" className="nav-link">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/login" className="btn-secondary text-sm">Sign In</Link>
        <Link href="/register" className="btn-primary text-sm">Get Started</Link>
      </div>
    </nav>
  );
}
