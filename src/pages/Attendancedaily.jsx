import React, { useEffect, useState } from 'react';
import { Search, Download, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEVICES = [
  { name: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', serial: 'C262CC13CF202038' }
];

const JOINING_API_URL = 'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?sheet=JOINING&action=fetch';

const Attendancedaily = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [joiningData, setJoiningData] = useState([]);
  const [deviceMapping, setDeviceMapping] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatTime12h = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      const parts = dateStr.split(' ');
      const timePart = parts[1] || parts[0];
      if (!timePart || !timePart.includes(':')) return dateStr;
      
      let [hours, minutes] = timePart.split(':');
      hours = parseInt(hours);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      return `${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return dateStr;
    }
  };

  const calculateWorkHours = (inStr, outStr) => {
    if (!inStr || !outStr || inStr === '-' || outStr === '-' || inStr === outStr) return '0h 0m';
    try {
      const inDate = new Date(inStr.replace(/-/g, '/'));
      const outDate = new Date(outStr.replace(/-/g, '/'));
      const diffMs = outDate - inDate;
      if (diffMs <= 0) return '0h 0m';
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      return `${diffHrs}h ${diffMins}m`;
    } catch (e) {
      return '0h 0m';
    }
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
            designation: r[desIdx]?.toString().trim(),
            store: r[storeIdx]?.toString().trim()
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
      const queryStart = startDate || '2026-03-01';
      const queryEnd = endDate || '2026-03-31';
      const API_URL = `/api/device-logs?APIKey=211616032630&SerialNumber=${selectedDevice.serial}&DeviceName=${selectedDevice.name}&FromDate=${queryStart}&ToDate=${queryEnd}`;

      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      
      if (!Array.isArray(result)) throw new Error('Expected array data from API');

      result.sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));

      const grouped = {};
      result.forEach(log => {
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
        let lunchTime = '-';
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
          lunchTime = logs.length > 2 ? logs[1] : '-';
        }
        
        const serial = group.SerialNumber.toString().trim();
        const code = group.EmployeeCode.toString().trim();
        const isNumeric = !isNaN(code) && code !== '';

        // Prioritize Device Mapping (New Requirement)
        const dMap = currentMapping.find(m => m.userId === code && m.serialNo === serial);
        
        // Fallback to Joining Meta
        const empMeta = currentJoining.find(e => 
          (e.id && e.id.toLowerCase() === code.toLowerCase()) || 
          (e.name && e.name.toLowerCase() === code.toLowerCase())
        );

        const displayName = dMap ? dMap.name : (empMeta ? empMeta.name : (isNumeric ? 'Unknown' : code));
        const displayCode = dMap ? dMap.userId : (empMeta ? empMeta.id : (isNumeric ? code : 'Unknown'));
        const displayStore = dMap ? dMap.storeName : (empMeta ? empMeta.store : selectedDevice.name);
        const displayDeviceId = dMap ? dMap.deviceId : '-';
        
        const lateMins = calculateLateMinutes(inTime);
        // Calculation logic for Missed Punches: disable if punch is missing
        const workHrs = punchMiss === 'Yes' ? '0h 0m' : calculateWorkHours(inTime, outTime);
        const finalLunchTime = punchMiss === 'Yes' ? '-' : lunchTime;
        
        let status = 'Present';
        const dayOfWeek = new Date(group.Date).getDay();
        if (dayOfWeek === 0) status = 'Holiday'; // Sunday
        else if (lateMins > 0) status = 'Late';

        return {
          EmployeeID: displayCode,
          EmployeeName: displayName,
          InTime: inTime,
          LunchTime: finalLunchTime,
          OutTime: outTime,
          StoreName: displayStore,
          DeviceID: displayDeviceId,
          Designation: empMeta ? empMeta.designation : '-',
          SerialNumber: group.SerialNumber,
          Status: status,
          WorkingHour: workHrs,
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
  }, [startDate, endDate, selectedDevice]); // Fetch automatically when dates or device change

  const filteredData = attendanceData.filter(item => {
    const matchesSearch =
      (item.EmployeeID && item.EmployeeID.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.EmployeeName && item.EmployeeName.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.SerialNumber && item.SerialNumber.toString().toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const downloadExcel = () => {
    const dataToExport = filteredData.map(item => ({
      'Employee ID': item.EmployeeID,
      'Employee Name': item.EmployeeName,
      'IN Time': formatTime12h(item.InTime),
      'Lunch Time': formatTime12h(item.LunchTime),
      'OUT Time': formatTime12h(item.OutTime),
      'Store Name': item.StoreName,
      'Device ID': item.DeviceID,
      'Designation': item.Designation,
      'Serial Number': item.SerialNumber,
      'Status': item.Status,
      'Working Hour': item.WorkingHour,
      'Late Minute': item.LateMinute,
      'Punch Miss': item.PunchMiss
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
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Employee ID</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Employee Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">IN Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Lunch Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">OUT Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Store Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Device ID</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Designation</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Serial Number</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Working Hour</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Late Minute</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap text-center">Punch Miss</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-20 text-center">
                    <div className="flex justify-center flex-col items-center">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <span className="text-indigo-600 font-bold tracking-widest text-xs uppercase animate-pulse">Fetching Device Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
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
                      {formatTime12h(item.LunchTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-red-600 font-bold">
                      {formatTime12h(item.OutTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-700">
                      {item.StoreName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-indigo-600">
                      {item.DeviceID || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">
                      {item.Designation || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-medium text-gray-400">
                      {item.SerialNumber || '-'}
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-20 text-center">
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