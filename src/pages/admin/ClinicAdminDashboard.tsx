import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { api, isApiEnabled } from '@/lib/api';
import {
  Users, Building2, CalendarDays, DollarSign, BarChart3,
  UserPlus, ClipboardCheck, BedDouble, Settings2, TrendingUp,
  ChevronRight, Loader2, AlertTriangle, UserCheck,
} from 'lucide-react';

interface OrgInfo {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
}

interface StaffSummary {
  total: number;
  doctors: number;
  nurses: number;
  other: number;
}

export default function ClinicAdminDashboard() {
  const { user } = useAuthStore();
  const { patients, appointments, alerts, staff } = useAppStore();
  const navigate = useNavigate();

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ').find(w => !/^(mr|mrs|ms|dr)\.?$/i.test(w)) ?? user?.name ?? '';

  // Load org info + staff summary
  useEffect(() => {
    if (!isApiEnabled()) { setLoadingOrg(false); return; }
    Promise.all([
      api.get<{ org: OrgInfo | null }>('/org/me').catch(() => ({ org: null })),
      api.get<{ staff: Array<{ role: string }> }>('/org/staff').catch(() => ({ staff: [] })),
    ]).then(([orgData, staffData]) => {
      setOrg(orgData.org);
      const s = staffData.staff ?? [];
      setStaffSummary({
        total: s.length,
        doctors: s.filter(m => m.role === 'doctor').length,
        nurses: s.filter(m => m.role === 'nurse').length,
        other: s.filter(m => !['doctor','nurse'].includes(m.role)).length,
      });
    }).catch(err => {
      setOrgError(err instanceof Error ? err.message : 'Could not load organisation data');
    }).finally(() => setLoadingOrg(false));
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayApts = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled');
  const pendingBookings = appointments.filter(a => a.id.startsWith('BR-') && a.status === 'scheduled');
  const unackAlerts = alerts.filter(a => !a.acknowledged);
  const totalPatients = patients.length;
  const activeStaff = staff.filter(s => s.status === 'active').length;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Greeting ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>
            {greeting}, {firstName} 👋
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
            {org ? `Managing ${org.name}` : 'Clinic & Operations Dashboard'}
          </div>
        </div>
        <button
          onClick={() => navigate('/app/org/staff')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0d9488', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}>
          <UserPlus size={15} /> Add Staff
        </button>
      </div>

      {/* Org info card */}
      {loadingOrg ? (
        <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f3f4f6', padding: '20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={16} style={{ color: '#0d9488', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Loading organisation info…</span>
        </div>
      ) : orgError ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 10 }}>
          <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: '#dc2626' }}>{orgError}</span>
        </div>
      ) : org ? (
        <div style={{ background: 'linear-gradient(135deg, #f0fdfa, #e6f4f1)', border: '1.5px solid #99f6e4', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, background: '#0d9488', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={22} style={{ color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040' }}>{org.name}</div>
            <div style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, textTransform: 'capitalize' }}>{org.type}</div>
            {(org.address || org.city) && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {[org.address, org.city, org.state].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <Link to="/app/settings" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
            <Settings2 size={14} /> Settings
          </Link>
        </div>
      ) : (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
          Organisation details not found. <Link to="/org-register" style={{ color: '#d97706', fontWeight: 700 }}>Complete registration →</Link>
        </div>
      )}

      {/* ── KPI tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { icon: <Users size={18} style={{ color: '#6366f1' }} />, bg: '#eef2ff', label: 'Total Patients', value: totalPatients, sub: 'Registered', to: '/app/patients' },
          { icon: <CalendarDays size={18} style={{ color: '#0d9488' }} />, bg: '#f0fdfa', label: "Today's Appointments", value: todayApts.length, sub: `${pendingBookings.length} pending requests`, to: '/app/bookings' },
          { icon: <UserCheck size={18} style={{ color: '#8b5cf6' }} />, bg: '#f5f3ff', label: 'Active Staff', value: staffSummary?.total ?? activeStaff, sub: `${staffSummary?.doctors ?? 0} doctors · ${staffSummary?.nurses ?? 0} nurses`, to: '/app/org/staff' },
          { icon: <AlertTriangle size={18} style={{ color: '#ef4444' }} />, bg: '#fef2f2', label: 'Active Alerts', value: unackAlerts.length, sub: unackAlerts.length > 0 ? 'Need attention' : 'All clear', to: '/app/alerts' },
        ].map(s => (
          <Link key={s.label} to={s.to} style={{ textDecoration: 'none', background: s.bg, borderRadius: 14, padding: '16px 18px', display: 'block', transition: 'all 0.15s' }}
            onMouseOver={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
            onMouseOut={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}>
            <div style={{ width: 38, height: 38, background: 'white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { icon: <UserPlus size={15} />, label: 'Add Staff Member',     to: '/app/org/staff' },
          { icon: <CalendarDays size={15} />, label: 'View Appointments', to: '/app/schedule' },
          { icon: <BedDouble size={15} />,  label: 'Beds & Wards',        to: '/app/beds' },
          { icon: <DollarSign size={15} />, label: 'Billing',             to: '/app/billing' },
          { icon: <BarChart3 size={15} />,  label: 'Analytics',           to: '/app/analytics' },
        ].map(q => (
          <Link key={q.label} to={q.to}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, color: '#374151', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLElement).style.color = '#0d9488'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}>
            {q.icon}{q.label}
          </Link>
        ))}
      </div>

      {/* ── Two-column main ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>

        {/* LEFT: Today's appointments */}
        <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={15} style={{ color: '#0d9488' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Today's Schedule</span>
              {todayApts.length > 0 && (
                <span style={{ background: '#0d9488', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{todayApts.length}</span>
              )}
            </div>
            <Link to="/app/schedule" style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
          </div>

          {todayApts.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CalendarDays size={22} style={{ color: '#d1d5db' }} />
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>No appointments today</div>
            </div>
          ) : (
            <>
              {todayApts.slice(0, 8).map(apt => (
                <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ minWidth: 46, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{apt.time}</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#6b7280', flexShrink: 0 }}>
                    {apt.patientName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{apt.patientName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.reason || 'OPD'}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: apt.status === 'completed' ? '#10b981' : apt.status === 'checked-in' ? '#0d9488' : '#6366f1', background: apt.status === 'completed' ? '#ecfdf5' : apt.status === 'checked-in' ? '#f0fdfa' : '#eef2ff', borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>
                    {apt.status === 'checked-in' ? 'In Consult' : apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </div>
                </div>
              ))}
              <div style={{ padding: '12px 20px', textAlign: 'center' }}>
                <Link to="/app/schedule" style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>See full schedule →</Link>
              </div>
            </>
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Pending booking requests */}
          <div style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${pendingBookings.length > 0 ? '#fde68a' : '#f3f4f6'}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: pendingBookings.length > 0 ? '#fffbeb' : '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <ClipboardCheck size={14} style={{ color: pendingBookings.length > 0 ? '#d97706' : '#9ca3af' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Booking Requests</span>
                {pendingBookings.length > 0 && (
                  <span style={{ background: '#f59e0b', color: 'white', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{pendingBookings.length}</span>
                )}
              </div>
              <Link to="/app/bookings" style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            {pendingBookings.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 13, color: '#9ca3af' }}>No pending requests</div>
            ) : (
              pendingBookings.slice(0, 3).map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{b.patientName}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{b.date} · {b.time}</div>
                  </div>
                  <Link to="/app/bookings" style={{ fontSize: 11, color: '#0d9488', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                    Review <ChevronRight size={12} />
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* Staff overview */}
          <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f3f4f6', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={14} style={{ color: '#6366f1' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Staff Overview</span>
              </div>
              <Link to="/app/org/staff" style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>Manage</Link>
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total Staff', value: staffSummary?.total ?? activeStaff, color: '#6366f1' },
                { label: 'Doctors', value: staffSummary?.doctors ?? 0, color: '#0d9488' },
                { label: 'Nurses', value: staffSummary?.nurses ?? 0, color: '#8b5cf6' },
                { label: 'Other', value: staffSummary?.other ?? 0, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick nav */}
          <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f3f4f6', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Operations</span>
            </div>
            {[
              { icon: <BedDouble size={14} style={{ color: '#0d9488' }} />, label: 'Beds & Wards', to: '/app/beds' },
              { icon: <DollarSign size={14} style={{ color: '#10b981' }} />, label: 'Billing', to: '/app/billing' },
              { icon: <TrendingUp size={14} style={{ color: '#6366f1' }} />, label: 'Analytics', to: '/app/analytics' },
              { icon: <Settings2 size={14} style={{ color: '#9ca3af' }} />, label: 'Clinic Settings', to: '/app/settings' },
            ].map(item => (
              <Link key={item.label} to={item.to}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid #f9fafb', textDecoration: 'none', transition: 'background 0.1s' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'white'}>
                <div style={{ width: 28, height: 28, background: '#f8fafc', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', flex: 1 }}>{item.label}</span>
                <ChevronRight size={14} style={{ color: '#d1d5db' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
