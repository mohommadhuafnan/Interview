'use client';

import { useEffect, useState } from 'react';
import { api, SuspiciousEvent } from '@/lib/api';
import { demoEvents } from '@/lib/demo';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

export default function AnalyticsPage() {
  const [events, setEvents] = useState<SuspiciousEvent[]>(demoEvents);

  useEffect(() => {
    api.getAllEvents().then(setEvents).catch(() => setEvents(demoEvents));
  }, []);

  const eventTypes: Record<string, number> = {};
  events.forEach((e) => {
    eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
  });

  const barData = {
    labels: Object.keys(eventTypes).map((k) => k.replace(/_/g, ' ')),
    datasets: [{
      label: 'Event Count',
      data: Object.values(eventTypes),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 8,
    }],
  };

  const doughnutData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical'],
    datasets: [{
      data: [45, 30, 18, 7],
      backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
    }],
  };

  const lineData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Avg Trust Score',
      data: [85, 82, 78, 80, 76, 83, 81],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <main className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">Suspicious Events by Type</h2>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">Risk Distribution</h2>
          <div className="max-w-xs mx-auto">
            <Doughnut data={doughnutData} />
          </div>
        </div>
        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Trust Score Trend</h2>
          <Line data={lineData} options={{ responsive: true }} />
        </div>
      </div>
    </main>
  );
}
