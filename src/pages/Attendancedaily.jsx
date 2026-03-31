import React, { useEffect, useState } from 'react';
import { Search, Download, Calendar, Edit2, Check, X, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const Attendancedaily = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editData, setEditData] = useState({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      setUser(JSON.parse(userString));
    }
  }, []);

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybtkq0iB4NTrw5jHcpjkwyncpLZlBGpgADUxq2nuGdX36nWlE2zum-8DBmsQgu-FzhTQ/exec';
      const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

      const response = await fetch(
        `${SCRIPT_URL}?sheet=Data&action=fetch&spreadsheetId=${SPREADSHEET_ID}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch daily data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const processedData = rawData.slice(1).map((row, index) => ({
        rowIndex: index + 2,
        employeeCode: row[0] !== undefined && row[0] !== null ? row[0] : '',
        employeeName: row[1] !== undefined && row[1] !== null ? row[1] : '',
        date: row[2] || '',
        inTime: row[3] !== undefined && row[3] !== null ? row[3] : '',
        outTime: row[4] !== undefined && row[4] !== null ? row[4] : '',
        totalDuration: row[5] !== undefined && row[5] !== null ? row[5] : '',
        totalWithLunchDuration: row[6] !== undefined && row[6] !== null ? row[6] : '',
        lunchTime: row[7] !== undefined && row[7] !== null ? row[7] : '',
        actualTotalDuration: row[8] !== undefined && row[8] !== null ? row[8] : '',
        status: row[9] !== undefined && row[9] !== null ? row[9] : '',
        missAdjustCondition: row[10] !== undefined && row[10] !== null ? row[10] : '',
        year: row[11] || '',
        month: row[12] || '',
      }));

      setAttendanceData(processedData);

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

  const formatRawValue = (val) => {
    if (val === undefined || val === null) return '';
    const strVal = val.toString().trim();
    if (strVal.includes('T')) {
      const timePart = strVal.split('T')[1];
      if (timePart) return timePart.split('.')[0];
    }
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(strVal)) return strVal;
    return strVal;
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

  const startEditing = (item) => {
    setEditingRowId(item.rowIndex);
    setEditData({
      inTime: formatRawValue(item.inTime),
      outTime: formatRawValue(item.outTime),
      totalDuration: formatRawValue(item.totalDuration)
    });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditData({});
  };

  const handleSave = async (rowIndex) => {
    setSyncing(true);
    // Use the MAIN_SCRIPT URL which fetches from this spreadsheet successfully
    const UPDATE_SCRIPT = 'https://script.google.com/macros/s/AKfycbybtkq0iB4NTrw5jHcpjkwyncpLZlBGpgADUxq2nuGdX36nWlE2zum-8DBmsQgu-FzhTQ/exec';
    const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

    try {
      // Columns: IN=4(D), OUT=5(E), Duration=6(F)
      const updates = [
        { col: 4, val: editData.inTime },
        { col: 5, val: editData.outTime },
        { col: 6, val: editData.totalDuration }
      ];

      for (const update of updates) {
        // Using 'sheet' parameter to match MAIN_SCRIPT's pattern
        const response = await fetch(UPDATE_SCRIPT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            sheet: "Data",
            action: "updateCell",
            rowIndex: rowIndex.toString(),
            columnIndex: update.col.toString(),
            value: update.val,
            spreadsheetId: SPREADSHEET_ID
          }).toString()
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const res = await response.json();
        if (!res.success) throw new Error(res.error || "Update failed");
      }

      toast.success("Attendance updated successfully!");
      setEditingRowId(null);
      fetchAttendanceData(); // Refresh to get calculated values and "No" status
    } catch (err) {
      console.error("Save error:", err);
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredData = attendanceData.filter(item => {
    const matchesSearch =
      item.employeeName.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeCode.toString().toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDateRange = true;
    if (startDate || endDate) {
      if (!item.date || item.date === '-') {
        matchesDateRange = false;
      } else {
        const itemDate = new Date(item.date);
        if (isNaN(itemDate.getTime())) {
          matchesDateRange = false;
        } else {
          itemDate.setHours(0, 0, 0, 0);
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) matchesDateRange = false;
          }
          if (endDate && matchesDateRange) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) matchesDateRange = false;
          }
        }
      }
    }
    return matchesSearch && matchesDateRange;
  }).sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;
  });

  const getStatusStyle = (status) => {
    const s = (status || '').toString().toLowerCase().trim();
    if (s === 'present') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'absent') return 'bg-red-100 text-red-700 border-red-200';
    if (s === 'update') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const downloadExcel = () => {
    const dataToExport = filteredData.map(item => ({
      'Year': item.year,
      'Employee Code': item.employeeCode,
      'Employee Name': item.employeeName,
      'Date': formatSheetDate(item.date),
      'IN Time': formatTimeAMPM(formatRawValue(item.inTime)),
      'OUT Time': formatTimeAMPM(formatRawValue(item.outTime)),
      'Total Duration': formatRawValue(item.totalDuration),
      'Total With Lunch Duration': formatRawValue(item.totalWithLunchDuration),
      'Lunch TIme': formatTimeAMPM(formatRawValue(item.lunchTime)),
      'Actual Total Duration': formatRawValue(item.actualTotalDuration),
      'Status': item.status,
      'Miss Adjust': item.missAdjustCondition,
      'Month': item.month
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Attendance");
    XLSX.writeFile(workbook, `attendance_daily_report.xlsx`);
  };

  const isAdmin = user?.Admin === 'Yes';

  return (
    <div className="space-y-6 ml-50 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance Records Daily</h1>
        <button
          onClick={downloadExcel}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-all shadow-md group"
        >
          <Download size={20} className="mr-2 group-hover:scale-110 transition-transform" />
          Download Excel
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 flex flex-col md:row gap-6 items-end">
        <div className="flex-1 w-full text-gray-700">
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Search Employee</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter name or code..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto text-gray-700">
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
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Year</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">EMP Code</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">EMP Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">IN</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">OUT</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Duration</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">With Lunch</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Lunch</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Actual</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Adjust</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Month</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="13" className="px-6 py-20 text-center">
                    <div className="flex justify-center flex-col items-center">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <span className="text-indigo-600 font-bold tracking-widest text-xs uppercase animate-pulse">Syncing sheet data...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="13" className="px-6 py-12 text-center">
                    <p className="text-red-500 font-bold mb-4">Error: {error}</p>
                    <button
                      onClick={fetchAttendanceData}
                      className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg shadow-red-100 transition-all"
                    >
                      Retry Connection
                    </button>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => {
                  const isEditing = editingRowId === item.rowIndex;

                  return (
                    <tr key={index} className="group hover:bg-gray-50/80 transition-all border-l-2 border-transparent hover:border-indigo-500">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{item.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.employeeCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{item.employeeName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-black">{formatSheetDate(item.date)}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                        {isEditing ? (
                          <input
                            className="w-24 px-2 py-1 border border-indigo-300 rounded bg-indigo-50 text-indigo-900"
                            value={editData.inTime}
                            onChange={(e) => setEditData({ ...editData, inTime: e.target.value })}
                          />
                        ) : formatTimeAMPM(formatRawValue(item.inTime))}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-400">
                        {isEditing ? (
                          <input
                            className="w-24 px-2 py-1 border border-indigo-300 rounded bg-indigo-50 text-indigo-900"
                            value={editData.outTime}
                            onChange={(e) => setEditData({ ...editData, outTime: e.target.value })}
                          />
                        ) : formatTimeAMPM(formatRawValue(item.outTime))}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-black">
                        {isEditing ? (
                          <input
                            className="w-24 px-2 py-1 border border-indigo-300 rounded bg-indigo-50 text-indigo-900"
                            value={editData.totalDuration}
                            onChange={(e) => setEditData({ ...editData, totalDuration: e.target.value })}
                          />
                        ) : formatRawValue(item.totalDuration)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">{formatRawValue(item.totalWithLunchDuration)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-500">{formatTimeAMPM(formatRawValue(item.lunchTime))}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-indigo-700">{formatRawValue(item.actualTotalDuration)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.status ? (
                          <span className={`px-4 py-1 text-[10px] font-black uppercase rounded-full border shadow-sm ${getStatusStyle(item.status)}`}>
                            {item.status}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSave(item.rowIndex)}
                              disabled={syncing}
                              className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 shadow-sm disabled:opacity-50"
                            >
                              {syncing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={syncing}
                              className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm disabled:opacity-50"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          isAdmin && item.missAdjustCondition === 'Update' ? (
                            <button
                              onClick={() => startEditing(item)}
                              className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-wider animate-pulse"
                            >
                              <Edit2 size={10} className="mr-1" />
                              Update
                            </button>
                          ) : (
                            <span className={item.missAdjustCondition?.toString().toLowerCase() === 'no' ? 'text-gray-300 text-xs font-bold' : 'text-indigo-500 text-xs font-bold'}>
                              {formatRawValue(item.missAdjustCondition)}
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.month}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="13" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl p-10 border-2 border-dashed border-gray-100 mx-10">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="font-black uppercase tracking-[0.2em] text-sm">No Attendance Found</p>
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