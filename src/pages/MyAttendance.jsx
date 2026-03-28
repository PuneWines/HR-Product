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

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [isDemo, setIsDemo] = useState(false);

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
      const cachedId = localStorage.getItem("employeeId");

      // Robust identifiers from login session
      const identifiers = [
        user.Username,
        user.username,
        user.Name,
        user.name,
        user.SalesPersonId,
        user.EmployeeID,
        user.EmpID,
        user.id,
        user.ID,
        cachedId
      ].filter(Boolean).map(id => id.toString().trim().toLowerCase());

      // UPDATED SCRIPT URL AND SPREADSHEET ID
      const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybtkq0iB4NTrw5jHcpjkwyncpLZlBGpgADUxq2nuGdX36nWlE2zum-8DBmsQgu-FzhTQ/exec';
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
      })).filter(record => {
        const colA = record.employeeCode.toString().trim().toLowerCase();
        const colB = record.employeeName.toString().trim().toLowerCase();
        return identifiers.some(id => colA === id || colB === id);
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

  const totalDays = filteredAttendance.length;
  const presentDays = filteredAttendance.filter(r => r.status.trim().toLowerCase() === 'present').length;
  const absentDays = totalDays - presentDays;
  const totalHours = filteredAttendance.reduce((sum, r) => {
    const val = r.actualTotalDuration.toString().replace(/:/g, '.');
    return sum + (parseFloat(val) || 0);
  }, 0);

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
        <StatCard title="Total Duration" value={totalHours.toFixed(2)} icon={Clock} colorClass="bg-indigo-500" />
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
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle size={40} className="text-gray-200" />
                      <p className="text-gray-500 font-medium">No records found for your ID in this period.</p>
                      <button onClick={fetchDataSheet} className="text-xs font-black text-indigo-600 hover:underline">RETRY SYNC</button>
                    </div>
                  </td>
                </tr>
              ) : filteredAttendance.map((record, index) => (
                <tr key={index} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 text-sm font-bold text-gray-900">{record.employeeCode}</td>
                  <td className="px-6 py-5 text-sm font-medium text-gray-700">{record.employeeName}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-bold">{formatSheetDate(record.date)}</td>
                  <td className="px-6 py-5 text-sm text-green-600 font-bold">{formatSheetTime(record.inTime)}</td>
                  <td className="px-6 py-5 text-sm text-red-600 font-bold">{formatSheetTime(record.outTime)}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">{formatSheetTime(record.totalDuration)}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">{formatSheetTime(record.totalWithLunchDuration)}</td>
                  <td className="px-6 py-5 text-xs text-amber-600 font-bold flex items-center gap-1 mt-4">
                    <Coffee size={12} /> {formatSheetTime(record.lunchTime)}
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-indigo-600">{formatSheetTime(record.actualTotalDuration)}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${record.status.trim().toLowerCase() === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
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