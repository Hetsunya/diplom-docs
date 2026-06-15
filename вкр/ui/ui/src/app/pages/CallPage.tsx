import { useState } from 'react';
import { useNavigate } from 'react-router';
import { VideoCall } from '../components/VideoCall';
import { EmotionAnalytics } from '../components/EmotionAnalytics';
import { ArrowLeft } from 'lucide-react';

export function CallPage() {
  const navigate = useNavigate();
  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <div className="size-full relative">
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm text-white rounded-lg transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Back to Dashboard</span>
      </button>
      
      <VideoCall onShowAnalytics={() => setShowAnalytics(true)} />
      {showAnalytics && (
        <EmotionAnalytics onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
}
