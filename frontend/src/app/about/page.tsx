import Navbar from '@/components/Navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Navbar />
      <div className="pt-28 pb-20 px-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About InterviewGuard AI</h1>
        <div className="glass-card p-8 space-y-4 text-slate-700 leading-relaxed">
          <p>
            InterviewGuard AI is an enterprise-grade recruitment security platform designed to
            increase trust in online interviews. As remote hiring becomes the norm, companies
            face growing challenges with candidate authenticity and interview integrity.
          </p>
          <p>
            Our platform combines cutting-edge computer vision, natural language processing,
            and behavioral analysis to detect suspicious activity in real-time — from AI-assisted
            cheating and gaze anomalies to tab switching and AI-generated answers.
          </p>
          <p>
            Built for HR teams, interviewers, and recruitment agencies, InterviewGuard AI
            provides actionable trust scores, detailed analytics, and comprehensive PDF reports
            to support informed hiring decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
