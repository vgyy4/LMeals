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

    // Buffer state to handle range picking without immediate parent sync resetting the hook
    const [internalDates, setInternalDates] = useState<Date[]>([
        moment(startDate).toDate(),
        moment(endDate).toDate()
    ]);

    // Sync internal state when parent props change externally (not during picking)
    useEffect(() => {
        if (!isOpen) {
            setInternalDates([
                moment(startDate).toDate(),
                moment(endDate).toDate()
            ]);
        }
    }, [startDate, endDate, isOpen]);

    const {
        data: { calendars, weekDays, selectedDates: hookSelectedDates },
        propGetters: { dayButton, addOffset, subtractOffset },
    } = useDatePicker({
        selectedDates: internalDates,
        onDatesChange: (dates) => {
            setInternalDates(dates);
            if (dates.length === 2) {
                const start = moment(dates[0]);
                const end = moment(dates[1]);
                if (start.isAfter(end)) {
                    onRangeChange(end.format('YYYY-MM-DD'), start.format('YYYY-MM-DD'));
                } else {
                    onRangeChange(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
                }
                // Optional: close on second click
                // setIsOpen(false);
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
                className="flex items-center gap-2 px-4 py-2 bg-white border border-p-sky/20 rounded-xl shadow-sm hover:shadow-md transition-all text-slate-700 outline-none"
            >
                <CalendarIcon size={18} className="text-p-coral" />
                <span className="font-semibold text-sm">
                    {moment(startDate).format('MMM D')} — {moment(endDate).format('MMM D')}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 p-4 bg-white/95 backdrop-blur-xl border border-p-sky/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left min-w-[320px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                            <span className="text-p-coral">{month}</span>
                            <span className="text-slate-300 font-light">{year}</span>
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
                    ${!inCurrentMonth ? 'opacity-20 pointer-events-none' : 'hover:bg-p-coral/10'}
                    ${selected ? 'bg-p-coral text-white font-bold shadow-sm' : 'text-slate-700'}
                    ${range.includes('in-range') || range.includes('range-start') || range.includes('range-end') ? 'bg-p-coral/5' : ''}
                  `}
                                >
                                    {dayNum}
                                    {now && !selected && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-p-coral rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                        <div className="flex gap-2 text-slate-400">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-p-coral rounded-full" /> Selected
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-p-coral/10 rounded-full" /> Range
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="font-black text-p-coral hover:text-red-500 uppercase tracking-wider"
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
