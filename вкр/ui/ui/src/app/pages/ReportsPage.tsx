import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Calendar,
  Download,
  Eye,
  Smile,
  Meh,
  Frown,
  Brain,
  Lightbulb,
  Sparkles,
  Video
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Sidebar } from '../components/Sidebar';

interface CallReport {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  avgEngagement: number;
  emotionData: {
    Happy: number;
    Engaged: number;
    Focused: number;
    Neutral: number;
    Thoughtful: number;
    Surprised: number;
  };
}

interface OrgAnalytics {
  totalCalls: number;
  totalParticipants: number;
  avgCallDuration: number;
  avgEngagement: number;
  emotionTrends: Array<{
    date: string;
    Happy: number;
    Engaged: number;
    Focused: number;
    Neutral: number;
  }>;
  topEmotions: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'history' | 'analytics'>('history');
  const [callReports, setCallReports] = useState<CallReport[]>([]);
  const [orgAnalytics, setOrgAnalytics] = useState<OrgAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallReport | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load call reports
      const reportsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-837d034e/reports/calls?userId=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setCallReports(reportsData.reports || []);
      }

      // Load organization analytics
      const analyticsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-837d034e/reports/analytics?userId=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setOrgAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      Happy: '#22c55e',
      Engaged: '#8b5cf6',
      Focused: '#3b82f6',
      Neutral: '#94a3b8',
      Thoughtful: '#f59e0b',
      Surprised: '#ec4899',
    };
    return colors[emotion] || '#94a3b8';
  };

  const getEmotionIcon = (emotion: string) => {
    const icons: Record<string, any> = {
      Happy: Smile,
      Engaged: Brain,
      Focused: Eye,
      Neutral: Meh,
      Thoughtful: Lightbulb,
      Surprised: Sparkles,
    };
    const Icon = icons[emotion] || Meh;
    return <Icon className="size-4" />;
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'history'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="size-5" />
                <span>Call History</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'analytics'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5" />
                <span>Organization Analytics</span>
              </div>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full size-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'history' && (
                <CallHistoryView
                  callReports={callReports}
                  selectedCall={selectedCall}
                  onSelectCall={setSelectedCall}
                  getEmotionColor={getEmotionColor}
                  getEmotionIcon={getEmotionIcon}
                />
              )}
              {activeTab === 'analytics' && orgAnalytics && (
                <OrganizationAnalyticsView
                  analytics={orgAnalytics}
                  getEmotionColor={getEmotionColor}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface CallHistoryViewProps {
  callReports: CallReport[];
  selectedCall: CallReport | null;
  onSelectCall: (call: CallReport | null) => void;
  getEmotionColor: (emotion: string) => string;
  getEmotionIcon: (emotion: string) => JSX.Element;
}

function CallHistoryView({
  callReports,
  selectedCall,
  onSelectCall,
  getEmotionColor,
  getEmotionIcon,
}: CallHistoryViewProps) {
  if (callReports.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
        <Calendar className="size-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Call Reports Yet</h3>
        <p className="text-gray-400">Complete some calls to see emotion analytics and reports here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Call List */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Calls</h2>
        {callReports.map((report) => (
          <div
            key={report.id}
            onClick={() => onSelectCall(report)}
            className={`bg-gray-800 rounded-lg p-4 border cursor-pointer transition-all ${
              selectedCall?.id === report.id
                ? 'border-purple-500 ring-2 ring-purple-500/20'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <h3 className="text-white font-medium mb-2">{report.title}</h3>
            <div className="space-y-1 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="size-4" />
                <span>{report.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                <span>{report.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <span>{report.participants} participants</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${report.avgEngagement}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{report.avgEngagement}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Call Details */}
      <div className="lg:col-span-2">
        {selectedCall ? (
          <CallDetailView
            call={selectedCall}
            getEmotionColor={getEmotionColor}
            getEmotionIcon={getEmotionIcon}
          />
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <Eye className="size-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select a Call</h3>
            <p className="text-gray-400">Choose a call from the list to view detailed emotion analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CallDetailViewProps {
  call: CallReport;
  getEmotionColor: (emotion: string) => string;
  getEmotionIcon: (emotion: string) => JSX.Element;
}

function CallDetailView({ call, getEmotionColor, getEmotionIcon }: CallDetailViewProps) {
  const emotionData = Object.entries(call.emotionData).map(([name, value]) => ({
    name,
    value,
    percentage: value,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{call.title}</h2>
            <div className="flex items-center gap-4 text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="size-4" />
                <span>{call.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                <span>{call.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <span>{call.participants} participants</span>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <Download className="size-4" />
            <span>Export</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Average Engagement</div>
            <div className="text-3xl font-bold text-white">{call.avgEngagement}%</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Participants</div>
            <div className="text-3xl font-bold text-white">{call.participants}</div>
          </div>
        </div>
      </div>

      {/* Emotion Distribution */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Emotion Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={emotionData}>
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
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {emotionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getEmotionColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Emotion Breakdown */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h3>
        <div className="grid grid-cols-2 gap-4">
          {emotionData.map((emotion) => (
            <div
              key={emotion.name}
              className="bg-gray-700/50 rounded-lg p-4 flex items-center gap-3"
            >
              <div
                className="flex items-center justify-center size-10 rounded-lg"
                style={{ backgroundColor: getEmotionColor(emotion.name) + '20' }}
              >
                <div style={{ color: getEmotionColor(emotion.name) }}>
                  {getEmotionIcon(emotion.name)}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{emotion.name}</div>
                <div className="text-sm text-gray-400">{emotion.percentage}%</div>
              </div>
              <div className="text-2xl font-bold" style={{ color: getEmotionColor(emotion.name) }}>
                {emotion.value}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-500/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">AI-Generated Insights</h3>
        </div>
        <div className="space-y-2 text-gray-300">
          <p>• Overall engagement was {call.avgEngagement >= 70 ? 'excellent' : call.avgEngagement >= 50 ? 'good' : 'moderate'} with an average of {call.avgEngagement}%</p>
          <p>• Participants showed high levels of {emotionData[0]?.name.toLowerCase()} throughout the call</p>
          <p>• Consider shorter meetings to maintain focus and engagement levels</p>
        </div>
      </div>
    </div>
  );
}

interface OrganizationAnalyticsViewProps {
  analytics: OrgAnalytics;
  getEmotionColor: (emotion: string) => string;
}

function OrganizationAnalyticsView({ analytics, getEmotionColor }: OrganizationAnalyticsViewProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Video className="size-5 text-purple-400" />
            </div>
            <div className="text-sm text-gray-400">Total Calls</div>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.totalCalls}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="size-5 text-blue-400" />
            </div>
            <div className="text-sm text-gray-400">Total Participants</div>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.totalParticipants}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Clock className="size-5 text-green-400" />
            </div>
            <div className="text-sm text-gray-400">Avg Duration</div>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.avgCallDuration} min</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingUp className="size-5 text-orange-400" />
            </div>
            <div className="text-sm text-gray-400">Avg Engagement</div>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.avgEngagement}%</div>
        </div>
      </div>

      {/* Emotion Trends Over Time */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Emotion Trends Over Time</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.emotionTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
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
              <Line
                type="monotone"
                dataKey="Happy"
                stroke={getEmotionColor('Happy')}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Engaged"
                stroke={getEmotionColor('Engaged')}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Focused"
                stroke={getEmotionColor('Focused')}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Neutral"
                stroke={getEmotionColor('Neutral')}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Emotions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Top Emotions</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.topEmotions}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.topEmotions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getEmotionColor(entry.name)} />
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
        </div>

        {/* Organization Insights */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Organization Insights</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Engagement Trend</h4>
              <p className="text-sm text-gray-300">
                Your team's average engagement is {analytics.avgEngagement}%, which is{' '}
                {analytics.avgEngagement >= 70 ? 'excellent' : analytics.avgEngagement >= 50 ? 'good' : 'needs improvement'}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Communication Style</h4>
              <p className="text-sm text-gray-300">
                Participants show consistent {analytics.topEmotions[0]?.name.toLowerCase()} emotions,
                indicating effective communication
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Recommendations</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Keep meetings under {analytics.avgCallDuration} minutes for optimal engagement</li>
                <li>• Schedule breaks for longer calls</li>
                <li>• Use interactive elements to maintain focus</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}