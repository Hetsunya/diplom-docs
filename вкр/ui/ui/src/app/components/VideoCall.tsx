import { useState, useEffect } from 'react';
import { Video, Mic, MicOff, VideoOff, Phone, Users, BarChart3 } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  emotion?: string;
  emotionConfidence?: number;
}

interface VideoCallProps {
  onShowAnalytics: () => void;
}

export function VideoCall({ onShowAnalytics }: VideoCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'You', isMuted: false, isVideoOff: false },
    { id: '2', name: 'Sarah Chen', isMuted: false, isVideoOff: false },
    { id: '3', name: 'Michael Rodriguez', isMuted: true, isVideoOff: false },
    { id: '4', name: 'Emily Johnson', isMuted: false, isVideoOff: false },
  ]);

  // Simulate emotion detection updates
  useEffect(() => {
    const emotions = ['Happy', 'Neutral', 'Engaged', 'Focused', 'Surprised', 'Thoughtful'];
    
    const interval = setInterval(() => {
      setParticipants(prev => 
        prev.map(p => ({
          ...p,
          emotion: emotions[Math.floor(Math.random() * emotions.length)],
          emotionConfidence: Math.floor(Math.random() * 30) + 70, // 70-100%
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setParticipants(prev =>
      prev.map(p => p.id === '1' ? { ...p, isMuted: !isMuted } : p)
    );
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    setParticipants(prev =>
      prev.map(p => p.id === '1' ? { ...p, isVideoOff: !isVideoOff } : p)
    );
  };

  const getEmotionColor = (emotion?: string) => {
    const colors: Record<string, string> = {
      Happy: 'bg-green-500',
      Neutral: 'bg-gray-500',
      Engaged: 'bg-blue-500',
      Focused: 'bg-purple-500',
      Surprised: 'bg-yellow-500',
      Thoughtful: 'bg-indigo-500',
    };
    return emotion ? colors[emotion] || 'bg-gray-500' : 'bg-gray-500';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Main video grid */}
      <div className="flex-1 p-4 grid grid-cols-2 gap-4 overflow-auto">
        {participants.map((participant) => (
          <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            {/* Simulated video feed */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              {participant.isVideoOff ? (
                <div className="text-center">
                  <VideoOff className="size-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">{participant.name}</p>
                </div>
              ) : (
                <div className="size-full relative">
                  {/* Placeholder for video - using colored background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-purple-900/30"></div>
                  
                  {/* Emotion overlay */}
                  {participant.emotion && (
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <div className={`${getEmotionColor(participant.emotion)} text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm`}>
                        {participant.emotion} {participant.emotionConfidence}%
                      </div>
                    </div>
                  )}
                  
                  {/* Name tag */}
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-2">
                    <span>{participant.name}</span>
                    {participant.isMuted && <MicOff className="size-4" />}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Control bar */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-gray-400" />
            <span className="text-white">{participants.length} participants</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isMuted ? (
                <MicOff className="size-6 text-white" />
              ) : (
                <Mic className="size-6 text-white" />
              )}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="size-6 text-white" />
              ) : (
                <Video className="size-6 text-white" />
              )}
            </button>

            <button
              onClick={onShowAnalytics}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <BarChart3 className="size-6 text-white" />
            </button>

            <button className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors">
              <Phone className="size-6 text-white rotate-135" />
            </button>
          </div>

          <div className="w-[120px]"></div>
        </div>
      </div>
    </div>
  );
}
