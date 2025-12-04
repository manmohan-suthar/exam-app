import React, { useState, useMemo } from 'react';
import { Search, Download, Filter } from 'lucide-react';

const StudentsTable = ({ students, updateStudentRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const filteredAndSortedData = useMemo(() => {
    let filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.password.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.dob.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.unr.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [students, searchTerm, sortConfig]);

  // Show all filtered data since we use scrolling instead of pagination
  const displayData = filteredAndSortedData;

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToCSV = () => {
    const headers = ['Student Photo', 'Name', 'Student ID', 'Password', 'DOB', 'UNR'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedData.map(student => [
        `"${student.student_photo}"`,
        `"${student.name}"`,
        `"${student.student_id}"`,
        `"${student.password}"`,
        `"${student.dob}"`,
        
        `"${student.unr}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-7xl h-[500px] flex flex-col" role="table" aria-label="Students Table">
      <div className="p-6 border-b border-slate-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-slate-800">Students Management</h3>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="min-w-max h-full flex flex-col">
          {/* Fixed Header */}
          <div className="bg-slate-50 border-b border-slate-200 flex-shrink-0" role="row">
            <div className="flex">
              {['student_photo', 'name', 'student_id', 'password', 'dob', 'unr'].map(key => (
                <div
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 flex-shrink-0 ${
                    key === 'student_photo' ? 'w-20' :
                    key === 'name' ? 'w-40' :
                    key === 'student_id' ? 'w-24' :
                    key === 'password' ? 'w-24' :
                    key === 'dob' ? 'w-32' : 'w-64'
                  }`}
                  role="columnheader"
                >
                  {key === 'student_id' ? 'Student ID' :
                   key === 'dob' ? 'Date of Birth' :
                  
                   key === 'unr' ? 'UNR' : key.charAt(0).toUpperCase() + key.slice(1)}
                  {sortConfig.key === key && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-auto">
            {displayData.map((student) => (
              <div key={student._id} className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors" role="row">
                <div className="px-4 py-3 flex-shrink-0 w-20" role="cell">
                  <img src={student.student_photo} alt="Student Photo" className="w-12 h-12 rounded-full object-cover" />
                </div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-40 truncate" title={student.name} role="cell">{student.name}</div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-24" role="cell">{student.student_id}</div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-24" role="cell">{student.password}</div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-32" role="cell">
                  {new Date(student.dob).toLocaleDateString()}
                </div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-64 truncate" title={student.unr} role="cell">{student.unr}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentsTable;