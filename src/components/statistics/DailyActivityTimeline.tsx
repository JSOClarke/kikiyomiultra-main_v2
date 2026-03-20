import React, { useEffect, useState } from 'react';
import { TimelineDay, TimelineDateSummary } from '../../types';
import { apiClient } from '../../apiClient';
import { TimelineDayCard } from './TimelineDayCard';
import { CalendarDays, Loader2, ChevronDown } from 'lucide-react';

export const DailyActivityTimeline: React.FC = () => {
  const [availableDates, setAvailableDates] = useState<TimelineDateSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeDayData, setActiveDayData] = useState<TimelineDay | null>(null);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [isLoadingDay, setIsLoadingDay] = useState(false);

  useEffect(() => {
    const fetchDates = async () => {
      try {
        const dates = await apiClient.getTimelineDates();
        setAvailableDates(dates);
        if (dates.length > 0) {
          setSelectedDate(dates[0].date); // auto-select most recent
        }
      } catch (e) {
        console.error("Failed to load timeline dates:", e);
      } finally {
        setIsLoadingDates(false);
      }
    };
    fetchDates();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    const fetchDay = async () => {
      setIsLoadingDay(true);
      try {
        const dayData = await apiClient.getTimelineForDate(selectedDate);
        setActiveDayData(dayData);
      } catch (e) {
        console.error("Failed to load stats for date:", e);
      } finally {
        setIsLoadingDay(false);
      }
    };
    fetchDay();
  }, [selectedDate]);

  if (isLoadingDates) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="text-sec animate-spin" />
      </div>
    );
  }

  if (availableDates.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-text-muted border border-dashed border-white/5 rounded-2xl bg-surface/30 mt-8 mb-24">
        No historical reading activity found yet. Start interacting with your Library to generate data mapping.
      </div>
    );
  }

  // Format the dates nicely for the dropdown
  const formatDropdownDate = (summary: TimelineDateSummary) => {
    const d = new Date(summary.date + 'T12:00:00Z');
    const displayDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    
    // Format simple time string
    const hrs = Math.floor(summary.totalTimeSeconds / 3600);
    const mins = Math.floor((summary.totalTimeSeconds % 3600) / 60);
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    return `${displayDate} — (${timeStr} | ${summary.totalWords.toLocaleString()} W | ${summary.cardsMined} C)`;
  };

  return (
    <div className="mt-12 mb-24 w-full">
      <h2 className="text-xl font-bold text-text mb-6 border-b border-border pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="flex items-center gap-2"><CalendarDays size={18} className="text-sec" /> Target Historical Search</span>
        
        {/* Native Combobox Overlay */}
        <div className="relative">
          <select 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="appearance-none bg-surface hover:bg-surface-hover border border-white/10 text-text text-sm font-bold tracking-wide py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-sec transition-colors cursor-pointer w-full md:w-[450px]"
          >
            {availableDates.map(summary => (
              <option key={summary.date} value={summary.date}>
                {formatDropdownDate(summary)}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            <ChevronDown size={16} />
          </div>
        </div>
      </h2>

      <div className="relative pt-4 min-h-[200px]">
        {isLoadingDay ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/50 backdrop-blur-sm z-20 rounded-2xl">
            <Loader2 size={32} className="text-sec animate-spin opacity-80" />
          </div>
        ) : null}

        {activeDayData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <TimelineDayCard day={activeDayData} />
          </div>
        )}
      </div>
    </div>
  );
};
