import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Upload, Save, X } from 'lucide-react';

const StudentsManagement = ({ students, setStudents }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    student_photo: '',
    email: '',
    phone: '',
    address: '',
    nationality: '',
    roll_no: '',
   
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      dob: '',
      student_photo: '',
      email: '',
      phone: '',
      address: '',
      nationality: '',
      roll_no: '',
    
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setEditingStudent(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };


  const generateStudentId = () => {
    const lastStudent = students[students.length - 1];
    const nextId = lastStudent ? parseInt(lastStudent.student_id.slice(3)) + 1 : 1;
    return `STU${String(nextId).padStart(6, '0')}`;
  };

  const generatePassword = (dob) => {
    if (!dob) return '';
    const date = new Date(dob);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  };

  const generateUNR = (dob) => {
    if (!dob) return '';
    const date = new Date(dob);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const random = Math.random().toString(36).substring(2, 15);
    return `LCA/${day}${month}${year}/${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photoUrl = formData.student_photo;

      if (photoFile) {
        // Upload photo first
        const formDataUpload = new FormData();
        formDataUpload.append('photo', photoFile);
        const uploadRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/upload-photo`, formDataUpload);
        photoUrl = uploadRes.data.photoUrl;
      }

      const studentData = {
        ...formData,
        student_photo: photoUrl,
        student_id: editingStudent ? editingStudent.student_id : generateStudentId(),
        password: editingStudent ? editingStudent.password : generatePassword(formData.dob),
        unr: editingStudent ? editingStudent.unr : generateUNR(formData.dob)
      };

      if (editingStudent) {
        // Update student
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/students/${editingStudent._id}`, studentData);
        setStudents(students.map(s => s._id === editingStudent._id ? { ...s, ...studentData } : s));
      } else {
        // Create student
        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/students`, studentData);
        setStudents([...students, res.data.student]);
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      dob: new Date(student.dob).toISOString().split('T')[0],
      student_photo: student.student_photo,
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      nationality: student.nationality || '',
      roll_no: student.roll_no || '',
     
    });
    setPhotoPreview(student.student_photo);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/students/${id}`);
        setStudents(students.filter(s => s._id !== id));
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Students Management</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Student
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-slate-800">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h4>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nationality *</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll No</label>
                  <input
                    type="text"
                    name="roll_no"
                    value={formData.roll_no}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

      

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student Photo *</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <Upload size={16} />
                    Choose Photo
                  </label>
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover" />
                  )}
                </div>
              </div>

              {!editingStudent && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-slate-700 mb-2">Auto-generated Fields:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Student ID:</span> {generateStudentId()}
                    </div>
                    <div>
                      <span className="font-medium">Password:</span> {generatePassword(formData.dob)}
                    </div>
                    <div>
                      <span className="font-medium">UNR:</span> {generateUNR(formData.dob)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : (editingStudent ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((student) => (
          <div key={student._id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <img src={student.student_photo} alt="Student" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <h5 className="font-medium text-slate-800">{student.name}</h5>
                <p className="text-sm text-slate-600">{student.student_id}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Email:</span> {student.email}</div>
              <div><span className="font-medium">Phone:</span> {student.phone || 'N/A'}</div>
              <div><span className="font-medium">Nationality:</span> {student.nationality}</div>
              <div><span className="font-medium">DOB:</span> {new Date(student.dob).toLocaleDateString()}</div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => handleEdit(student)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(student._id)}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentsManagement;