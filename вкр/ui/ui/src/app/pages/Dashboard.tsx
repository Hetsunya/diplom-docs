import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, Plus, Clock, Users, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Sidebar } from '../components/Sidebar';

interface ScheduledCall {
  id: string;
  title: string;
  date: string;
  dateISO?: string;
  time: string;
  duration: string;
  participants: string[];
  status: 'upcoming' | 'completed';
  description?: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadScheduledCalls();
  }, [user]);

  const loadScheduledCalls = async () => {
    if (!user) return;

    try {
      console.log('Loading calls for user:', user.id);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-837d034e/calls?userId=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received calls data:', data);
        const calls = data.calls || [];
        // Filter out any null/invalid entries
        const validCalls = calls.filter((call: any) => call && call.status && call.title);
        console.log('Valid calls:', validCalls);
        setScheduledCalls(validCalls);
      } else {
        const errorText = await response.text();
        console.error('Failed to load calls. Status:', response.status, 'Error:', errorText);
        // Set fallback sample calls if backend fails
        setFallbackCalls();
      }
    } catch (err) {
      console.error('Error loading calls:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        projectId,
        hasPublicKey: !!publicAnonKey,
        userId: user.id
      });
      // Set fallback sample calls if backend fails
      setFallbackCalls();
    }
  };

  const setFallbackCalls = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const formatDate = (date: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const formatDateISO = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const fallbackCalls: ScheduledCall[] = [
      {
        id: '1',
        title: 'Team Standup',
        date: formatDate(tomorrow),
        dateISO: formatDateISO(tomorrow),
        time: '09:00',
        duration: '30 min',
        participants: ['Sarah Chen', 'Michael Rodriguez', 'Emily Johnson'],
        status: 'upcoming',
        description: 'Daily team sync to discuss progress and blockers',
      },
      {
        id: '2',
        title: 'Product Strategy Review',
        date: formatDate(dayAfterTomorrow),
        dateISO: formatDateISO(dayAfterTomorrow),
        time: '14:00',
        duration: '60 min',
        participants: ['David Kim', 'Lisa Anderson', 'James Wilson', 'Maria Garcia'],
        status: 'upcoming',
        description: 'Quarterly product roadmap discussion and feature prioritization',
      },
      {
        id: '3',
        title: 'Client Presentation',
        date: formatDate(nextWeek),
        dateISO: formatDateISO(nextWeek),
        time: '11:00',
        duration: '45 min',
        participants: ['Robert Taylor', 'Jennifer Brown'],
        status: 'upcoming',
        description: 'Demo of new features and Q1 progress report',
      },
    ];

    console.log('Using fallback calls:', fallbackCalls);
    setScheduledCalls(fallbackCalls);
  };

  const filteredCalls = scheduledCalls.filter((call) => {
    // Add null/undefined check
    if (!call || !call.title) return false;
    const matchesSearch = call.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || call.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calendar helpers
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Get calls for a specific day
  const getCallsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return scheduledCalls.filter(call => {
      if (!call.dateISO) return false;
      return call.dateISO === dateStr;
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Scheduled Calls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Scheduled Calls</h2>
                <button
                  onClick={() => setShowNewCallModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="size-5" />
                  <span>Schedule Call</span>
                </button>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search calls..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="size-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Calls</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Calls List */}
              <div className="space-y-4">
                {filteredCalls.length === 0 ? (
                  <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                    <Calendar className="size-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No scheduled calls found</p>
                    <button
                      onClick={() => setShowNewCallModal(true)}
                      className="mt-4 text-purple-400 hover:text-purple-300"
                    >
                      Schedule your first call
                    </button>
                  </div>
                ) : (
                  filteredCalls.map((call) => (
                    <div
                      key={call.id}
                      className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">{call.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="size-4" />
                              <span>{call.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="size-4" />
                              <span>{call.time} • {call.duration}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            call.status === 'upcoming'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {call.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                        </span>
                      </div>
                      {call.description && (
                        <p className="text-sm text-gray-400 mb-3">{call.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="size-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {call.participants.join(', ')}
                        </span>
                      </div>
                      {call.status === 'upcoming' && (
                        <button 
                          onClick={() => navigate('/call')}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                        >
                          Join Call
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column - Calendar */}
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={previousMonth}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <ChevronLeft className="size-5 text-gray-400" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <ChevronRight className="size-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={`weekday-${index}`} className="text-center text-xs font-medium text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const isToday =
                      day === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear();
                    const dayCalls = getCallsForDay(day);
                    const hasEvents = dayCalls.length > 0;
                    
                    return (
                      <div
                        key={`day-${day}`}
                        className="relative group"
                      >
                        <div
                          className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-colors ${
                            isToday
                              ? 'bg-purple-600 text-white font-semibold'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <span>{day}</span>
                          {hasEvents && (
                            <div className="flex gap-0.5 mt-0.5">
                              {dayCalls.slice(0, 3).map((_, idx) => (
                                <div key={idx} className="w-1 h-1 rounded-full bg-purple-400" />
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Tooltip on hover */}
                        {hasEvents && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 hidden group-hover:block w-64">
                            <div className="bg-gray-900 border border-purple-500 rounded-lg shadow-xl p-3 space-y-2">
                              {dayCalls.map(call => (
                                <div key={call.id} className="text-xs">
                                  <div className="font-semibold text-white mb-1">{call.title}</div>
                                  <div className="text-gray-400 flex items-center gap-2">
                                    <Clock className="size-3" />
                                    <span>{call.time} • {call.duration}</span>
                                  </div>
                                  {call.description && (
                                    <div className="text-gray-400 mt-1">{call.description}</div>
                                  )}
                                  <div className="text-gray-400 flex items-center gap-1 mt-1">
                                    <Users className="size-3" />
                                    <span>{call.participants.length} participant{call.participants.length !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Calls</span>
                    <span className="text-white font-semibold">{scheduledCalls.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Upcoming</span>
                    <span className="text-green-400 font-semibold">
                      {scheduledCalls.filter(c => c && c.status === 'upcoming').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Completed</span>
                    <span className="text-gray-400 font-semibold">
                      {scheduledCalls.filter(c => c && c.status === 'completed').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Call Modal */}
      {showNewCallModal && (
        <NewCallModal
          onClose={() => setShowNewCallModal(false)}
          onCallScheduled={loadScheduledCalls}
        />
      )}
    </div>
  );
}

interface NewCallModalProps {
  onClose: () => void;
  onCallScheduled: () => void;
}

function NewCallModal({ onClose, onCallScheduled }: NewCallModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [participants, setParticipants] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-837d034e/calls`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            userId: user?.id,
            title,
            date,
            time,
            duration: `${duration} min`,
            participants: participants.split(',').map(p => p.trim()),
          }),
        }
      );

      if (response.ok) {
        onCallScheduled();
        onClose();
      }
    } catch (err) {
      console.error('Error scheduling call:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Schedule New Call</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Call Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Team Standup"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Participants (comma separated)
            </label>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Sarah Chen, Michael Rodriguez"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}