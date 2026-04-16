const fs = require('fs');
const employeePath = 'c:\\Users\\user\\Documents\\Botivate-HR-Product-main\\src\\pages\\Employee.jsx';
let content = fs.readFileSync(employeePath, 'utf8');

// 1. Fix imports
content = content.replace(
  "import { Filter, Search, Clock, CheckCircle } from 'lucide-react';",
  "import { Filter, Search, Clock, CheckCircle, Upload, X, Save, Check } from 'lucide-react';\nimport toast from 'react-hot-toast';"
);

// 2. Add States and Methods
const statesAndMethods = `
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [nextEmployeeId, setNextEmployeeId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [joiningFormData, setJoiningFormData] = useState({
    nameAsPerAadhar: '', fatherName: '', dateOfJoining: '', joiningPlace: '', designation: '', salary: '',
    aadharFrontPhoto: null, aadharBackPhoto: null, panCard: null, candidatePhoto: null, currentAddress: '',
    addressAsPerAadhar: '', dobAsPerAadhar: '', gender: '', mobileNo: '', familyMobileNo: '', relationshipWithFamily: '',
    pastPfId: '', currentBankAc: '', ifscCode: '', branchName: '', bankPassbookPhoto: null, personalEmail: '',
    esicNo: '', highestQualification: '', pfEligible: '', esicEligible: '', joiningCompanyName: '', emailToBeIssue: '',
    issueMobile: '', issueLaptop: '', aadharCardNo: '', modeOfAttendance: '', qualificationPhoto: null, paymentMode: '',
    salarySlip: null, resumeCopy: null
  });

  const fetchMasterData = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?sheet=Master&action=fetch'
      );
      const result = await response.json();
      if (result.success && result.data) {
        const companyNames = result.data.slice(1).map(row => row[0]).filter(Boolean);
        setCompanies(companyNames);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const generateNextEmployeeId = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?sheet=JOINING&action=fetch'
      );
      const result = await response.json();
      if (result.success && result.data && result.data.length > 6) {
        const dataRows = result.data.slice(6);
        const employeeIds = dataRows.map(row => row[1]).filter(id => id && id.startsWith('JN-'));
        let maxId = 0;
        employeeIds.forEach(id => {
          const num = parseInt(id.replace('JN-', ''));
          if (!isNaN(num) && num > maxId) maxId = num;
        });
        return \`JN-\${String(maxId + 1).padStart(3, '0')}\`;
      }
      return 'JN-001';
    } catch (error) {
      console.error('Error generating employee ID:', error);
      return 'JN-001';
    }
  };

  const handleJoiningInputChange = (e) => {
    const { name, value } = e.target;
    setJoiningFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setJoiningFormData(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return resolve(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; const MAX_HEIGHT = 1200;
          let width = img.width; let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const uploadFileToDrive = async (originalFile, folderId) => {
    try {
      let fileToProcess = originalFile;
      if (originalFile.type.startsWith('image/')) {
        try { fileToProcess = await compressImage(originalFile); } catch(e) {}
      }
      const reader = new FileReader();
      const base64Data = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileToProcess);
      });
      const params = new URLSearchParams();
      params.append('action', 'uploadFile');
      params.append('sheetName', 'JOINING');
      params.append('base64Data', base64Data);
      params.append('fileName', fileToProcess.name);
      params.append('mimeType', fileToProcess.type);
      params.append('folderId', folderId);
      const response = await fetch('https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'File upload failed');
      let finalUrl = data.fileUrl;
      if (finalUrl && typeof finalUrl === 'object') finalUrl = finalUrl.fileUrl || finalUrl;
      else if (finalUrl && typeof finalUrl === 'string' && finalUrl.startsWith('{') && finalUrl.includes('fileUrl=')) {
        const match = finalUrl.match(/fileUrl=([^,}]+)/);
        if (match && match[1]) finalUrl = match[1].trim();
      }
      return finalUrl || '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(\`Failed to upload file: \${error.message}\`);
      throw error;
    }
  };

  const postToJoiningSheet = async (rowData) => {
    try {
      const params = new URLSearchParams();
      params.append('sheetName', 'JOINING');
      params.append('action', 'insert');
      params.append('rowData', JSON.stringify(rowData));
      const response = await fetch('https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Server returned unsuccessful response');
      return data;
    } catch (error) {
      throw new Error(\`Failed to update sheet: \${error.message}\`);
    }
  };

  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const uploadPromises = {};
      const fileFields = ['aadharFrontPhoto', 'aadharBackPhoto', 'bankPassbookPhoto', 'qualificationPhoto', 'salarySlip', 'resumeCopy', 'candidatePhoto'];
      const folderIds = {
        aadharFrontPhoto: '13hi-xRLOEksb7GH9CthczzlNJTWuD4X3',
        aadharBackPhoto: '16u6IPq0RtljUIVuZLy7VC_V-nq1I8ZYT',
        bankPassbookPhoto: '19LaYkWtsRQ4sZgYiOG5CvzlIoPWJ_ER8',
        qualificationPhoto: '16EmIG-gZYAT2kRFPaINGPdj3AbP-KE-5',
        salarySlip: '13ZTy1kafDuRwlGVCjehDh6RaqslMguQi',
        resumeCopy: '1rnJ2V4Jmy-pbjZ2qiXBugsmJ7GzypFov',
        candidatePhoto: '145FIQRxwN_omuW2XPHx-Bbk8kFOpzosd'
      };
      for (const field of fileFields) {
        uploadPromises[field] = joiningFormData[field] ? uploadFileToDrive(joiningFormData[field], folderIds[field]) : Promise.resolve('');
      }
      const uploadedUrls = await Promise.all(Object.values(uploadPromises).map(p => p.catch(() => '')));
      const fileUrls = {};
      Object.keys(uploadPromises).forEach((field, index) => { fileUrls[field] = uploadedUrls[index]; });
      
      const now = new Date();
      const formattedTimestamp = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')} \${String(now.getHours()).padStart(2, '0')}:\${String(now.getMinutes()).padStart(2, '0')}:\${String(now.getSeconds()).padStart(2, '0')}\`;
      const rowData = [];
      rowData[0] = formattedTimestamp;
      rowData[1] = nextEmployeeId;
      rowData[2] = ''; // Indent No
      rowData[3] = ''; // Candidate Enquiry No
      rowData[4] = joiningFormData.nameAsPerAadhar;
      rowData[5] = joiningFormData.fatherName;
      rowData[6] = formatDOB(joiningFormData.dateOfJoining);
      rowData[7] = joiningFormData.joiningPlace;
      rowData[8] = joiningFormData.designation;
      rowData[9] = joiningFormData.salary;
      rowData[10] = fileUrls.aadharFrontPhoto;
      rowData[11] = fileUrls.aadharBackPhoto;
      rowData[12] = fileUrls.candidatePhoto;
      rowData[13] = joiningFormData.currentAddress;
      rowData[14] = joiningFormData.addressAsPerAadhar;
      rowData[15] = formatDOB(joiningFormData.dobAsPerAadhar);
      rowData[16] = joiningFormData.gender;
      rowData[17] = joiningFormData.mobileNo;
      rowData[18] = joiningFormData.familyMobileNo;
      rowData[19] = joiningFormData.relationshipWithFamily;
      rowData[20] = joiningFormData.pastPfId;
      rowData[21] = joiningFormData.currentBankAc;
      rowData[22] = joiningFormData.ifscCode;
      rowData[23] = joiningFormData.branchName;
      rowData[24] = fileUrls.bankPassbookPhoto;
      rowData[25] = joiningFormData.personalEmail;
      rowData[26] = joiningFormData.esicNo;
      rowData[27] = joiningFormData.highestQualification;
      rowData[28] = joiningFormData.pfEligible;
      rowData[29] = joiningFormData.esicEligible;
      rowData[30] = joiningFormData.joiningCompanyName;
      rowData[31] = joiningFormData.emailToBeIssue;
      rowData[32] = joiningFormData.issueMobile;
      rowData[33] = joiningFormData.issueLaptop;
      rowData[34] = joiningFormData.aadharCardNo;
      rowData[35] = joiningFormData.modeOfAttendance;
      rowData[36] = fileUrls.qualificationPhoto;
      rowData[37] = joiningFormData.paymentMode;
      rowData[38] = fileUrls.salarySlip;
      rowData[39] = fileUrls.resumeCopy;
      rowData[43] = ''; 

      await postToJoiningSheet(rowData);
      toast.success('Employee added successfully!');
      setShowJoiningModal(false);
      
      // Reset form
      setJoiningFormData({
        nameAsPerAadhar: '', fatherName: '', dateOfJoining: '', joiningPlace: '', designation: '', salary: '',
        aadharFrontPhoto: null, aadharBackPhoto: null, panCard: null, candidatePhoto: null, currentAddress: '',
        addressAsPerAadhar: '', dobAsPerAadhar: '', gender: '', mobileNo: '', familyMobileNo: '', relationshipWithFamily: '',
        pastPfId: '', currentBankAc: '', ifscCode: '', branchName: '', bankPassbookPhoto: null, personalEmail: '',
        esicNo: '', highestQualification: '', pfEligible: '', esicEligible: '', joiningCompanyName: '', emailToBeIssue: '',
        issueMobile: '', issueLaptop: '', aadharCardNo: '', modeOfAttendance: '', qualificationPhoto: null, paymentMode: '',
        salarySlip: null, resumeCopy: null
      });

      fetchJoiningData();
    } catch (error) {
      toast.error(\`Failed to submit joining form: \${error.message}\`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (item) => {
    if (editingRowId === item.employeeId) {
      setEditingRowId(null);
    } else {
      setEditingRowId(item.employeeId);
      // Helper function to format DD/MM/YYYY or similar to YYYY-MM-DD for <input type="date">
      const formatForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return dateStr;
      };
      setEditFormData({
        candidateName: item.candidateName || '',
        dateOfJoining: formatForInput(item.dateOfJoining) || '',
        mobileNo: item.mobileNo || '',
        fatherName: item.fatherName || '',
        joiningPlace: item.joiningPlace || '',
        designation: item.designation || '',
        salary: item.salary || ''
      });
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitEdit = async (item) => {
    setLoading(true);
    try {
      const updates = [];
      const { candidateName, dateOfJoining, mobileNo, fatherName, joiningPlace, designation, salary } = editFormData;

      const formatForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return dateStr;
      };

      if (candidateName !== item.candidateName) updates.push({ col: item.colNameAsPerAadhar, val: candidateName });
      if (dateOfJoining !== formatForInput(item.dateOfJoining)) Object.is(dateOfJoining, '') ? null : updates.push({ col: item.colDateOfJoining, val: formatDOB(dateOfJoining) });
      if (mobileNo !== item.mobileNo) updates.push({ col: item.colMobileNo, val: mobileNo });
      if (fatherName !== item.fatherName) updates.push({ col: item.colFatherName, val: fatherName });
      if (joiningPlace !== item.joiningPlace) updates.push({ col: item.colJoiningPlace, val: joiningPlace });
      if (designation !== item.designation) updates.push({ col: item.colDesignation, val: designation });
      if (salary !== item.salary?.toString()) updates.push({ col: item.colSalary, val: salary });

      for (const update of updates) {
        if (!update.col) continue; // column index not found fallback
        await fetch('https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec', {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            sheetName: "JOINING",
            action: "updateCell",
            rowIndex: item.rowIndex.toString(),
            columnIndex: update.col.toString(),
            value: update.val
          }).toString()
        });
      }
      
      toast.success('Updated successfully!');
      setEditingRowId(null);
      fetchJoiningData();
    } catch(err) {
      toast.error('Update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
`;

