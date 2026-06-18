'use client';

import Navbar from '@/components/Navbar';
import { useState } from 'react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Navbar />
      <div className="pt-28 pb-20 px-4 max-w-lg mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">Contact Us</h1>
        {sent ? (
          <div className="glass-card p-8 text-center">
            <p className="text-emerald-600 font-medium">Thank you! We&apos;ll be in touch soon.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="glass-card p-8 space-y-4"
          >
            <input className="input-field" placeholder="Your Name" required />
            <input className="input-field" type="email" placeholder="Email Address" required />
            <textarea className="input-field h-32 resize-none" placeholder="Message" required />
            <button type="submit" className="btn-primary w-full">Send Message</button>
          </form>
        )}
      </div>
    </div>
  );
}
