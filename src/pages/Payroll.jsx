import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download } from 'lucide-react';

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [salaryData, setSalaryData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const PAYROLL_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybtkq0iB4NTrw5jHcpjkwyncpLZlBGpgADUxq2nuGdX36nWlE2zum-8DBmsQgu-FzhTQ/exec';
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    let date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else {
      // Try to parse common formats
      const iso = Date.parse(dateStr);
      if (!isNaN(iso)) {
        date = new Date(iso);
      } else {
        // Try dd/mm/yyyy
        const parts = dateStr.toString().split(/[\/\-]/);
        if (parts.length === 3) {
          let [day, month, year] = parts.map(p => parseInt(p, 10));
          if (year < 100) year += 2000;
          date = new Date(year, month - 1, day);
        }
      }
    }

    if (!date || isNaN(date.getTime())) return dateStr;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchPayrollData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${PAYROLL_SCRIPT_URL}?sheet=PAYROLL&action=fetch&spreadsheetId=1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8`);
      const result = await response.json();
      if (result.success) {
        // Range A3:P. Headers are at index 2 (A3 is row 3, index 2)
        // Adjusting based on user request: headers from the sheet.
        const allData = result.data || [];
        if (allData.length > 2) {
          const headers = allData[2]; // Row 3
          const dataRows = allData.slice(3); // Data from Row 4 onwards
          
          // Find indices
          const nameIndex = headers.indexOf('Name of the Employee');
          const yearIndex = headers.indexOf('Year');
          const monthIndex = headers.indexOf('Month');

          const processed = dataRows.map(row => {
            const newRow = [...row];
            if (nameIndex !== -1 && yearIndex !== -1 && monthIndex !== -1) {
                // We want to return a processed object or array where Year and Month follow Name
                // But specifically for display, it's easier to just map them to an object.
            }
            return row;
          });
          setSalaryData({ headers, rows: dataRows });
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${PAYROLL_SCRIPT_URL}?sheet=PAID Record&action=fetch&spreadsheetId=1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8`);
      const result = await response.json();
      if (result.success) {
        const allData = result.data || [];
        if (allData.length > 0) {
          const headers = allData[0];
          const dataRows = allData.slice(1);
          setHistoryData({ headers, rows: dataRows });
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch history data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'salary') {
      fetchPayrollData();
    } else {
      fetchHistoryData();
    }
  }, [activeTab]);

  const getReorderedHeaders = (headers) => {
    if (!headers) return [];
    const nameIdx = headers.indexOf('Name of the Employee');
    const yearIdx = headers.indexOf('Year');
    const monthIdx = headers.indexOf('Month');

    if (nameIdx === -1 || yearIdx === -1 || monthIdx === -1) return headers;

    const newHeaders = [...headers];
    const year = newHeaders.splice(yearIdx, 1)[0];
    // After removing Year, the month index might change if Year was before it
    const updatedMonthIdx = newHeaders.indexOf('Month');
    const month = newHeaders.splice(updatedMonthIdx, 1)[0];
    
    // Find Name again in case index shifted
    const updatedNameIdx = newHeaders.indexOf('Name of the Employee');
    newHeaders.splice(updatedNameIdx + 1, 0, year, month);
    return newHeaders;
  };

  const reorderRow = (row, headers) => {
    if (!row || !headers) return row;
    const nameIdx = headers.indexOf('Name of the Employee');
    const yearIdx = headers.indexOf('Year');
    const monthIdx = headers.indexOf('Month');

    if (nameIdx === -1 || yearIdx === -1 || monthIdx === -1) return row;

    const newRow = [...row];
    const year = newRow.splice(yearIdx, 1)[0];
    const tempHeadersForMonth = [...headers];
    tempHeadersForMonth.splice(yearIdx, 1);
    const updatedMonthIdx = tempHeadersForMonth.indexOf('Month');
    const month = newRow.splice(updatedMonthIdx, 1)[0];

    const tempHeadersForName = [...tempHeadersForMonth];
    tempHeadersForName.splice(updatedMonthIdx, 1);
    const updatedNameIdx = tempHeadersForName.indexOf('Name of the Employee');

    newRow.splice(updatedNameIdx + 1, 0, year, month);
    return newRow;
  };

  const renderTable = (data, isSalary = false) => {
    if (!data || !data.headers) return null;
    
    const headers = isSalary ? getReorderedHeaders(data.headers) : data.headers;
    const rows = data.rows.filter(row => 
      row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
          <thead className="bg-sky-200 sticky top-0 z-10">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-sky-200 sticky top-0 z-10">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((row, i) => {
              const displayRow = isSalary ? reorderRow(row, data.headers) : row;
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {displayRow.map((cell, j) => {
                    const header = headers[j]?.toString().toLowerCase() || "";
                    const isDateColumn = header.includes('date of joining') || header === 'doj';
                    const displayCell = isDateColumn ? formatDate(cell) : cell;

                    return (
                      <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {displayCell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search payroll records..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'salary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('salary')}
        >
          Salary Sheet
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-500 animate-pulse">Fetching payroll records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-center">
          {error}
          <button onClick={() => activeTab === 'salary' ? fetchPayrollData() : fetchHistoryData()} className="ml-4 underline font-medium">Retry</button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
           {activeTab === 'salary' ? renderTable(salaryData, true) : renderTable(historyData, false)}
           {((activeTab === 'salary' && salaryData.rows?.length === 0) || (activeTab === 'history' && historyData.rows?.length === 0)) && !loading && (
             <div className="text-center py-20 text-gray-400">No records found.</div>
           )}
        </div>
      )}
    </div>
  );
};

export default Payroll;