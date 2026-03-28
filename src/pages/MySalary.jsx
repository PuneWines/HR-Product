import React, { useEffect, useState } from 'react';
import { 
  DollarSign, Download, Eye, Calendar, TrendingUp, 
  ArrowUpRight, ArrowDownRight, CreditCard, Receipt, 
  X, Printer, CheckCircle2, AlertCircle, Info, PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const PayslipModal = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 print:shadow-none print:rounded-none">
        {/* Modal Header */}
        <div className="px-8 py-6 bg-indigo-600 text-white flex items-center justify-between print:bg-white print:text-black print:border-b print:px-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-lg print:hidden">
                <Receipt size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold tracking-tight">Salary Payslip</h2>
                <p className="text-indigo-100 text-sm print:text-gray-500">{record.month} {record.year}</p>
             </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button 
              onClick={handlePrint}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Print Payslip"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-8 print:p-4">
          {/* Employee Info Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 print:border-gray-300">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Employee Details</p>
              <h3 className="text-lg font-bold text-gray-900">{record.employeeName}</h3>
              <p className="text-gray-600 font-medium">{record.employeeId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                record.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {record.status === 'Paid' ? <CheckCircle2 size={12} className="mr-1" /> : <AlertCircle size={12} className="mr-1" />}
                {record.status}
              </span>
              <p className="text-gray-500 text-xs mt-2">Paid on: {record.payDate}</p>
            </div>
          </div>

          {/* Earnings & Deductions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                <ArrowUpRight size={16} className="text-green-500" />
                Earnings
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Basic Salary</span>
                  <span className="font-semibold text-gray-900">₹{record.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allowances</span>
                  <span className="font-semibold text-gray-900">₹{record.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overtime</span>
                  <span className="font-semibold text-gray-900">₹{record.overtime.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                <ArrowDownRight size={16} className="text-red-500" />
                Deductions
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax & Provident Fund</span>
                  <span className="font-semibold text-gray-900">₹{record.deductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Other Deductions</span>
                  <span className="font-semibold text-gray-900">₹0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Summary */}
          <div className="bg-gray-50 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100 print:bg-white print:border-gray-300">
            <div>
              <p className="text-gray-600 text-sm font-medium">Net Payable Amount</p>
              <p className="text-xs text-gray-400 italic mt-1">Total Earnings - Total Deductions</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-3xl font-black text-indigo-600">₹{record.netSalary.toLocaleString()}</p>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 text-center italic mt-6 print:block">
            This is a computer-generated document and does not require a physical signature.
          </div>
        </div>
      </div>
    </div>
  );
};