content = content.replace("  const [error, setError] = useState(null);", "  const [error, setError] = useState(null);\n" + statesAndMethods);

// 3. fetchJoiningData replacement for indices mapping AND add Master Data
content = content.replace(
  "        status: row[getIndex('Status')] || '',\n        // Add other fields as needed",
  `        status: row[getIndex('Status')] || '',
        rowIndex: index + 7,
        colNameAsPerAadhar: getIndex('Name As Per Aadhar') + 1,
        colFatherName: getIndex('Father Name') + 1,
        colDateOfJoining: getIndex('Date Of Joining') + 1,
        colJoiningPlace: getIndex('Joining Place') + 1,
        colDesignation: getIndex('Designation') + 1,
        colSalary: getIndex('Salary') + 1,
        colMobileNo: getIndex('Mobile No.') + 1,
`
);

content = content.replace(
  "    fetchJoiningData(); // Add this line",
  "    fetchJoiningData(); \n    fetchMasterData();\n"
);


// 4. Update Header and Search Row
const headerSearchReplace = `
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md space-x-2">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, employee ID, or designation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300   rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white  text-gray-500 "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 " />
          </div>
          <button 
              onClick={async () => {
                const nextId = await generateNextEmployeeId();
                setNextEmployeeId(nextId);
                setShowJoiningModal(true);
              }}
              className="inline-flex shrink-0 items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              New Joining
          </button>
        </div>
      </div>
`;
content = content.replace(/<div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">[\s\S]*?<\/div>[\s]*<\/div>/, headerSearchReplace.trim());

// 5. the Action table Columns and Rows inside the 'joining' tab table
const tableHeaderReplace = `                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>`;
content = content.replace(
  '<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>', 
  tableHeaderReplace
);

const tableRowReplace = `
                  ) : filteredJoiningData.map((item, index) => {
                    const isEditing = editingRowId === item.employeeId;
                    return (
                    <tr key={index} className="hover:bg-white hover:bg-opacity-5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isEditing}
                            onChange={() => handleEditClick(item)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          {isEditing && (
                            <button
                              onClick={() => submitEdit(item)}
                              disabled={loading}
                              className="text-green-600 hover:text-green-900 ml-2"
                              title="Update"
                            >
                              <Save size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="candidateName" value={editFormData.candidateName} onChange={handleEditChange} className="border p-1 rounded w-32" />
                        ) : item.candidateName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="date" name="dateOfJoining" value={editFormData.dateOfJoining} onChange={handleEditChange} className="border p-1 rounded w-32" />
                        ) : (item.dateOfJoining ? formatDOB(item.dateOfJoining) : '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="mobileNo" value={editFormData.mobileNo} onChange={handleEditChange} className="border p-1 rounded w-28" />
                        ) : item.mobileNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="fatherName" value={editFormData.fatherName} onChange={handleEditChange} className="border p-1 rounded w-32" />
                        ) : item.fatherName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="joiningPlace" value={editFormData.joiningPlace} onChange={handleEditChange} className="border p-1 rounded w-28" />
                        ) : (item.joiningPlace || '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="designation" value={editFormData.designation} onChange={handleEditChange} className="border p-1 rounded w-28" />
                        ) : item.designation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="number" name="salary" value={editFormData.salary} onChange={handleEditChange} className="border p-1 rounded w-24" />
                        ) : item.salary}
                      </td>
                    </tr>
                  )}
                  )}
`;

content = content.replace(/[\s]*\) : filteredJoiningData\.map\(\(item, index\) => \([\s\S]*?<\/tr>[\n\s]*\)\)[\n\s]*\}[\n\s]*<\/tbody>/, tableRowReplace + '\n                </tbody>');

