import React, { useEffect, useState } from 'react';
import { Search, Download, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEVICES = [
  { name: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', serial: 'C262CC13CF202038' }
];

const Attendancedaily = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeviceLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryStart = startDate || '2026-03-01';
      const queryEnd = endDate || '2026-03-31';
      const API_URL = `http://103.195.203.77:15167/api/v2/WebAPI/GetDeviceLogs?APIKey=211616032630&SerialNumber=${selectedDevice.serial}&DeviceName=${selectedDevice.name}&FromDate=${queryStart}&ToDate=${queryEnd}`;

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!Array.isArray(result)) {
        throw new Error('Expected array data from API');
      }

      // Group by EmployeeCode and Date
      // First, sort chronologically so logs are in time order
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
              PunchDirection: log.PunchDirection,
              Temperature: log.Temperature,
              TemperatureState: log.TemperatureState,
              logs: []
            };
        }
        grouped[key].logs.push(log.LogDate);
      });

      // Map to array with requested columns
      const aggregatedData = Object.values(grouped).map(group => {
        return {
          EmployeeCode: group.EmployeeCode,
          Date: group.Date,
          InTime: group.logs[0] || '-',
          LunchTime: group.logs[1] || '-',
          OutTime: group.logs[2] || '-',
          SerialNumber: group.SerialNumber,
          PunchDirection: group.PunchDirection,
          Temperature: group.Temperature,
          TemperatureState: group.TemperatureState
        };
      });

      // Sort recent first
      aggregatedData.sort((a, b) => new Date(b.Date) - new Date(a.Date));

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
      (item.EmployeeCode && item.EmployeeCode.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.SerialNumber && item.SerialNumber.toString().toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const downloadExcel = () => {
    const dataToExport = filteredData.map(item => ({
      'Employee Code': item.EmployeeCode,
      'Date': item.Date,
      'IN Time': item.InTime,
      'Lunch Time': item.LunchTime,
      'OUT Time': item.OutTime,
      'Serial Number': item.SerialNumber,
      'Punch Direction': item.PunchDirection,
      'Temperature': item.Temperature,
      'Temperature State': item.TemperatureState
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Device Logs");
    XLSX.writeFile(workbook, `device_logs_${startDate}_to_${endDate}.xlsx`);
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
              placeholder="Search by Employee Code or Serial Number..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
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
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Employee Code</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">IN Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Lunch Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">OUT Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Serial Number</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Punch Direction</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Temperature</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Temperature State</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {item.EmployeeCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-black">
                      {item.InTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-500 font-bold">
                      {item.LunchTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                      {item.OutTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                      {item.SerialNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                      {item.PunchDirection || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                      {item.Temperature}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`px-4 py-1 text-[10px] font-black uppercase rounded-full border shadow-sm ${item.TemperatureState === 'Not Measured' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                          {item.TemperatureState || '-'}
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