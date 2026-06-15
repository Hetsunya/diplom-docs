import { X, TrendingUp, Users, Clock, Brain } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EmotionAnalyticsProps {
  onClose: () => void;
}

export function EmotionAnalytics({ onClose }: EmotionAnalyticsProps) {
  // Mock data for emotion distribution
  const emotionDistribution = [
    { name: 'Happy', value: 35, color: '#10b981' },
    { name: 'Engaged', value: 28, color: '#3b82f6' },
    { name: 'Focused', value: 18, color: '#8b5cf6' },
    { name: 'Neutral', value: 12, color: '#6b7280' },
    { name: 'Thoughtful', value: 7, color: '#6366f1' },
  ];

  // Mock data for emotion timeline
  const emotionTimeline = [
    { time: '0:00', Happy: 30, Engaged: 25, Focused: 20, Neutral: 15 },
    { time: '2:00', Happy: 35, Engaged: 28, Focused: 18, Neutral: 12 },
    { time: '4:00', Happy: 32, Engaged: 30, Focused: 22, Neutral: 10 },
    { time: '6:00', Happy: 38, Engaged: 26, Focused: 20, Neutral: 8 },
    { time: '8:00', Happy: 35, Engaged: 28, Focused: 18, Neutral: 12 },
  ];

  // Mock data for participant emotions
  const participantEmotions = [
    { name: 'You', Happy: 40, Engaged: 30, Focused: 20, Other: 10 },
    { name: 'Sarah', Happy: 35, Engaged: 35, Focused: 18, Other: 12 },
    { name: 'Michael', Happy: 25, Engaged: 25, Focused: 30, Other: 20 },
    { name: 'Emily', Happy: 45, Engaged: 25, Focused: 15, Other: 15 },
  ];

  const insights = [
    { icon: TrendingUp, label: 'Overall Sentiment', value: 'Positive', color: 'text-green-400' },
    { icon: Users, label: 'Most Engaged', value: 'Sarah Chen', color: 'text-blue-400' },
    { icon: Clock, label: 'Peak Engagement', value: '6:00 mark', color: 'text-purple-400' },
    { icon: Brain, label: 'Attention Level', value: 'High (87%)', color: 'text-indigo-400' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-semibold text-white">Emotion Analytics</h2>
            <p className="text-gray-400 text-sm mt-1">Real-time insights from your call</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="size-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {insights.map((insight, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <insight.icon className={`size-5 ${insight.color}`} />
                  <span className="text-gray-400 text-sm">{insight.label}</span>
                </div>
                <p className="text-white font-semibold text-lg">{insight.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emotion Distribution */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Emotion Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={emotionDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {emotionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Emotion Timeline */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Emotion Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={emotionTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Happy" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="Engaged" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="Focused" stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="Neutral" stroke="#6b7280" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Participant Breakdown */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
              <h3 className="text-white font-semibold mb-4">Participant Emotion Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={participantEmotions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Happy" stackId="a" fill="#10b981" />
                  <Bar dataKey="Engaged" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Focused" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="Other" stackId="a" fill="#6b7280" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights */}
          <div className="mt-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-700/50">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Brain className="size-5 text-purple-400" />
              AI-Powered Insights
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>The meeting shows strong positive engagement with 35% happy emotions detected across all participants.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Sarah Chen demonstrates the highest engagement levels, particularly during the 4-6 minute mark.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Michael Rodriguez shows increased focus, suggesting deep concentration on the discussion topic.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Consider maintaining the current pace and engagement level for optimal participant experience.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
