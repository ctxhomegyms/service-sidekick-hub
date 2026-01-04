import { format } from 'date-fns';
import { MapPin, Clock, Calendar, Navigation, User } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';

interface MapJobCardProps {
  job: {
    id: string;
    title: string;
    status: string;
    priority: string;
    address: string | null;
    city: string | null;
    state: string | null;
    scheduled_time: string | null;
    time_window_start: string | null;
    time_window_end: string | null;
    customer?: { name: string } | null;
  };
  eta?: {
    durationMinutes: number;
    distanceMiles: number;
  } | null;
  isLate?: boolean;
  technicianName?: string | null;
}

export function MapJobCard({ job, eta, isLate, technicianName }: MapJobCardProps) {
  const fullAddress = [job.address, job.city, job.state].filter(Boolean).join(', ');

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[240px] max-w-[280px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm text-foreground truncate flex-1">
          {job.title}
        </h3>
        {isLate && (
          <span className="text-destructive text-xs font-medium">⚠️ Late</span>
        )}
      </div>

      {/* Status & Priority */}
      <div className="flex gap-2 mb-3">
        <StatusBadge status={job.status as 'pending' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled'} />
        <PriorityBadge priority={job.priority as 'low' | 'medium' | 'high' | 'urgent'} />
      </div>

      {/* Customer */}
      {job.customer?.name && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{job.customer.name}</span>
        </div>
      )}

      {/* Address */}
      {fullAddress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{fullAddress}</span>
        </div>
      )}

      {/* Scheduled Time */}
      {job.scheduled_time && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>Scheduled: {job.scheduled_time.slice(0, 5)}</span>
        </div>
      )}

      {/* Time Window */}
      {job.time_window_start && job.time_window_end && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span className={isLate ? 'text-destructive' : ''}>
            Window: {job.time_window_start.slice(0, 5)} - {job.time_window_end.slice(0, 5)}
          </span>
        </div>
      )}

      {/* ETA Section */}
      {eta && (
        <div className={`flex items-center gap-2 text-xs font-medium mt-3 pt-2 border-t border-border ${isLate ? 'text-destructive' : 'text-primary'}`}>
          <Navigation className="w-3.5 h-3.5" />
          <span>
            ETA: {eta.durationMinutes} min ({eta.distanceMiles} mi)
          </span>
        </div>
      )}

      {/* Technician */}
      {technicianName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-semibold">
            {technicianName.charAt(0)}
          </div>
          <span>{technicianName}</span>
        </div>
      )}

      {/* View Details Link */}
      <div className="mt-3 pt-2 border-t border-border">
        <span className="text-xs text-primary hover:underline cursor-pointer">
          Click to view details →
        </span>
      </div>
    </div>
  );
}

// Function to render the card as HTML string for Mapbox popup
export function renderMapJobCardHTML(props: MapJobCardProps): string {
  const { job, eta, isLate, technicianName } = props;
  const fullAddress = [job.address, job.city, job.state].filter(Boolean).join(', ');

  return `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      min-width: 240px;
      max-width: 280px;
    ">
      <!-- Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
        <h3 style="font-weight: 600; font-size: 14px; color: hsl(var(--foreground)); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
          ${job.title}
        </h3>
        ${isLate ? '<span style="color: #ef4444; font-size: 12px; font-weight: 500;">⚠️ Late</span>' : ''}
      </div>

      <!-- Status & Priority -->
      <div style="display: flex; gap: 6px; margin-bottom: 10px;">
        <span style="
          display: inline-flex;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
          background: ${getStatusColor(job.status)}20;
          color: ${getStatusColor(job.status)};
        ">
          ${formatStatus(job.status)}
        </span>
        <span style="
          display: inline-flex;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
          background: ${getPriorityColor(job.priority)}20;
          color: ${getPriorityColor(job.priority)};
        ">
          ${job.priority}
        </span>
      </div>

      ${job.customer?.name ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-bottom: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${job.customer.name}</span>
        </div>
      ` : ''}

      ${fullAddress ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-bottom: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fullAddress}</span>
        </div>
      ` : ''}

      ${job.scheduled_time ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-bottom: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Scheduled: ${job.scheduled_time.slice(0, 5)}</span>
        </div>
      ` : ''}

      ${job.time_window_start && job.time_window_end ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${isLate ? '#ef4444' : '#6b7280'}; margin-bottom: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Window: ${job.time_window_start.slice(0, 5)} - ${job.time_window_end.slice(0, 5)}</span>
        </div>
      ` : ''}

      ${eta ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb; color: ${isLate ? '#ef4444' : '#8b5cf6'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          <span>ETA: ${eta.durationMinutes} min (${eta.distanceMiles} mi)</span>
        </div>
      ` : ''}

      ${technicianName ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <div style="width: 20px; height: 20px; border-radius: 50%; background: hsl(173 58% 39% / 0.2); display: flex; align-items: center; justify-content: center; color: hsl(173 58% 39%); font-size: 10px; font-weight: 600;">
            ${technicianName.charAt(0)}
          </div>
          <span>${technicianName}</span>
        </div>
      ` : ''}

      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
        <span style="font-size: 11px; color: #3b82f6;">Click to view details →</span>
      </div>
    </div>
  `;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    scheduled: '#3b82f6',
    en_route: '#8b5cf6',
    in_progress: '#10b981',
    completed: '#6b7280',
    cancelled: '#ef4444',
  };
  return colors[status] || '#6b7280';
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  };
  return colors[priority] || '#6b7280';
}

function formatStatus(status: string): string {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}
