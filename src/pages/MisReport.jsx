import React, { useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';

const MisReport = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [misData, setMisData] = useState({ headers: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // New states for Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsData, setDetailsData] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const MIS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyCq-NBgm2__EdoDsoe-PMrAdcSgUrA4RguHlE0mWi8OvDaoRm7rXzuOhzh-r59HHA/exec';
  const DETAIL_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjCJ04mKT8T3aCfJjj8ENf9GXO8BcAmmDwQBEAocdEjAtuGYflKfcGzfUDXP-vD467/exec';

  const fetchMisData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${MIS_SCRIPT_URL}?sheet=For Records&action=fetch&spreadsheetId=1_8oh-5kHjGHk6jSSMtawNnSeGYiy5TuxF2UeDzpbI24`);
      const result = await response.json();
      if (result.success) {
        // Range A2:I. Headers are at row 2 (index 1).
        const allData = result.data || [];
        if (allData.length > 1) {
          const headers = allData[1]; // Row 2
          const dataRows = allData.slice(2); // Data from Row 3 onwards
          setMisData({ headers, rows: dataRows });
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch MIS data");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeName) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsData([]); // Clear old data immediately
    try {
      const response = await fetch(`${DETAIL_SCRIPT_URL}?sheet=MIS&action=fetch&spreadsheetId=1Itgq_lJIEo1zKqsNIpRvWwGo-qCe0pglnkfu8OeAw4Y`);
      const result = await response.json();
      if (result.success) {
        // MIS sheet headers are at index 1, data starts from index 2 (Row 3)
        const allData = result.data || [];
        if (allData.length > 2) {
          const rows = allData.slice(2);

          // Current Date Window logic: Last 7 days EXCLUDING today
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const startDate = new Date(today);
          startDate.setDate(today.getDate() - 7); // e.g. 23/03/2026

          const endDate = new Date(today);
          endDate.setDate(today.getDate() - 1); // e.g. 29/03/2026

          // Filter by employee name (Column A, index 0) AND Date Range (Column E, index 4)
          const filtered = rows.filter(row => {
            // 1. Basic row validation
            if (!row[0] || !row[4]) return false;

            // 2. Name Match
            const nameMatch = row[0].toString().trim().toLowerCase() === employeeName.toLowerCase().trim();
            if (!nameMatch) return false;

            // 3. Date Match (Planned Date in Column E / index 4)
            const plannedDate = parseSheetDate(row[4]);
            if (!plannedDate) return false;

            return plannedDate >= startDate && plannedDate <= endDate;
          });

          // Sort results by Planned Date (Column E, index 4) - Newest first
          filtered.sort((a, b) => {
            const dateA = parseSheetDate(a[4]);
            const dateB = parseSheetDate(b[4]);
            return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
          });

          // Deduplicate to show only unique tasks (by Task name in Column D / index 3)
          const uniqueTasks = [];
          const taskNamesSeen = new Set();

          filtered.forEach(row => {
            const taskName = row[3] ? row[3].toString().trim().toLowerCase() : '';
            if (taskName) {
              if (!taskNamesSeen.has(taskName)) {
                taskNamesSeen.add(taskName);
                uniqueTasks.push(row);
              }
            } else {
              uniqueTasks.push(row);
            }
          });

          setDetailsData(uniqueTasks);
        } else {
          setDetailsData([]);
        }
      } else {
        setDetailsError(result.error);
      }
    } catch (err) {
      setDetailsError("Failed to fetch task details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRowClick = (row) => {
    const name = row[2] || 'N/A';
    setSelectedEmployee(row);
    setShowModal(true);
    fetchEmployeeDetails(name);
  };

  useEffect(() => {
    fetchMisData();
  }, []);

  const parsePercent = (val) => {
    if (typeof val === 'string' && val.includes('%')) {
      return parseFloat(val.replace('%', ''));
    }
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num * 100;
  };

  const ProgressBar = ({ value, color }) => {
    const safeValue = Math.min(Math.max(0, value), 100);
    return (
      <div className="flex items-center space-x-2">
        <div className="w-24 bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${safeValue}%` }}
          ></div>
        </div>
        <span className="text-xs font-semibold text-gray-500 w-8">{Math.round(safeValue)}%</span>
      </div>
    );
  };

  const Badge = ({ value }) => {
    const val = parseInt(value);
    const colors = [
      'bg-green-100 text-green-700',
      'bg-yellow-100 text-yellow-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-red-100 text-red-700'
    ];
    const colorClass = colors[val % colors.length] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${colorClass}`}>
        {value}
      </span>
    );
  };

  const filteredRows = misData.rows.filter(row => {
    // Search term filter
    const matchesSearch = row.some(cell =>
      cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Company filter
    const companyName = row[10] || '';
    const matchesCompany = !selectedCompany || companyName === selectedCompany;

    // Status filter
    // 0 or '-' or empty means "Not data"
    const actualWork = row[4];
    const isDone = actualWork && parseFloat(actualWork) > 0;
    const matchesStatus = !selectedStatus ||
      (selectedStatus === 'not_done' && !isDone) ||
      (selectedStatus === 'done' && isDone);

    return matchesSearch && matchesCompany && matchesStatus;
  });

  const companies = Array.from(new Set(misData.rows.map(row => row[10]).filter(Boolean))).sort();

  const getAvatar = (name) => {
    if (!name) return "👤";
    const lowerName = name.toLowerCase().trim();
    // Common endings for female names in India/General
    const femaleEndings = ['a', 'i', 'ee', 'kumari', 'devi', 'shree', 'shakti'];
    const femaleNames = ['priya', 'neha', 'pooja', 'sneha', 'anita', 'sunita', 'kavita', 'swati'];

    const isFemale = femaleEndings.some(ending => lowerName.endsWith(ending)) ||
      femaleNames.some(fName => lowerName.includes(fName));

    return isFemale ? "👩" : "👨";
  };

  const parseSheetDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
      const d = new Date(dateVal);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    let d = null;
    // Handle DD/MM/YYYY specifically
    if (typeof dateVal === 'string' && dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3) {
        // parts[0] = DD, parts[1] = MM, parts[2] = YYYY
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      d = new Date(dateVal);
    }

    if (d && !isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  };

  const formatDuration = (val) => {
    if (!val || val === '-') return '-';
    // If it's an ISO string from Google Sheets duration/date
    if (typeof val === 'string' && (val.includes('T') || val.includes('Z'))) {
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return val;

        // Check if it's the 1899 date prefix for durations
        const year = date.getUTCFullYear();
        if (year === 1899 || year === 1900) {
          const hh = String(date.getUTCHours()).padStart(2, '0');
          const mm = String(date.getUTCMinutes()).padStart(2, '0');
          const ss = String(date.getUTCSeconds()).padStart(2, '0');
          return `${hh}:${mm}:${ss}`;
        }
        return val;
      } catch (e) {
        return val;
      }
    }
    return val;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    try {
      // If it's already in YYYY-MM-DD format, return it
      if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) return dateValue.substring(0, 10);

      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue; // Return as is if parsing fails

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      return dateValue;
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">List of People</h1>
          <p className="text-gray-500 mt-1">Operational performance metrics and tracking.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search by name, date or metrics..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm text-sm font-medium text-gray-700 min-w-[180px]"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
          >
            <option value="">Filter By Company</option>
            {companies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>

          <select
            className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm text-sm font-medium text-gray-700 min-w-[180px]"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Filter by Task Status</option>
            <option value="not_done">Not data</option>
            <option value="done">Done Task</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="relative">
            <Loader2 className="animate-spin text-blue-600" size={56} />
            <div className="absolute inset-0 blur-xl bg-blue-400/20 rounded-full animate-pulse"></div>
          </div>
          <p className="text-lg font-medium text-gray-600 animate-pulse">Aggregating performance data...</p>
        </div>
      ) : error ? (
        <div className="max-w-xl mx-auto p-8 bg-red-50 border border-red-100 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="text-red-600 font-bold text-lg">{error}</div>
          <button
            onClick={fetchMisData}
            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-md"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden max-w-[1600px] mx-auto">
          <div className="overflow-auto max-h-[700px] min-h-[500px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-8 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 left-0 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">NAME</th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 z-20">DATE START</th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 z-20">DATE END</th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 z-20">TARGET</th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 z-20">ACTUAL WORK DONE</th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 z-20">% WORK NOT DONE</th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 z-20 text-center">TOTAL WORK DONE</th>
                  <th className="px-6 py-5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] bg-sky-200 sticky top-0 z-20">WEEK PENDING</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredRows.map((row, i) => {
                  const name = row[2] || 'N/A';
                  const dateStart = row[0] || '-';
                  const dateEnd = row[1] || '-';
                  const target = row[3] || 0;
                  const actual = row[4] || 0;

                  // Calculations based on images/logic
                  // For actual work done progress, if target > 0
                  const actualPct = target > 0 ? (actual / target) * 100 : 0;

                  // % Work Not Done is the remaining percentage
                  const workNotDonePct = target > 0 ? Math.max(0, 100 - actualPct) : 0;

                  return (
                    <tr
                      key={i}
                      className="group hover:bg-blue-50/50 transition-all cursor-pointer"
                      onClick={() => handleRowClick(row)}
                    >
                      <td className="px-8 py-5 whitespace-nowrap sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg border border-white shadow-sm ring-1 ring-gray-100 transition-transform group-hover:scale-110">
                            {getAvatar(name)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{name}</div>
                            <div className="text-[11px] font-medium text-gray-400">{row[10] || 'Team Member'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 tabular-nums">{formatDate(dateStart)}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 tabular-nums">{formatDate(dateEnd)}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-700">{target}</td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <ProgressBar value={actualPct} color="bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <ProgressBar value={workNotDonePct} color="bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <Badge value={row[7]} />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">{row[8] || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="text-center py-32 space-y-4">
              <div className="text-5xl">🔍</div>
              <p className="text-xl font-bold text-gray-900">No records matching "{searchTerm}"</p>
              <p className="text-gray-400">Try adjusting your filters or search keywords.</p>
            </div>
          )}
        </div>
      )}

      {/* Task Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowModal(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-blue-200 border-2 border-white">
                  {selectedEmployee && getAvatar(selectedEmployee[2])}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    {selectedEmployee ? selectedEmployee[2] : 'Employee Name'}
                  </h2>
                  <p className="text-xs font-semibold text-gray-500 flex items-center space-x-2 mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span>{selectedEmployee ? selectedEmployee[10] : 'Department'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl transition-all border border-gray-100 shadow-sm"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 tracking-tight">Task Details</h3>
                {!detailsLoading && detailsData.length > 0 && (
                  <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {detailsData.length} Records Found
                  </div>
                )}
              </div>

              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                  <p className="text-sm text-gray-500 font-medium">Fetching detailed task list...</p>
                </div>
              ) : detailsError ? (
                <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-center">
                  <p className="text-red-600 font-bold">{detailsError}</p>
                </div>
              ) : detailsData.length === 0 ? (
                <div className="text-center py-20 space-y-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="text-4xl text-gray-300">📋</div>
                  <p className="text-gray-500 font-bold">No detailed task records found for this employee.</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[60vh] rounded-xl border border-gray-100 shadow-sm relative">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-30">
                      <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 italic">
                        <th className="px-4 py-3 text-left sticky top-0 bg-gray-50 z-20">Task ID</th>
                        <th className="px-4 py-3 text-left sticky top-0 bg-gray-50 z-20">Name</th>
                        <th className="px-4 py-3 text-left sticky top-0 bg-gray-50 z-20">Freq</th>
                        <th className="px-4 py-3 text-left sticky top-0 bg-gray-50 z-20">Task</th>
                        <th className="px-4 py-3 text-left text-center sticky top-0 bg-gray-50 z-20">Planned</th>
                        <th className="px-4 py-3 text-left text-center sticky top-0 bg-gray-50 z-20">Actual</th>
                        <th className="px-4 py-3 text-left sticky top-0 bg-gray-50 z-20">Time Delay</th>
                        <th className="px-4 py-3 text-left sticky top-0 bg-gray-50 z-20">Shop</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detailsData.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-gray-900">{detail[1] || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium">{detail[0] || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 uppercase tracking-tighter font-semibold">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">{detail[2] || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 font-medium max-w-[12rem] truncate">{detail[3] || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 tabular-nums text-center whitespace-nowrap">{formatDate(detail[4])}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 tabular-nums text-center whitespace-nowrap">{formatDate(detail[5])}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className={`font-bold ${detail[6] && detail[6] !== '-' ? 'text-red-500' : 'text-green-500'}`}>
                              {formatDuration(detail[6])}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-bold max-w-[10rem] truncate">{detail[7] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisReport;