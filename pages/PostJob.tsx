import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PostJob: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    companyName: '',
    qualifications: '',
    deadline: '',
    description: '',
    permission: 'anyone'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const deadlineDate = new Date(formData.deadline);
      await addDoc(collection(db, 'jobs'), {
        title: formData.title,
        companyName: formData.companyName,
        qualifications: formData.qualifications,
        description: formData.description,
        interviewPermission: formData.permission,
        applyDeadline: Timestamp.fromDate(deadlineDate),
        recruiterUID: user.uid,
        recruiterName: userProfile?.fullname || user.email,
        recruiterEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate('/recruiter/jobs');
    } catch (err) {
      console.error(err);
      alert("Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <i className="fas fa-briefcase text-primary"></i> Post a New Job
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Job Title</label>
            <input 
              type="text" required 
              className="mt-1 w-full px-3 py-2 border rounded-md"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <input 
              type="text" required 
              className="mt-1 w-full px-3 py-2 border rounded-md"
              value={formData.companyName}
              onChange={e => setFormData({...formData, companyName: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Qualifications</label>
          <textarea 
            required rows={3}
            className="mt-1 w-full px-3 py-2 border rounded-md"
            value={formData.qualifications}
            onChange={e => setFormData({...formData, qualifications: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Deadline</label>
            <input 
              type="date" required 
              className="mt-1 w-full px-3 py-2 border rounded-md"
              value={formData.deadline}
              onChange={e => setFormData({...formData, deadline: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Interview Access</label>
            <select 
              className="mt-1 w-full px-3 py-2 border rounded-md"
              value={formData.permission}
              onChange={e => setFormData({...formData, permission: e.target.value})}
            >
              <option value="anyone">Direct Start (No Request)</option>
              <option value="request">Request Permission Needed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Job Description</label>
          <textarea 
            required rows={5}
            className="mt-1 w-full px-3 py-2 border rounded-md"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  );
};

export default PostJob;