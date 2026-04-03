import React, { useEffect, useState } from 'react';
import { Search, Download, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEVICES = [
  { name: 'BAWDHAN', apiName: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', apiName: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', apiName: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', apiName: 'AKOLE', serial: 'C262CC13CF202038' }
];

const JOINING_API_URL = 'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?sheet=JOINING&action=fetch';

const Attendancedaily = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-04-30');
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [joiningData, setJoiningData] = useState([]);
  const [deviceMapping, setDeviceMapping] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatTime12h = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      const parts = dateStr.trim().split(' ');
      const timePart = parts[1] || parts[0];
      if (!timePart || !timePart.includes(':')) return dateStr;
      
      let [hours, minutes] = timePart.split(':');
      hours = parseInt(hours);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch (e) {
      return dateStr;
    }
  };

  const calculateHoursMins = (diffMs) => {
    if (diffMs <= 0) return '0h 0m';
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  };

  const calculateWorkHours = (inStr, outStr) => {
    if (!inStr || !outStr || inStr === '-' || outStr === '-' || inStr === outStr) return '0h 0m';
    try {
      const inDate = new Date(inStr.replace(/-/g, '/'));
      const outDate = new Date(outStr.replace(/-/g, '/'));
      const diffMs = outDate - inDate;
      return calculateHoursMins(diffMs);
    } catch (e) {
      return '0h 0m';
    }
  };

  const calculateOvertime = (workHoursStr) => {
    if (!workHoursStr || workHoursStr === '0h 0m') return '0h 0m';
    try {
       const [h, m] = workHoursStr.split(' ').map(s => parseInt(s) || 0);
       const totalMinutes = h * 60 + m;
       const standardMinutes = 8 * 60;
       if (totalMinutes <= standardMinutes) return '0h 0m';
       const otMinutes = totalMinutes - standardMinutes;
       return `${Math.floor(otMinutes / 60)}h ${otMinutes % 60}m`;
    } catch (e) { return '0h 0m'; }
  };

  const calculateLateMinutes = (inStr) => {
    if (!inStr || inStr === '-') return 0;
    try {
      const timePart = inStr.split(' ')[1];
      if (!timePart) return 0;
      const [hours, minutes] = timePart.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      
      const officialStartTime = 10 * 60 + 0; // 10:00 AM
      const graceTimeThreshold = 10 * 60 + 10; // 10:10 AM

      if (totalMinutes > graceTimeThreshold) {
        return totalMinutes - officialStartTime;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  };

  const fetchDeviceLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Joining Data if not already loaded
      let currentJoining = joiningData;
      if (joiningData.length === 0) {
        const jResponse = await fetch(JOINING_API_URL);
        const jResult = await jResponse.json();
        if (jResult.success) {
          const rawRows = jResult.data || jResult;
          const headers = rawRows[5];
          const dataRows = rawRows.slice(6);
          
          const getIdx = (name) => headers.findIndex(h => h && h.toString().trim().toLowerCase() === name.toLowerCase());
          const empIdIdx = getIdx('Employee ID');
          const nameIdx = getIdx('Name As Per Aadhar');
          const desIdx = getIdx('Designation');
          const storeIdx = getIdx('Joining Place');

          currentJoining = dataRows.map(r => ({
            id: r[empIdIdx]?.toString().trim(),
            name: r[nameIdx]?.toString().trim(),
            designation: r[getIdx('Designation')]?.toString().trim() || r[desIdx]?.toString().trim(),
            store: r[getIdx('Joining Place')]?.toString().trim() || r[storeIdx]?.toString().trim()
          })).filter(h => h.id);
          setJoiningData(currentJoining);
        }
      }

      // 1b. Fetch Device User Mapping from MASTER sheet (HR FMS V.1)
      const MASTER_MAP_URL = `https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?sheet=MASTER&action=fetch`;
      const dmResponse = await fetch(MASTER_MAP_URL);
      const dmResult = await dmResponse.json();
      let currentMapping = [];
      if (dmResult.success) {
        const rows = dmResult.data.slice(1); // Skip headers
        currentMapping = rows.map(r => ({
          userId: r[5]?.toString().trim(),
          name: r[6]?.toString().trim(),
          deviceId: r[7]?.toString().trim(),
          serialNo: r[8]?.toString().trim(),
          storeName: r[9]?.toString().trim()
        }));
        setDeviceMapping(currentMapping);
      }

      // 2. Fetch Device Logs
      const queryStart = startDate || '2026-04-01';
      const queryEnd = endDate || '2026-04-30';
      const API_URL = `/api/device-logs?APIKey=211616032630&SerialNumber=${selectedDevice.serial}&DeviceName=${selectedDevice.apiName}&FromDate=${queryStart}&ToDate=${queryEnd}`;
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const rawLogs = await response.json();
      if (!Array.isArray(rawLogs)) throw new Error('Expected array data from API');

      // Strict filter for records from April 1st, 2026 onwards
      const filteredLogs = rawLogs.filter(log => {
        if (!log.LogDate) return false;
        const logDateStr = log.LogDate.split(' ')[0];
        return logDateStr >= '2026-04-01';
      });

      filteredLogs.sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));

      const grouped = {};
      filteredLogs.forEach(log => {
        if (!log.EmployeeCode || !log.LogDate) return;
        const dateStr = log.LogDate.split(' ')[0];
        const key = `${log.EmployeeCode}_${dateStr}`;
        
        if (!grouped[key]) {
            grouped[key] = {
              EmployeeCode: log.EmployeeCode,
              Date: dateStr,
              SerialNumber: log.SerialNumber,
              StoreName: selectedDevice.name,
              logs: []
            };
        }
        grouped[key].logs.push(log.LogDate);
      });

      const aggregatedData = Object.values(grouped).map(group => {
        const logs = group.logs;
        let inTime = '-';
        let outTime = '-';
        let lunchOut = '-';
        let lunchIn = '-';
        let punchMiss = 'No';
        let punchMissMsg = '';

        if (logs.length === 1) {
          const punchTime = logs[0];
          const timePart = punchTime.split(' ')[1] || '';
          const hours = parseInt(timePart.split(':')[0]) || 0;
          
          punchMiss = 'Yes';
          if (hours >= 15) { // 3:00 PM cutoff for evening punch
            outTime = punchTime;
            punchMissMsg = 'Morning Punch Miss';
          } else {
            inTime = punchTime;
            punchMissMsg = 'Evening Punch Miss';
          }
        } else {
          inTime = logs[0];
          outTime = logs[logs.length - 1];
          if (logs.length >= 4) {
            lunchOut = logs[1];
            lunchIn = logs[2];
          } else if (logs.length === 3) {
            lunchOut = logs[1];
          }
        }
        
        const serial = group.SerialNumber.toString().trim();
        const code = group.EmployeeCode.toString().trim();
        const isNumeric = !isNaN(code) && code !== '';

        // Fallback to Joining Meta (Original Source)
        const empMeta = currentJoining.find(e => 
          (e.id && e.id.toLowerCase() === code.toLowerCase()) || 
          (e.name && e.name.toLowerCase() === code.toLowerCase())
        );

        // Flexible Mapping: Find in MASTER mapping
        // Priority 1: Match by UserId (Employee Code)
        let dMap = currentMapping.find(m => m.userId && m.userId.toString().toLowerCase() === code.toLowerCase());
        
        // Priority 2: Match by Name if UserId didn't match (for some "Unknown" cases where code is actually a name)
        if (!dMap) {
          const entryName = (empMeta?.name || code).toString().trim().toLowerCase();
          dMap = currentMapping.find(m => m.name && m.name.toString().toLowerCase() === entryName);
        }

        const displayName = dMap ? dMap.name : (empMeta ? empMeta.name : (isNumeric ? 'Unknown' : code));
        const displayCode = dMap ? dMap.userId : (empMeta ? empMeta.id : (isNumeric ? code : 'Unknown'));
        const displayStore = dMap ? dMap.storeName : (empMeta ? empMeta.store : selectedDevice.name);
        const displayDeviceId = dMap ? dMap.deviceId : '-';
        const displayAssignedSerial = dMap ? dMap.serialNo : serial;
        
        const lateMins = calculateLateMinutes(inTime);
        const workHrs = punchMiss === 'Yes' ? '0h 0m' : calculateWorkHours(inTime, outTime);
        const overtimeHrs = calculateOvertime(workHrs);
        
        const dateObj = new Date(group.Date);
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj);
        const isWorkingDay = 'Yes';

        let status = 'Present';
        if (lateMins > 0) status = 'Late';

        return {
          EmployeeID: displayCode,
          EmployeeName: displayName,
          Date: group.Date,
          Day: dayName,
          IsWorkingDay: isWorkingDay,
          InTime: inTime,
          LunchOut: lunchOut,
          LunchIn: lunchIn,
          OutTime: outTime,
          StoreName: displayStore,
          DeviceID: displayDeviceId,
          Designation: empMeta ? empMeta.designation : '-',
          SerialNumber: serial, // Actual punch serial
          AssignedSerial: displayAssignedSerial,
          Status: status,
          WorkingHour: workHrs,
          Overtime: overtimeHrs,
          LateMinute: lateMins,
          PunchMiss: punchMiss,
          PunchMissMsg: punchMissMsg
        };
      });

      aggregatedData.sort((a, b) => new Date(b.InTime) - new Date(a.InTime));
      setAttendanceData(aggregatedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceLogs();
  }, [startDate, endDate, selectedDevice]); 

  const filteredData = attendanceData.filter(item => {
    const matchesSearch =
      (item.EmployeeID && item.EmployeeID.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.EmployeeName && item.EmployeeName.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.SerialNumber && item.SerialNumber.toString().toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const downloadExcel = () => {
    const dataToExport = filteredData.map((item, index) => ({
      'S.No.': index + 1,
      'Date': item.Date,
      'Day': item.Day,
      'Working Day': item.IsWorkingDay,
      'Employee ID': item.EmployeeID,
      'Employee Name': item.EmployeeName,
      'IN Time': formatTime12h(item.InTime),
      'Lunch Out': formatTime12h(item.LunchOut),
      'Lunch In': formatTime12h(item.LunchIn),
      'OUT Time': formatTime12h(item.OutTime),
      'Status': item.Status,
      'Working Hour': item.WorkingHour,
      'Overtime': item.Overtime,
      'Late Minute': item.LateMinute,
      'Punch Miss': item.PunchMiss,
      'Store Name': item.StoreName,
      'Device ID': item.DeviceID,
      'Serial NO': item.AssignedSerial,
      'Designation': item.Designation
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Device Logs");
    XLSX.writeFile(workbook, `device_logs_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`);
  };

  return (
    <div className="space-y-6 ml-50 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Device Logs</h1>
        <button
          onClick={downloadExcel}
          disabled={filteredData.length === 0}
          className={`flex items-center px-4 py-2 rounded-lg text-white transition-all shadow-md group ${filteredData.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          <Download size={20} className="mr-2 group-hover:scale-110 transition-transform" />
          Download Excel
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 flex flex-col md:row gap-6 items-end">
        <div className="flex-1 w-full text-gray-700">
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Search Logs</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Employee ID, Name or Serial Number..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto text-gray-700">
          <div className="flex-1 md:w-52">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Device Name</label>
            <div className="relative">
              <select
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                value={selectedDevice.name}
                onChange={(e) => {
                  const device = DEVICES.find(d => d.name === e.target.value);
                  setSelectedDevice(device);
                }}
              >
                {DEVICES.map(d => (
                  <option key={d.name} value={d.name} className="font-medium text-gray-700">{d.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          <div className="flex-1 md:w-52">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Start Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 md:w-52">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">End Date</label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 transition-colors">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">S.No.</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Day</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Working Day</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Employee ID</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Employee Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">IN Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Lunch Out</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Lunch In</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">OUT Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Working Hour</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Overtime</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Late Minute</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Punch Miss</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Store Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Device ID</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Serial NO</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Designation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="20" className="px-6 py-20 text-center">
                    <div className="flex justify-center flex-col items-center">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <span className="text-indigo-600 font-black tracking-widest text-xs uppercase animate-pulse">Fetching Device Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="20" className="px-6 py-12 text-center">
                    <p className="text-red-500 font-bold mb-4">Error: {error}</p>
                    <button
                      onClick={fetchDeviceLogs}
                      className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg shadow-red-100 transition-all"
                    >
                      Retry Connection
                    </button>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} className="group hover:bg-gray-50/80 transition-all border-l-2 border-transparent hover:border-indigo-500">
                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-black text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-black text-gray-400">
                      {item.Date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                      {item.Day}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${item.IsWorkingDay === 'Yes' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {item.IsWorkingDay}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                      {item.EmployeeID || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {item.EmployeeName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-indigo-700 font-black">
                      {formatTime12h(item.InTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-orange-500 font-bold">
                      {formatTime12h(item.LunchOut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-orange-600 font-bold">
                      {formatTime12h(item.LunchIn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-red-600 font-bold">
                      {formatTime12h(item.OutTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                       <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border shadow-sm ${
                         item.Status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' : 
                         item.Status === 'Late' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                         item.Status === 'Holiday' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                         'bg-red-50 text-red-700 border-red-200'}`}>
                          {item.Status || '-'}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-gray-700 text-center">
                      {item.WorkingHour}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-blue-600 text-center">
                      {item.Overtime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-red-500 text-center">
                      {item.LateMinute > 0 ? `${item.LateMinute} min` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span 
                        title={item.PunchMissMsg}
                        className={`text-xs font-black cursor-help transition-all ${item.PunchMiss === 'Yes' ? 'text-red-600 underline decoration-dotted' : 'text-gray-300'}`}
                      >
                        {item.PunchMiss}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-700">
                      {item.StoreName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-indigo-600">
                      {item.DeviceID || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                      {item.AssignedSerial || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">
                      {item.Designation || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="20" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl p-10 border-2 border-dashed border-gray-100 mx-10">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="font-black uppercase tracking-[0.2em] text-sm">No Logs Found</p>
                      <p className="text-xs mt-2 font-medium opacity-60">Try adjusting search or dates</p>
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

export default Attendancedaily;