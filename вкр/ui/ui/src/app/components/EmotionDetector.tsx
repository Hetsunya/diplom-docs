import { useState, useEffect } from 'react';
import { Smile, Meh, Focus, Lightbulb, Zap, Brain } from 'lucide-react';

export interface EmotionData {
  emotion: string;
  confidence: number;
  timestamp: number;
}

interface EmotionDetectorProps {
  participantName: string;
  onEmotionDetected?: (emotion: EmotionData) => void;
}

export function EmotionDetector({ participantName, onEmotionDetected }: EmotionDetectorProps) {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null);
  const [detectionActive, setDetectionActive] = useState(true);

  const emotions = [
    { name: 'Happy', icon: Smile, color: 'text-green-400', bgColor: 'bg-green-500' },
    { name: 'Neutral', icon: Meh, color: 'text-gray-400', bgColor: 'bg-gray-500' },
    { name: 'Engaged', icon: Focus, color: 'text-blue-400', bgColor: 'bg-blue-500' },
    { name: 'Focused', icon: Brain, color: 'text-purple-400', bgColor: 'bg-purple-500' },
    { name: 'Surprised', icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
    { name: 'Thoughtful', icon: Lightbulb, color: 'text-indigo-400', bgColor: 'bg-indigo-500' },
  ];

  useEffect(() => {
    if (!detectionActive) return;

    const detectEmotion = () => {
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      const emotionData: EmotionData = {
        emotion: randomEmotion.name,
        confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
        timestamp: Date.now(),
      };
      
      setCurrentEmotion(emotionData);
      onEmotionDetected?.(emotionData);
    };

    // Initial detection
    detectEmotion();

    // Update every 3 seconds
    const interval = setInterval(detectEmotion, 3000);

    return () => clearInterval(interval);
  }, [detectionActive, onEmotionDetected]);

  const getEmotionDetails = (emotionName: string) => {
    return emotions.find(e => e.name === emotionName) || emotions[1];
  };

  if (!currentEmotion) return null;

  const emotionDetails = getEmotionDetails(currentEmotion.emotion);
  const Icon = emotionDetails.icon;

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      {/* Main emotion badge */}
      <div className={`${emotionDetails.bgColor} text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300`}>
        <Icon className="size-4" />
        <span>{currentEmotion.emotion}</span>
        <span className="text-xs opacity-90">{currentEmotion.confidence}%</span>
      </div>

      {/* Confidence indicator */}
      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-300">Confidence</span>
        </div>
        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${emotionDetails.bgColor} transition-all duration-500`}
            style={{ width: `${currentEmotion.confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
