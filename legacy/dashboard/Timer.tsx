import React, { useState, useEffect, useRef } from 'react';

const Timer: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [todayTime, setTodayTime] = useState<number>(0);
  const [weekTime, setWeekTime] = useState<number>(329); // 05:29 in seconds
  const [monthTime, setMonthTime] = useState<number>(0);
  
  // Use ReturnType<typeof setInterval> for browser compatibility
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Format time from seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format time to show hours and minutes only
  const formatShortTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Start the timer
  const startTimer = (): void => {
    if (!isRunning || isPaused) {
      setIsRunning(true);
      setIsPaused(false);
      startTimeRef.current = Date.now() - totalTime * 1000;
    }
  };

  // Pause the timer
  const pauseTimer = (): void => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  // Stop the timer
  const stopTimer = (): void => {
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Optionally reset total time
    // setTotalTime(0);
  };

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsedSeconds: number = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTotalTime(elapsedSeconds);
          
          // Update today's time (simplified - in real app you'd track per day)
          setTodayTime((prev: number) => prev + 1);
          
          // Update week and month time (simplified)
          setWeekTime((prev: number) => prev + 1);
          setMonthTime((prev: number) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  // Reset daily counter at midnight (simplified)
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const now: Date = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
        setTodayTime(0);
      }
    }, 1000);

    return () => clearInterval(checkMidnight);
  }, []);

  const getStatusText = (): string => {
    if (!isRunning) return 'READY';
    if (isPaused) return 'PAUSED';
    return 'RUNNING';
  };

  return (
    <div className="col-span-3 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>
      
      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold">Time Tracker</h3>
            <p className="text-xs text-white/70">Project SemiDash Admin</p>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-md ${
            isRunning && !isPaused ? 'bg-green-400/30' : 'bg-white/20'
          }`}>
            {getStatusText()}
          </span>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 rounded-full border-4 border-white/30 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="text-center">
              <div className="text-2xl font-bold tracking-wider">
                {formatTime(totalTime)}
              </div>
              <div className="text-[10px] text-white/60 mt-1">Total Time</div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center gap-3 mb-6">
          {/* Play/Start Button */}
          <button 
            onClick={startTimer}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRunning && !isPaused}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          
          {/* Pause Button */}
          <button 
            onClick={pauseTimer}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isRunning || isPaused}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
          
          {/* Stop Button */}
          <button 
            onClick={stopTimer}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isRunning}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-white/60">Today</div>
            <div className="text-sm font-semibold mt-1">{formatShortTime(todayTime)}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">This Week</div>
            <div className="text-sm font-semibold mt-1">{formatShortTime(weekTime)}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">This Month</div>
            <div className="text-sm font-semibold mt-1">{formatShortTime(monthTime)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;