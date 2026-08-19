import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FileText,
  PlusCircle,
  Clock,
  Filter,
  ArrowDownToLine,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';

const PatientRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'lab_report',
    recordDate: '',
    notes: ''
  });

  const [filterCategory, setFilterCategory] = useState('all');

  const fetchRecords = async () => {
    try {
      const response = await api.get('/patient/records');
      if (response.success && response.data) {
        setRecords(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
      setError('Could not retrieve medical documentation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!selectedImage) {
      setError('Please select an image file to upload.');
      return;
    }

    setUploadingImage(true);
    try {
      // 1. Upload file to backend -> Cloudinary
      const formData = new FormData();
      formData.append('image', selectedImage);

      const uploadRes = await api.post('/patient/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!uploadRes.success || !uploadRes.data?.fileUrl) {
        throw new Error('Image upload failed.');
      }

      const uploadedUrl = uploadRes.data.fileUrl;

      // 2. Submit medical record metadata
      const response = await api.post('/patient/records', {
        title: form.title,
        category: form.category,
        recordDate: form.recordDate || undefined,
        notes: form.notes,
        fileUrl: uploadedUrl
      });

      if (response.success) {
        setSuccess('Document cataloged successfully!');
        setRecords(prev => [response.data, ...prev]);
        setShowAddForm(false);
        setSelectedImage(null);
        setForm({
          title: '',
          category: 'lab_report',
          recordDate: '',
          notes: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to catalog document.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRecordDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this medical record? This action cannot be undone.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await api.delete(`/patient/records/${recordId}`);
      if (response.success) {
        setSuccess('Document deleted successfully!');
        setRecords(prev => prev.filter(r => r._id !== recordId));
      } else {
        throw new Error(response.message || 'Failed to delete medical record.');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete medical record.');
    }
  };

  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case 'lab_report':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'prescription':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'scan':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'vaccine':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-550/20';
    }
  };

  const getCategoryLabel = (cat) => {
    return cat.replace('_', ' ').toUpperCase();
  };

  const filteredRecords = filterCategory === 'all'
    ? records
    : records.filter(r => r.category === filterCategory);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading documentation index...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Medical Records</h2>
          <p className="text-xs text-slate-400">Manage, view, and organize medical certificates, scans, and reports.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showAddForm ? 'Close uploader' : 'Add New Record'}</span>
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Form Box */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 text-left max-w-xl mx-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <h3 className="text-sm font-bold text-white mb-4">Record Metadata Uploader</h3>

          <form onSubmit={handleRecordSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Document Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                placeholder="e.g. Blood Test - Q3 2026, Chest X-Ray"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                >
                  <option value="lab_report">Lab Diagnostic Report</option>
                  <option value="prescription">Prescription Slip</option>
                  <option value="scan">MRI / X-Ray / Scan</option>
                  <option value="vaccine">Vaccination Sheet</option>
                  <option value="other">Other/Miscellaneous</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Record Date</label>
                <input
                  type="date"
                  value={form.recordDate}
                  onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Upload Record Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files[0])}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-dark-950 hover:file:bg-brand-400 file:cursor-pointer"
                required
              />
              {selectedImage && (
                <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                  Selected: {selectedImage.name} ({Math.round(selectedImage.size / 1024)} KB)
                </p>
              )}
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Additional Clinical Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 h-20 resize-none"
                placeholder="Include doctor instructions, comments, or follow-ups..."
              />
            </div>

            <button
              type="submit"
              disabled={uploadingImage}
              className={`w-full text-xs font-bold py-2.5 rounded-xl transition-all ${
                uploadingImage
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-500 hover:bg-brand-400 text-dark-950'
              }`}
            >
              {uploadingImage ? 'Uploading Image to Cloudinary...' : 'Upload & Secure Document'}
            </button>
          </form>
        </div>
      )}

      {/* Filters Strip */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2 text-left">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-400">Filter By Category:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'lab_report', 'prescription', 'scan', 'vaccine', 'other'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border ${
                filterCategory === cat
                  ? 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                  : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'ALL RECORDS' : getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Records Listing */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
          <FileCheck className="w-12 h-12 text-slate-650 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No documents match the criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Get started by logging your clinical records, scan files, or reports to encrypt them on the cloud.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {filteredRecords.map(record => (
            <div
              key={record._id}
              className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className={`text-[8px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase ${getCategoryBadgeClass(record.category)}`}>
                    {getCategoryLabel(record.category)}
                  </span>
                  <div className="flex items-center text-[10px] text-slate-550 space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(record.recordDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mt-3 flex items-center">
                  <FileText className="w-4 h-4 text-brand-400 mr-1.5 shrink-0" />
                  <span>{record.title}</span>
                </h3>

                {record.notes && (
                  <p className="text-xs text-slate-400 mt-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 italic">
                    {record.notes}
                  </p>
                )}

                {record.fileUrl && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 max-h-40 bg-slate-900/60 flex items-center justify-center">
                    <img 
                      src={record.fileUrl} 
                      alt={record.title} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-850">
                <button
                  onClick={() => handleRecordDelete(record._id)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-rose-500 hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <a
                  href={record.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-xs font-bold text-brand-400 hover:text-brand-300 transition-all"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Download Document</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default PatientRecords;
