'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { Shield, Eye, Brain, Monitor, FileText, Zap, ArrowRight } from 'lucide-react';

const features = [
  { icon: Eye, title: 'AI Gaze Tracking', desc: 'Real-time eye movement analysis using MediaPipe Face Mesh' },
  { icon: Brain, title: 'NLP Authenticity', desc: 'Detect AI-generated answers with transformer models' },
  { icon: Monitor, title: 'Browser Monitoring', desc: 'Track tab switches, copy-paste, and fullscreen violations' },
  { icon: Shield, title: 'Trust Score Engine', desc: 'Composite authenticity scoring with risk classification' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" /> AI-Powered Interview Security
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
              Trust Every{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Interview
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Detect AI-assisted cheating, suspicious behavior, and inauthentic responses
              in real-time with enterprise-grade monitoring technology.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/register" className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/features" className="btn-secondary text-lg px-8 py-3">Explore Features</Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 glass-card p-2 max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 text-left">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-slate-400 text-sm">Live Monitoring Dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Trust Score</p>
                  <p className="text-3xl font-bold text-emerald-400">82%</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Gaze Direction</p>
                  <p className="text-lg font-semibold text-blue-400">Center</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Risk Level</p>
                  <p className="text-lg font-semibold text-amber-400">Medium</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Core Capabilities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="stat-card group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-200/50">
        &copy; 2026 InterviewGuard AI. Enterprise Interview Integrity Platform.
      </footer>
    </div>
  );
}
