import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, Plus, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';


const Payroll = () => {
  const [activeTab, setActiveTab] = useState('salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [salaryData, setSalaryData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    year: new Date().getFullYear().toString(),
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date()),
    basicSalary: '0',
    lta: '0',
    bonus: '0',
    otherAllowance: '0',
    overtime: '0',
    pf: '0',
    loan: '0',
    otherDeduction: '0',
    status: 'Draft',
    payDate: new Date().toISOString().split('T')[0]
  });


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
    fetchEmployees();
  }, [activeTab]);

  // Dedicated JOINING sheet script (same as Employee.jsx, Dashboard.jsx, LeaveManagement.jsx)
  const JOINING_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec';

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        `${JOINING_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );
      const result = await response.json();
      if (result.success && result.data) {
        // E7:E → data starts row 7 (index 6), Col E (index 4) = Name, Col B (index 1) = ID
        const emps = result.data.slice(6)
          .filter(row => row[4] && row[4].toString().trim() !== '')
          .map(row => ({
            id: row[1] || '',
            name: row[4].toString().trim()
          }));
        setEmployees(emps);
      }
    } catch (err) {
      console.error('Error fetching employees from JOINING sheet:', err);
    }
  };

  const handleEmployeeChange = (name) => {
    const emp = employees.find(e => e.name === name);
    setFormData(prev => ({
      ...prev,
      employeeName: name,
      employeeId: emp ? emp.id : ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'employeeName') {
      handleEmployeeChange(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // A=Timestamp | B:N=13 data cols | O=Pay Date
      const rowData = [
        timestamp,                  // A - Timestamp
        formData.employeeId,        // B - Employee ID
        formData.employeeName,      // C - Employee Name
        formData.year,              // D - Year
        formData.month,             // E - Month
        formData.basicSalary,       // F - Basic Salary
        formData.lta,               // G - LTA
        formData.bonus,             // H - Bonus
        formData.otherAllowance,    // I - Other Allowance
        formData.overtime,          // J - Overtime
        formData.pf,                // K - PF
        formData.loan,              // L - Loan
        formData.otherDeduction,    // M - Other Deduction
        formData.status,            // N - Status
        formData.payDate            // O - Pay Date
      ];

      const response = await fetch('https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec', {
        method: 'POST',
        body: new URLSearchParams({
          sheetName: 'New Payroll',
          action: 'insert',
          spreadsheetId: '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8',
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Payroll entry added successfully!");
        setShowModal(false);
        fetchPayrollData(); // Refresh table
        // Reset form except year/month/status/paydate defaults
        setFormData(prev => ({
          ...prev,
          employeeId: '',
          employeeName: '',
          basicSalary: '0',
          lta: '0',
          bonus: '0',
          otherAllowance: '0',
          overtime: '0',
          pf: '0',
          loan: '0',
          otherDeduction: '0',
          status: 'Draft',
          payDate: new Date().toISOString().split('T')[0]
        }));
      } else {
        toast.error(result.error || "Failed to add payroll entry");
      }
    } catch (err) {
      toast.error("An error occurred during submission");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };


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
        <div className="flex flex-col md:flex-row md:items-center gap-4">
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm active:scale-95"
          >
            <Plus size={18} />
            New Payroll
          </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">Add New Payroll Entry</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto px-1">
                {/* Employee ID & Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 focus:outline-none"
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Employee Name</label>
                  <select
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp, i) => (
                      <option key={i} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {/* Year & Month */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Year</label>
                  <input
                    type="text"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Month</label>
                  <select
                    name="month"
                    value={formData.month}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Basic Salary & LTA */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Basic Salary</label>
                  <input
                    type="number"
                    name="basicSalary"
                    value={formData.basicSalary}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Leave Travel Allowance</label>
                  <input
                    type="number"
                    name="lta"
                    value={formData.lta}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Bonus & Other Allowance */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Bonus</label>
                  <input
                    type="number"
                    name="bonus"
                    value={formData.bonus}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Other Allowance</label>
                  <input
                    type="number"
                    name="otherAllowance"
                    value={formData.otherAllowance}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Overtime & PF */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Overtime</label>
                  <input
                    type="number"
                    name="overtime"
                    value={formData.overtime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">PF</label>
                  <input
                    type="number"
                    name="pf"
                    value={formData.pf}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Loan & Other Deduction */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Loan</label>
                  <input
                    type="number"
                    name="loan"
                    value={formData.loan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Other Deduction</label>
                  <input
                    type="number"
                    name="otherDeduction"
                    value={formData.otherDeduction}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Status & Pay Date */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Pay Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="date"
                      name="payDate"
                      value={formData.payDate}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t font-medium">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-10 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Payroll;