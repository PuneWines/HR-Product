import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

const MisReport = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [misData, setMisData] = useState({ headers: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const MIS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyCq-NBgm2__EdoDsoe-PMrAdcSgUrA4RguHlE0mWi8OvDaoRm7rXzuOhzh-r59HHA/exec';

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
                    <tr key={i} className="group hover:bg-blue-50/30 transition-all">
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
    </div>
  );
};

export default MisReport;