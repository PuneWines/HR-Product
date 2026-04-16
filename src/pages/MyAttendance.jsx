import React, { useEffect, useState } from 'react';
import {
  Calendar, Clock, CheckCircle2, XCircle, Info,
  Search, Filter, Download, ArrowUpRight, ArrowDownRight,
  User, Hash, Timer, Coffee, AlertCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const MyAttendance = () => {
  const DUMMY_ATTENDANCE = [
    {
      employeeCode: 'DEMO101', employeeName: 'Sample Employee', date: '01/04/2024',
      inTime: '09:00:00 AM', outTime: '06:00:00 PM', totalDuration: '9:00:00',
      totalWithLunchDuration: '8:00:00', lunchTime: '1:00:00', actualTotalDuration: '8:00:00',
      status: 'Present', missAdjustCondition: 'None', month: 'April', year: '2024'
    },
    {
      employeeCode: 'DEMO101', employeeName: 'Sample Employee', date: '02/04/2024',
      inTime: '09:15:00 AM', outTime: '06:15:00 PM', totalDuration: '9:00:00',
      totalWithLunchDuration: '8:00:00', lunchTime: '1:00:00', actualTotalDuration: '8:00:00',
      status: 'Present', missAdjustCondition: 'Late Entry', month: 'April', year: '2024'
    }
  ];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [isDemo, setIsDemo] = useState(false);

  const timeToSeconds = (timeStr) => {
    if (!timeStr || timeStr === '-' || timeStr === '0.0' || timeStr === '0') return 0;
    try {
      const str = timeStr.toString().trim();

      // Handle Numeric time (e.g., 0.465)
      if (!isNaN(str) && !str.includes(':')) {
        const val = parseFloat(str);
        if (val > 0 && val < 1) return Math.floor(val * 24 * 3600);
      }

      // Handle AM/PM formats
      const ampmMatch = str.match(/(\d{1,2}):(\d{2})(:(\d{2}))?\s*(AM|PM)/i);
      if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        let m = parseInt(ampmMatch[2], 10);
        let s = ampmMatch[4] ? parseInt(ampmMatch[4], 10) : 0;
        const ampm = ampmMatch[5].toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 3600 + m * 60 + s;
      }

      // Handle Dates or strings with colons
      if (str.includes(':')) {
        // If it looks like a full date (e.g. 1899-12-30 11:10:00)
        if (str.includes('-') || str.includes('T')) {
          const d = new Date(str.replace(' ', 'T'));
          if (!isNaN(d.getTime())) return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        }

        const parts = str.match(/(\d{1,2}):(\d{2})(:(\d{2}))?/);
        if (parts) {
          const h = parseInt(parts[1], 10);
          const m = parseInt(parts[2], 10);
          const s = parts[4] ? parseInt(parts[4], 10) : 0;
          return h * 3600 + m * 60 + s;
        }
      }
    } catch (e) { return 0; }
    return 0;
  };

  const secondsToTime = (totalSecs) => {
    if (!totalSecs || totalSecs === 0) return '-';
    let s = Math.abs(totalSecs);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const sign = totalSecs < 0 ? '-' : '';
    const h12 = hrs % 12 || 12;
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    return `${sign}${h12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} ${ampm}`;
  };

  const durationToSecs = (val) => {
    if (!val || val === '0' || val === '-') return 0;
    const str = val.toString().trim();

    // Handle Date-like strings representing durations
    if (str.includes('-') || str.includes('T')) {
      const d = new Date(str.replace(' ', 'T'));
      if (!isNaN(d.getTime())) return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    }

    const parts = str.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let s = parts[2] ? parseInt(parts[2], 10) : 0;
      // If hour is suspiciously like a year, it's a date parsing fail
      if (h > 1000) h = 0;
      return h * 3600 + m * 60 + s;
    }

    const floatVal = parseFloat(str.replace(/:/g, '.'));
    if (!isNaN(floatVal) && floatVal < 24) return Math.floor(floatVal * 3600);
    return 0;
  };

  const formatSecsToDuration = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatSheetDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return dateStr;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatSheetTime = (timeStr) => {
    if (!timeStr || timeStr === '-' || timeStr === '0.0' || timeStr === '0') return timeStr;
    try {
      // Handle "1899-12-30T..." or simple "09:00:00"
      const date = new Date(timeStr.toString().includes('T') ? timeStr : `1970-01-01T${timeStr}`);
      if (isNaN(date.getTime())) {
        // Fallback for duration-like strings "9.30"
        return timeStr;
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return timeStr;
    }
  };

  const fetchDataSheet = async () => {
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : {};
      // Strictly match using the logged-in user's Name or Username
      const loggedInName = (user.Name || user.name || '').toString().trim().toLowerCase();
      const loggedInUsername = (user.Username || user.username || '').toString().trim().toLowerCase();

      // UPDATED SCRIPT URL AND SPREADSHEET ID
      const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1QHKttecIhZwoyh8-xo_wzqHgxIuFr9Tci8L803T1q0nKkjA1w26soUXSffkMY4E0sQ/exec';

      const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

      const response = await fetch(
        `${SCRIPT_URL}?sheet=Data&action=fetch&spreadsheetId=${SPREADSHEET_ID}`
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch attendance data');

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) throw new Error('Expected array data not received');

      const dataRows = rawData.length > 1 ? rawData.slice(1) : [];

      const processedData = dataRows.map((row) => ({
        employeeCode: row[0] || '',
        employeeName: row[1] || '',
        date: row[2] || '',
        inTime: row[3] || '',
        outTime: row[4] || '',
        totalDuration: row[5] || '0',
        totalWithLunchDuration: row[6] || '0',
        lunchTime: row[7] || '0',
        actualTotalDuration: row[8] || '0',
        status: row[9] || '',
        missAdjustCondition: row[10] || '',
        month: row[12] || '',
        year: row[11] || '',
        dateKey: row[2] ? (new Date(row[2]).toISOString().split('T')[0]) : '' // Standardized YYYY-MM-DD for deduplication
      })).filter(record => {
        const rowEmployeeCode = record.employeeCode.toString().trim().toLowerCase();
        const rowEmployeeName = record.employeeName.toString().trim().toLowerCase();

        // Priority match by Name
        if (loggedInName && rowEmployeeName === loggedInName) return true;

        // Fallback match by Employee Code / Username
        if (loggedInUsername && rowEmployeeCode === loggedInUsername) return true;

        return false;
      });

      if (processedData.length > 0) {
        setAttendanceData(processedData);
        setIsDemo(false);
        // Default to latest available month/year in data
        setSelectedMonth(processedData[0].month);
        setSelectedYear(processedData[0].year);
      } else {
        console.warn('No matching attendance records found for logged in user.');
        setAttendanceData(DUMMY_ATTENDANCE);
        setIsDemo(true);
        setSelectedMonth('April');
        setSelectedYear('2024');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setAttendanceData(DUMMY_ATTENDANCE);
      setIsDemo(true);
      setSelectedMonth('April');
      setSelectedYear('2024');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSheet();
  }, []);

  const filteredAttendance = attendanceData.filter(record =>
    (selectedMonth === '' || record.month.toString().toLowerCase() === selectedMonth.toLowerCase()) &&
    (selectedYear === '' || record.year.toString() === selectedYear.toString())
  );

  // --- NEW LOGIC: Deduplicated Present/Absent calculation ---
  const today = new Date();
  const currentMonthName = monthNames[today.getMonth()];
  const currentYearStr = today.getFullYear().toString();

  // Deduplicate by date: each unique date only counts once
  const uniqueDates = [...new Map(filteredAttendance.map(item => [item.dateKey || item.date, item])).values()];

  // Total Days: Expected days in the selected period (1st to Today or 1st to End of Month)
  let totalDaysInRange = 0;
  if (selectedMonth && selectedYear) {
    const isCurrentMonth = selectedMonth.toString().toLowerCase() === currentMonthName.toLowerCase();
    const isCurrentYear = selectedYear.toString() === currentYearStr;

    if (isCurrentMonth && isCurrentYear) {
      // For current month, we only count up to Today
      totalDaysInRange = today.getDate();
    } else if (
      parseInt(selectedYear) < today.getFullYear() ||
      (parseInt(selectedYear) === today.getFullYear() && monthNames.indexOf(selectedMonth) < today.getMonth())
    ) {
      // For past months, count full month
      const monthIdx = monthNames.indexOf(selectedMonth) + 1;
      totalDaysInRange = getDaysInMonth(monthIdx, parseInt(selectedYear));
    }
  }

  // --- CONSOLIDATION FOR TABLE DISPLAY ---
  const consolidatedByDate = filteredAttendance.reduce((acc, curr) => {
    const key = curr.dateKey || curr.date;
    if (!acc[key]) {
      acc[key] = { ...curr };
      return acc;
    }
    const combined = acc[key];

    // Compare and update In/Out times
    const currIn = timeToSeconds(curr.inTime);
    const combIn = timeToSeconds(combined.inTime);
    if (currIn > 0 && (combIn === 0 || currIn < combIn)) {
      combined.inTime = curr.inTime;
    }

    const currOut = timeToSeconds(curr.outTime);
    const combOut = timeToSeconds(combined.outTime);
    if (currOut > 0 && currOut > combOut) {
      combined.outTime = curr.outTime;
    }

    // Sum durations
    const currLunch = durationToSecs(curr.lunchTime);
    const combLunch = durationToSecs(combined.lunchTime);
    combined.lunchTime = formatSecsToDuration(combLunch + currLunch);

    const currTotal = durationToSecs(curr.totalDuration);
    const combTotal = durationToSecs(combined.totalDuration);
    combined.totalDuration = formatSecsToDuration(combTotal + currTotal);

    const currWithLunch = durationToSecs(curr.totalWithLunchDuration);
    const combWithLunch = durationToSecs(combined.totalWithLunchDuration);
    combined.totalWithLunchDuration = formatSecsToDuration(combWithLunch + currWithLunch);

    const currActual = durationToSecs(curr.actualTotalDuration);
    const combActual = durationToSecs(combined.actualTotalDuration);
    combined.actualTotalDuration = formatSecsToDuration(combActual + currActual);

    // Status preference
    if (curr.status.trim().toLowerCase() === 'present') {
      combined.status = 'Present';
    }

    return acc;
  }, {});

  // Post-process consolidation to handle Punch Miss and 8-Hour Rule logic
  Object.values(consolidatedByDate).forEach(record => {
    const inSecs = timeToSeconds(record.inTime);
    const outSecs = timeToSeconds(record.outTime);
    const actualSecs = durationToSecs(record.actualTotalDuration);

    // STRICT check: only missing if effectively 0 AND literal string is empty or '-'
    const hasIn = inSecs > 0 || (record.inTime && record.inTime !== '-' && record.inTime !== '0');
    const hasOut = outSecs > 0 || (record.outTime && record.outTime !== '-' && record.outTime !== '0');

    const isHoliday = record.status.trim().toLowerCase() === 'holiday' || record.status.trim().toLowerCase() === 'leave';

    if (!isHoliday) {
      if (!hasIn || !hasOut) {
        record.status = 'Absent';
        record.punchMiss = true;
        if (!hasIn && hasOut) {
          record.punchMissReason = 'In Time Punch Miss';
        } else if (!hasOut && hasIn) {
          record.punchMissReason = 'Out Time Punch Miss';
        } else {
          record.punchMissReason = 'Punch Miss';
        }
      } else if (actualSecs < 8 * 3600) {
        // Less than 8 hours work rule
        record.status = 'Absent';
        record.punchMiss = true;
        record.punchMissReason = 'Under 8 Hours Shift';
      } else {
        // Full shift worked
        record.status = 'Present';
        record.punchMiss = false;
        record.punchMissReason = '';
      }
    }
  });

  const displayAttendance = Object.values(consolidatedByDate).sort((a, b) => {
    const da = new Date(a.dateKey || a.date);
    const db = new Date(b.dateKey || b.date);
    return da - db;
  });

  // Calculate final dashboard stats after consolidation and Punch Miss logic
  const presentDays = displayAttendance.filter(r => r.status.trim().toLowerCase() === 'present').length;
  const absentDays = Math.max(0, totalDaysInRange - presentDays);
  const totalDays = displayAttendance.length; // Now reflects unique days

  const totalSecs = filteredAttendance.reduce((sum, r) => {
    return sum + durationToSecs(r.actualTotalDuration);
  }, 0);
  const totalDurationFormatted = formatSecsToDuration(totalSecs);

  const months = [...new Set(attendanceData.map(r => r.month))].filter(Boolean);
  const years = [...new Set(attendanceData.map(r => r.year))].filter(Boolean);

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 transition-all hover:-translate-y-1">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${colorClass} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Attendance</h1>
            {isDemo && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 animate-pulse">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Timer size={16} className="text-indigo-500" />
            Showing records for logged-in user.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-2 border-r border-gray-100 mr-2">
            <Filter size={16} className="text-indigo-400" />
            <span className="text-xs font-bold text-gray-400 uppercase">Filters</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer border-l border-gray-100 pl-4"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Present Days" value={presentDays} icon={CheckCircle2} colorClass="bg-green-500" />
        <StatCard title="Absent Days" value={absentDays} icon={XCircle} colorClass="bg-red-500" />
        <StatCard title="Total Duration" value={totalDurationFormatted} icon={Clock} colorClass="bg-indigo-500" />
        <StatCard title="Total Records" value={totalDays} icon={FileText} colorClass="bg-blue-500" />
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            Attendance Records - {selectedMonth || 'All'} {selectedYear || 'Time'}
          </h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Calendar size={14} className="text-indigo-500" />
            Sheet Data: A2:J
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-20 bg-white shadow-sm ring-1 ring-gray-100">
              <tr className="bg-white text-gray-400 uppercase text-[10px] font-black tracking-widest">
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Emp Code</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Emp Name</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Date</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 text-green-600 whitespace-nowrap">IN Time</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 text-red-600 whitespace-nowrap">OUT Time</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Total Duration</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Total With Lunch Duration</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Lunch Time</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 text-indigo-600 whitespace-nowrap">Actual</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium font-bold">Matching User ID...</p>
                    </div>
                  </td>
                </tr>
              ) : displayAttendance.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle size={40} className="text-gray-200" />
                      <p className="text-gray-500 font-medium">No records found for your ID in this period.</p>
                      <button onClick={fetchDataSheet} className="text-xs font-black text-indigo-600 hover:underline">RETRY SYNC</button>
                    </div>
                  </td>
                </tr>
              ) : displayAttendance.map((record, index) => (
                <tr key={index} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 text-sm font-bold text-gray-900">{record.employeeCode}</td>
                  <td className="px-6 py-5 text-sm font-medium text-gray-700">{record.employeeName}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-bold">{formatSheetDate(record.date)}</td>
                  <td className="px-6 py-5 text-sm text-green-600 font-bold">{formatSheetTime(record.inTime)}</td>
                  <td className="px-6 py-5 text-sm text-red-600 font-bold">{formatSheetTime(record.outTime)}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">{record.totalDuration}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">{record.totalWithLunchDuration}</td>
                  <td className="px-6 py-5 text-xs text-amber-600 font-bold flex items-center gap-1 mt-4">
                    <Coffee size={12} /> {record.lunchTime}
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-indigo-600">{record.actualTotalDuration}</td>
                  <td className="px-6 py-5">
                    <span
                      title={record.punchMiss ? record.punchMissReason : ''}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-full cursor-help transition-all ${record.status.trim().toLowerCase() === 'present'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700 shadow-sm border border-red-200'
                        }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;