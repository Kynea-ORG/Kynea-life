'use client';
import { CalendarPlus, Download } from 'lucide-react';
import { buildIcs, googleCalendarUrl, type CalendarEvent } from '@/lib/bookings/dates';

/** Botones para guardar la clase en el calendario del alumno (Google o archivo .ics). */
export default function AddToCalendar({ event, uid, className = '' }: { event: CalendarEvent; uid: string; className?: string }) {
  const downloadIcs = () => {
    const blob = new Blob([buildIcs(event, uid)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clase-kynea.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm inline-flex items-center gap-1.5">
        <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Google Calendar
      </a>
      <button type="button" onClick={downloadIcs} className="btn-outline btn-sm inline-flex items-center gap-1.5">
        <Download className="w-4 h-4" aria-hidden="true" /> Apple / Outlook
      </button>
    </div>
  );
}