const MySalary = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const toNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [salaryData, setSalaryData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const filteredSalary = salaryData.filter(record => 
    record.year.toString() === selectedYear.toString() &&
    record.month.toLowerCase() === selectedMonth.toLowerCase()
  );

  const fetchSalaryData = async () => { 
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      let employeeId = localStorage.getItem("employeeId");
      const employeeName = user?.Name;

      if (!employeeName) {
        throw new Error("User session not found. Please login again.");
      }

      // Fetch from PAYROLL sheet using specialized script
      const PAYROLL_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybtkq0iB4NTrw5jHcpjkwyncpLZlBGpgADUxq2nuGdX36nWlE2zum-8DBmsQgu-FzhTQ/exec';
      const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';
      
      const response = await fetch(
        `${PAYROLL_SCRIPT_URL}?sheet=PAYROLL&action=fetch&spreadsheetId=${SPREADSHEET_ID}`
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch salary data');
      
      const rawData = result.data || result;
      if (!Array.isArray(rawData)) throw new Error('Expected array data not received');

      // Data starts from index 3 (Row 4) based on screenshot (Row 3 is header)
      // Columns B:P -> index 0:14
      const dataRows = rawData.length > 3 ? rawData.slice(3) : [];

      const processedData = dataRows
        .map((row, index) => {
          return {
            id: index + 1,
            empId: row[1] || '', // Col B is index 1 if we get full sheet? Wait.
            // Let's assume the Apps Script returns columns starting from A.
            // Col A: S.N (index 0)
            // Col B: EMP ID (index 1)
            // Col C: Name (index 2)
            // Col D: Designation (index 3)
            // Col E: Location (index 4)
            // Col F: DOJ (index 5)
            // Col G: Monthly Salary (index 6)
            // Col H: Days in Month (index 7)
            // Col I: Mgmt Adjustment (index 8)
            // Col J: Total Present (index 9)
            // Col K: Advance Deduction (index 10)
            // Col L: Brackage (index 11)
            // Col M: Medical (index 12)
            // Col N: Total Salary (index 13)
            // Col O: Year (index 14)
            // Col P: Month (index 15)
            employeeId: row[1] || '',
            employeeName: row[2] || '',
            designation: row[3] || '',
            location: row[4] || '',
            doj: row[5] || '',
            monthlySalary: toNumber(row[6]),
            daysInMonth: row[7] || '',
            mgmtAdjustment: row[8] || '',
            totalPresent: row[9] || '',
            advanceDeduction: toNumber(row[10]),
            brackage: row[11] || '',
            medical: row[12] || '',
            totalSalary: toNumber(row[13]),
            year: row[14] || '',
            month: row[15] || '',
            status: 'Paid', // Default status as it's not in the sheet capture
          };
        });
        // Filtering by user in "My Salary"
        const userSalaryData = processedData.filter(item => 
          item.employeeName?.toString().trim().toLowerCase() === employeeName.trim().toLowerCase()
        );
      
      if (userSalaryData.length > 0) {
        setSalaryData(userSalaryData);
        setIsDemo(false);
      } else {
        console.warn('No salary data found for current user in PAYROLL.');
        setSalaryData([]); // Or keep dummy data if needed
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      setError(error.message);
      toast.error(`Failed to load payroll data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, []);

  const totalEarnings = filteredSalary.reduce((sum, r) => sum + r.totalSalary, 0);
  const averageSalary = filteredSalary.length > 0 ? totalEarnings / filteredSalary.length : 0;
  const totalDeductions = filteredSalary.reduce((sum, r) => sum + (r.advanceDeduction || 0), 0);
  const totalOvertime = 0; // Not explicitly in the new columns

  const years = [2023, 2024, 2025, 2026];

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className={`relative overflow-hidden bg-white rounded-3xl p-6 shadow-xl border border-gray-100 group transition-all hover:-translate-y-1`}>
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 transition-transform group-hover:scale-110`}>
         <Icon size={96} />
      </div>
      <div className="relative flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${colorClass} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 mt-1">₹{value.toLocaleString()}</h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Financial Overview</h1>
            {isDemo && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 animate-pulse">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-500" />
            Track your earnings and salary history from Payroll.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Year</span>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-700 outline-none pr-4"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Month</span>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-700 outline-none pr-4"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <button 
            onClick={fetchSalaryData}
            className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Monthly Salary" value={filteredSalary[0]?.totalSalary || 0} icon={DollarSign} colorClass="bg-green-500" />
        <StatCard title="Basic Salary" value={filteredSalary[0]?.monthlySalary || 0} icon={TrendingUp} colorClass="bg-blue-500" />
        <StatCard title="Total Deductions" value={filteredSalary[0]?.advanceDeduction || 0} icon={ArrowDownRight} colorClass="bg-red-500" />
        <StatCard title="Medical" value={toNumber(filteredSalary[0]?.medical || 0)} icon={PlusCircle} colorClass="bg-amber-500" />
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">My Salary Stage</h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
             <Calendar size={14} className="text-indigo-500" />
             {selectedMonth} {selectedYear}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">EMP ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Name of the Employee</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Designation</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">DOJ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Monthly Salary</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Days in a Month</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Mgmt Adjustment</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Total Present</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Advance Deduction</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Brackage</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Medical</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 font-black text-gray-900 bg-indigo-50/50">Total Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tableLoading ? (
                <tr>
                  <td colSpan="13" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                       <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                       <p className="text-gray-500 font-medium">Loading payroll records...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="13" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <div className="p-3 bg-red-50 text-red-500 rounded-full">
                          <AlertCircle size={32} />
                       </div>
                       <p className="text-gray-600 font-medium">{error}</p>
                       <button onClick={fetchSalaryData} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95">Retry Sync</button>
                    </div>
                  </td>
                </tr>
              ) : filteredSalary.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                       <Info size={40} className="opacity-20" />
                       <p className="font-medium">No salary records found for {selectedMonth} {selectedYear}.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSalary.map((record) => (
                <tr key={record.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-gray-900 border-b border-gray-100">{record.employeeId}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.employeeName}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.designation}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.location}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.doj}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">₹{record.monthlySalary?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.daysInMonth}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.mgmtAdjustment}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.totalPresent}</td>
                  <td className="px-6 py-4 text-xs text-red-600 border-b border-gray-100">₹{record.advanceDeduction?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.brackage}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.medical}</td>
                  <td className="px-6 py-4 text-xs font-black text-indigo-600 bg-indigo-50/30 border-b border-gray-100">₹{record.totalSalary?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      <PayslipModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        record={selectedRecord} 
      />
    </div>
  );
};

export default MySalary;