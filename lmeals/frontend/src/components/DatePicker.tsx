import React, { useState, useRef, useEffect } from 'react';
import { useDatePicker, DPDay } from '@rehookify/datepicker';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import moment from 'moment';

interface DatePickerProps {
    startDate: string;
    endDate: string;
    onRangeChange: (start: string, end: string) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ startDate, endDate, onRangeChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Convert string dates to Date objects for the hook
    const selectedDates = [
        moment(startDate).toDate(),
        moment(endDate).toDate()
    ];

    const {
        data: { calendars, weekDays },
        propGetters: { dayButton, addOffset, subtractOffset },
    } = useDatePicker({
        selectedDates,
        onDatesChange: (dates) => {
            if (dates.length === 1) {
                // First selection: set both to start
                const dateStr = moment(dates[0]).format('YYYY-MM-DD');
                onRangeChange(dateStr, dateStr);
            } else if (dates.length === 2) {
                // Second selection: sort and set range
                const start = moment(dates[0]);
                const end = moment(dates[1]);
                if (start.isAfter(end)) {
                    onRangeChange(end.format('YYYY-MM-DD'), start.format('YYYY-MM-DD'));
                } else {
                    onRangeChange(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
                }
                setIsOpen(false);
            }
        },
        dates: {
            mode: 'range',
        },
    });

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { month, year, days } = calendars[0];

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all text-slate-700 dark:text-slate-200"
            >
                <CalendarIcon size={18} className="text-rose-500" />
                <span className="font-medium">
                    {moment(startDate).format('MMM D')} - {moment(endDate).format('MMM D')}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left min-w-[320px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="text-rose-500 font-bold">{month}</span>
                            <span className="text-slate-400 font-light">{year}</span>
                        </h3>
                        <div className="flex gap-1">
                            <button
                                {...subtractOffset({ months: 1 })}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                {...addOffset({ months: 1 })}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map((d) => (
                            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day) => {
                            const { selected, range, $date, day: dayNum, inCurrentMonth, now } = day;

                            return (
                                <button
                                    key={$date.toString()}
                                    {...dayButton(day)}
                                    className={`
                    w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-all relative
                    ${!inCurrentMonth ? 'opacity-20 pointer-events-none' : 'hover:bg-rose-50 dark:hover:bg-rose-900/20'}
                    ${selected ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-200 dark:shadow-rose-900/30' : 'text-slate-700 dark:text-slate-300'}
                    ${range.includes('in-range') || range.includes('range-start') || range.includes('range-end') ? 'bg-rose-50 dark:bg-rose-900/10' : ''}
                  `}
                                >
                                    {dayNum}
                                    {now && !selected && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-rose-500 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                        <div className="flex gap-2 text-slate-400">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-rose-600 rounded-full" /> Selected
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-rose-50 dark:bg-rose-900/10 rounded-full" /> Range
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="font-bold text-rose-600 hover:text-rose-700 uppercase tracking-tighter"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
