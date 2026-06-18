import Navbar from '@/components/Navbar';
import { Eye, Brain, Users, Mic, Monitor, FileText, Shield } from 'lucide-react';

const allFeatures = [
  { icon: Eye, title: 'AI Eye Movement Detection', desc: 'Track gaze direction using OpenCV and MediaPipe Face Mesh. Detect left/right/down movements and suspicious repeated patterns.' },
  { icon: Shield, title: 'Head Pose Detection', desc: 'Monitor head turning and abnormal face direction using MediaPipe landmarks and OpenCV solvePnP.' },
  { icon: Users, title: 'Multi-Person Detection', desc: 'Detect additional faces, candidate leaving screen, or external assistance using YOLO and OpenCV.' },
  { icon: Mic, title: 'Audio & Voice Analysis', desc: 'Analyze external voices, silence duration, and suspicious pauses using Whisper AI speech-to-text.' },
  { icon: Brain, title: 'NLP Answer Analysis', desc: 'Detect AI-generated responses and copied answers using HuggingFace transformers and semantic similarity.' },
  { icon: Monitor, title: 'Browser Monitoring', desc: 'Real-time detection of tab switching, copy-paste, minimization, and fullscreen violations.' },
  { icon: FileText, title: 'PDF Report Generator', desc: 'Generate comprehensive interview integrity reports with suspicious activity logs and recommendations.' },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Navbar />
      <div className="pt-28 pb-20 px-4 max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Platform Features</h1>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          Comprehensive AI-powered tools to ensure interview integrity and candidate authenticity.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {allFeatures.map((f) => (
            <div key={f.title} className="glass-card p-6 hover:shadow-2xl transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