// 6. The Joining Modal snippet
const joiningModalSnippet = `
      {showJoiningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-300 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-900">Direct Employee Joining Form</h3>
              <button onClick={() => setShowJoiningModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleJoiningSubmit} className="p-6 space-y-6">
              {/* Section 1: Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input type="text" value={nextEmployeeId} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indent No</label>
                  <input type="text" value="" disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name As Per Aadhar *</label>
                  <input type="text" name="nameAsPerAadhar" value={joiningFormData.nameAsPerAadhar} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                  <input type="text" name="fatherName" value={joiningFormData.fatherName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Of Birth *</label>
                  <input type="date" name="dobAsPerAadhar" value={joiningFormData.dobAsPerAadhar} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select name="gender" value={joiningFormData.gender} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No. *</label>
                  <input type="tel" name="mobileNo" value={joiningFormData.mobileNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Email *</label>
                  <input type="email" name="personalEmail" value={joiningFormData.personalEmail} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family Mobile Number *</label>
                  <input name="familyMobileNo" value={joiningFormData.familyMobileNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship With Family *</label>
                  <input name="relationshipWithFamily" value={joiningFormData.relationshipWithFamily} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
              </div>

              {/* Section 3: Address Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Address *</label>
                  <textarea name="currentAddress" value={joiningFormData.currentAddress} onChange={handleJoiningInputChange} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address as per Aadhar *</label>
                  <textarea name="addressAsPerAadhar" value={joiningFormData.addressAsPerAadhar} onChange={handleJoiningInputChange} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
              </div>

              {/* Section 4: Employment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Of Joining *</label><input type="date" name="dateOfJoining" value={joiningFormData.dateOfJoining} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Joining Place</label><input type="text" name="joiningPlace" value={joiningFormData.joiningPlace} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label><input type="text" name="designation" value={joiningFormData.designation} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Salary</label><input type="number" name="salary" value={joiningFormData.salary} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Company Name *</label>
                  <select name="joiningCompanyName" value={joiningFormData.joiningCompanyName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required>
                    <option value="">Select Company</option>
                    {companies.map((company, index) => <option key={index} value={company}>{company}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Mode of Attendance *</label><input name="modeOfAttendance" value={joiningFormData.modeOfAttendance} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
              </div>

              {/* Section 5: Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Aadhar Number *</label><input type="text" name="aadharCardNo" value={joiningFormData.aadharCardNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium mb-1">Current Account No*</label><input name="currentBankAc" value={joiningFormData.currentBankAc} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">IFSC Code*</label><input name="ifscCode" value={joiningFormData.ifscCode} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Branch Name*</label><input name="branchName" value={joiningFormData.branchName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Payment Mode *</label><input name="paymentMode" value={joiningFormData.paymentMode} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
              </div>

              {/* Section 6: Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Email Issue</label><select name="emailToBeIssue" value={joiningFormData.emailToBeIssue} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Mobile Issue</label><select name="issueMobile" value={joiningFormData.issueMobile} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Laptop Issue</label><select name="issueLaptop" value={joiningFormData.issueLaptop} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Past PF No</label><input name="pastPfId" value={joiningFormData.pastPfId} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">ESIC No</label><input name="esicNo" value={joiningFormData.esicNo} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Highest Qualification</label><input name="highestQualification" value={joiningFormData.highestQualification} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">PF Eligible</label><select name="pfEligible" value={joiningFormData.pfEligible} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                <div><label className="block text-sm font-medium mb-1">ESIC Eligible</label><select name="esicEligible" value={joiningFormData.esicEligible} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              </div>

              {/* Section 8: Document Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { field: 'aadharFrontPhoto', label: 'Aadhar Card' },
                  { field: 'aadharBackPhoto', label: 'Pan Card' },
                  { field: 'bankPassbookPhoto', label: 'Photo Of Front Bank Passbook' },
                  { field: 'qualificationPhoto', label: 'Qualification Photo' },
                  { field: 'salarySlip', label: 'Salary Slip', accept: 'image/*,application/pdf' },
                  { field: 'resumeCopy', label: 'Upload Resume', accept: 'image/*,application/pdf' },
                ].map((upload) => (
                  <div key={upload.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{upload.label}</label>
                    <div className="flex items-center space-x-2">
                      <input type="file" accept={upload.accept || "image/*"} onChange={(e) => handleFileChange(e, upload.field)} className="hidden" id={\`upload-\${upload.field}\`} />
                      <label htmlFor={\`upload-\${upload.field}\`} className="flex items-center px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 text-gray-700">
                        <Upload size={16} className="mr-2" /> Upload
                      </label>
                      {joiningFormData[upload.field] && <span className="text-sm text-gray-700 truncate max-w-[150px]">{joiningFormData[upload.field].name}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button type="button" onClick={() => setShowJoiningModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className={\`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 flex items-center \${submitting ? 'opacity-90 cursor-not-allowed' : ''}\`}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace("    </div>\n  );\n};\n\nexport default Employee;", joiningModalSnippet + "\n    </div>\n  );\n};\n\nexport default Employee;");

fs.writeFileSync(employeePath, content, 'utf8');
console.log('Update Script Run Successfully');
