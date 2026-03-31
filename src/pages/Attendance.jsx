import React, { useEffect, useState } from 'react';
import { Search, Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

const Attendance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timeToSeconds = (timeStr) => {
    if (!timeStr || timeStr === '-' || timeStr === '0.0' || timeStr === '0') return 0;
    try {
      const timeMatch = timeStr.toString().match(/(\d+):(\d+):(\d+)/);
      if (timeMatch) {
        return parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10);
      }
      if (timeStr.toString().includes('T')) {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        }
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  const secondsToTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '-';
    const absSeconds = Math.abs(totalSeconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = absSeconds % 60;
    const sign = totalSeconds < 0 ? '-' : '';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    let startDate, endDate;
    try {
      if (startDateStr.toString().includes('/')) {
        const [startDay, startMonth, startYear] = startDateStr.toString().split('/').map(Number);
        startDate = new Date(startYear, startMonth - 1, startDay);
      } else {
        startDate = new Date(startDateStr);
      }
      
      if (endDateStr.toString().includes('/')) {
        const [endDay, endMonth, endYear] = endDateStr.toString().split('/').map(Number);
        endDate = new Date(endYear, endMonth - 1, endDay);
      } else {
        endDate = new Date(endDateStr);
      }
      const diffTime = endDate.getTime() - startDate.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch (e) {
      return 0;
    }
  };

  const formatTimeAMPM = (timeStr) => {
    if (!timeStr || timeStr === '-') return '-';
    if (timeStr.startsWith('-')) return timeStr;
    const parts = timeStr.toString().split(':');
    if (parts.length < 3) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const s = parts[2];
    
    const isPM = (h % 24) >= 12;
    const ampm = isPM ? 'PM' : 'AM';
    let displayH = h % 12;
    if (displayH === 0) displayH = 12;
    
    return `${displayH.toString().padStart(2, '0')}:${m}:${s} ${ampm}`;
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const MAIN_SCRIPT = 'https://script.google.com/macros/s/AKfycbybtkq0iB4NTrw5jHcpjkwyncpLZlBGpgADUxq2nuGdX36nWlE2zum-8DBmsQgu-FzhTQ/exec';
      const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';
      const DETAILS_SCRIPT = 'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec';

      const [attRes, joinRes, leaveRes] = await Promise.all([
        fetch(`${MAIN_SCRIPT}?sheet=Data&action=fetch&spreadsheetId=${SPREADSHEET_ID}`),
        fetch(`${DETAILS_SCRIPT}?sheet=JOINING&action=fetch`),
        fetch(`${DETAILS_SCRIPT}?sheet=Leave Management&action=fetch`)
      ]);

      if (!attRes.ok) throw new Error(`HTTP error! status: ${attRes.status}`);

      const [attResult, joinResult, leaveResult] = await Promise.all([
        attRes.json(),
        joinRes.ok ? joinRes.json() : { data: [] },
        leaveRes.ok ? leaveRes.json() : { data: [] }
      ]);

      if (!attResult.success) {
        throw new Error(attResult.error || 'Failed to fetch attendance data');
      }

      // Process Joining Data for Designations
      const joinData = Array.isArray(joinResult?.data) ? joinResult.data : [];
      const designationMap = {};
      if (joinData.length > 6) {
        joinData.slice(6).forEach(row => {
          const empName = (row[4] || '').toString().trim().toLowerCase();
          const designation = row[8] || '-';
          if (empName) designationMap[empName] = designation;
        });
      }

      // Process Leave Data for Holidays count
      const leaveData = Array.isArray(leaveResult?.data) ? leaveResult.data : [];
      const holidayMap = {};
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      
      if (leaveData.length > 1) {
        leaveData.slice(1).forEach(row => {
          const empId = (row[2] || '').toString().trim();
          const startDateStr = row[4];
          const endDateStr = row[5];
          const status = (row[7] || '').toString().toLowerCase().trim();

          if (status === 'approved' && startDateStr && empId) {
            let monthName = '';
            const strVal = startDateStr.toString();
            if (strVal.includes('/')) {
              const parts = strVal.split('/');
              if (parts.length === 3) {
                const mIndex = parseInt(parts[1], 10) - 1;
                if (mIndex >= 0 && mIndex < 12) monthName = monthNames[mIndex];
              }
            } else {
              const d = new Date(strVal);
              if (!isNaN(d.getTime())) {
                monthName = monthNames[d.getMonth()];
              }
            }

            if (monthName) {
              const key = `${empId}-${monthName}`;
              const days = calculateDays(startDateStr, endDateStr);
              if (days > 0) {
                holidayMap[key] = (holidayMap[key] || 0) + days;
              }
            }
          }
        });
      }

      // Process Attendance Data
      const rawData = attResult.data || attResult;
      const dataRows = Array.isArray(rawData) && rawData.length > 1 ? rawData.slice(1) : [];

      const processedData = dataRows.map((row) => ({
        employeeCode: row[0] || '',
        employeeName: row[1] || '',
        inTime: row[3] || '',
        outTime: row[4] || '',
        totalDuration: row[5] || '',
        totalWithLunchDuration: row[6] || '',
        lunchTime: row[7] || '',
        actualTotalDuration: row[8] || '',
        year: row[11] || '',
        month: row[12] || '',
      }));

      const groupedMap = new Map();
      processedData.forEach(row => {
        if (!row.employeeCode && !row.employeeName) return; 
        
        const monthKey = row.month ? row.month.toString().trim() : 'Unknown';
        const yearKey = row.year ? row.year.toString().trim() : 'Unknown';
        const key = `${row.employeeCode}-${monthKey}-${yearKey}`;
        
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            employeeCode: row.employeeCode,
            employeeName: row.employeeName,
            inTimeSecs: 0,
            outTimeSecs: 0,
            totalDurationSecs: 0,
            totalWithLunchDurationSecs: 0,
            lunchTimeSecs: 0,
            actualTotalDurationSecs: 0,
            year: yearKey,
            month: monthKey,
          });
        }

        const group = groupedMap.get(key);
        group.inTimeSecs += timeToSeconds(row.inTime);
        group.outTimeSecs += timeToSeconds(row.outTime);
        group.totalDurationSecs += timeToSeconds(row.totalDuration);
        group.totalWithLunchDurationSecs += timeToSeconds(row.totalWithLunchDuration);
        group.lunchTimeSecs += timeToSeconds(row.lunchTime);
        group.actualTotalDurationSecs += timeToSeconds(row.actualTotalDuration);
      });

      const finalGroupedData = Array.from(groupedMap.values()).map(g => {
        const empNameLower = g.employeeName.toString().trim().toLowerCase();
        const designation = designationMap[empNameLower] || 'N/A';
        const holidayKey = `${g.employeeCode}-${g.month}`;
        const holidays = holidayMap[holidayKey] || 0;

        return {
          year: g.year,
          employeeCode: g.employeeCode,
          employeeName: g.employeeName,
          designation,
          month: g.month,
          inTime: formatTimeAMPM(secondsToTime(g.inTimeSecs)),
          outTime: formatTimeAMPM(secondsToTime(g.outTimeSecs)),
          totalDuration: secondsToTime(g.totalDurationSecs),
          totalWithLunchDuration: secondsToTime(g.totalWithLunchDurationSecs),
          lunchTime: formatTimeAMPM(secondsToTime(g.lunchTimeSecs)),
          actualTotalDuration: secondsToTime(g.actualTotalDurationSecs),
          holidays
        };
      });

      setAttendanceData(finalGroupedData);
      
      if (finalGroupedData.length > 0) {
        const uniqueMonths = [...new Set(finalGroupedData.map(r => r.month))].filter(m => m !== 'Unknown');
        if (uniqueMonths.length > 0) setSelectedMonth(uniqueMonths[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const months = [...new Set(attendanceData.map(r => r.month))].filter(Boolean);
  const years = [...new Set(attendanceData.map(r => r.year))].filter(Boolean);

  const filteredData = attendanceData.filter(item => {
    const matchesSearch = 
      item.employeeName.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeCode.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMonth = selectedMonth ? item.month === selectedMonth : true;
    const matchesYear = selectedYear ? item.year.toString() === selectedYear : true;

    return matchesSearch && matchesMonth && matchesYear;
  });

  const downloadExcel = () => {
    const dataToExport = filteredData.map(item => ({
      'Year': item.year,
      'Employee Code': item.employeeCode,
      'Employee Name': item.employeeName,
      'Designation': item.designation,
      'Month': item.month,
      'IN Time': item.inTime,
      'OUT Time': item.outTime,
      'Total Duration': item.totalDuration,
      'Total With Lunch': item.totalWithLunchDuration,
      'Lunch Time': item.lunchTime,
      'Actual Duration': item.actualTotalDuration,
      'Holidays': item.holidays
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, `attendance_monthly_summary_${selectedMonth || 'all'}.xlsx`);
  };

  return (
    <div className="space-y-6 ml-50 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance Records Monthly</h1>
        <button
          onClick={downloadExcel}
          disabled={filteredData.length === 0}
          className={`flex items-center px-4 py-2 rounded-lg text-white ${filteredData.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
        >
          <Download size={20} className="mr-2" />
          Download Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name or code..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        </div>
        
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
          <Filter size={18} className="text-gray-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent focus:outline-none text-gray-700 font-medium"
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent focus:outline-none text-gray-700 font-medium"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Year</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Month</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">IN Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">OUT Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Duration</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Total With Lunch</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Lunch Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actual Duration</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-indigo-500 uppercase tracking-wider whitespace-nowrap">Holidays</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center">
                    <div className="flex justify-center flex-col items-center">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-3"></div>
                      <span className="text-gray-600 text-sm font-medium">Processing aggregated data...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center">
                    <p className="text-red-500 font-medium mb-3">Error: {error}</p>
                    <button
                      onClick={fetchAttendanceData}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium shadow-sm transition-colors"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.employeeCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.employeeName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-800">{item.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">{item.inTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">{item.outTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-bold">{item.totalDuration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-bold">{item.totalWithLunchDuration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-500 font-bold">{item.lunchTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-indigo-700">{item.actualTotalDuration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-indigo-600">{item.holidays}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Search size={32} className="mb-2 text-gray-300" />
                      <p className="font-medium text-lg text-gray-600">No records found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;