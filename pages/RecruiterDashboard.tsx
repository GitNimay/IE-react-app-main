import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { Link, useNavigate } from 'react-router-dom';

const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      try {
        const q = query(
          collection(db, 'jobs'),
          where('recruiterUID', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const jobList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        setJobs(jobList);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user]);

  const handleDelete = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err) {
      alert("Failed to delete job");
    }
  };

  if (loading) return <div className="text-center py-10">Loading jobs...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Posted Jobs</h2>
        <Link to="/recruiter/post" className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded shadow-sm flex items-center gap-2">
          <i className="fas fa-plus"></i> Post Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow border border-gray-100">
          <p className="text-gray-500">You haven't posted any jobs yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div key={job.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary mb-2">{job.title}</h3>
                <p className="text-sm text-gray-500 mb-2"><i className="fas fa-building mr-1"></i> {job.companyName}</p>
                <p className="text-sm text-gray-500 mb-4">
                  <i className="far fa-calendar-alt mr-1"></i> 
                  Deadline: {job.applyDeadline?.toDate ? job.applyDeadline.toDate().toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">{job.description}</p>
              </div>
              
              <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                <button 
                  onClick={() => navigate(`/recruiter/job/${job.id}/candidates`)}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                   View Candidates
                </button>
                <button 
                  onClick={() => handleDelete(job.id)}
                  className="bg-red-50 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;