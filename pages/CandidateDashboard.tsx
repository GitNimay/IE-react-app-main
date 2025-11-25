import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Job, InterviewRequest } from '../types';
import { useNavigate } from 'react-router-dom';

const CandidateDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<Map<string, string>>(new Map()); // jobId -> status
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch existing requests
        const reqQuery = query(collection(db, 'interviewRequests'), where('candidateUID', '==', user.uid));
        const reqSnap = await getDocs(reqQuery);
        const reqMap = new Map<string, string>();
        reqSnap.forEach(doc => {
          const data = doc.data() as InterviewRequest;
          reqMap.set(data.jobId, data.status);
        });
        setRequests(reqMap);

        // Fetch available jobs
        const now = Timestamp.now();
        const jobsQuery = query(collection(db, 'jobs'), where('applyDeadline', '>', now), orderBy('applyDeadline', 'asc'));
        const jobSnap = await getDocs(jobsQuery);
        setJobs(jobSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleRequestInterview = async (job: Job) => {
    if (!user || !userProfile) return;
    if (!window.confirm(`Request interview for ${job.title}?`)) return;

    try {
      await addDoc(collection(db, 'interviewRequests'), {
        jobId: job.id,
        jobTitle: job.title,
        candidateUID: user.uid,
        candidateName: userProfile.fullname,
        recruiterUID: job.recruiterUID,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setRequests(new Map(requests.set(job.id, 'pending')));
      alert("Request sent!");
    } catch (err) {
      alert("Error sending request");
    }
  };

  const handleStartInterview = (jobId: string) => {
    navigate(`/interview/${jobId}`);
  };

  if (loading) return <div className="text-center py-10">Loading opportunities...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Opportunities</h2>
      
      {jobs.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg">No active job postings found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map(job => {
            const requestStatus = requests.get(job.id);
            
            return (
              <div key={job.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-primary">{job.title}</h3>
                  {job.interviewPermission === 'request' && (
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-100">
                      Request Required
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-2"><i className="fas fa-building mr-1"></i> {job.companyName}</p>
                <p className="text-sm text-gray-500 mb-4">
                  Deadline: {job.applyDeadline?.toDate ? job.applyDeadline.toDate().toLocaleDateString() : 'N/A'}
                </p>
                
                <div className="mb-4">
                   <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qualifications</p>
                   <p className="text-sm text-gray-600 line-clamp-2">{job.qualifications}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  {requestStatus === 'pending' ? (
                    <button disabled className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-sm font-medium cursor-not-allowed">
                      <i className="fas fa-hourglass-half mr-2"></i> Request Pending
                    </button>
                  ) : requestStatus === 'accepted' || job.interviewPermission === 'anyone' ? (
                    <button 
                      onClick={() => handleStartInterview(job.id)}
                      className="bg-success hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
                    >
                      <i className="fas fa-play mr-2"></i> Start Interview
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleRequestInterview(job)}
                      className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
                    >
                      <i className="fas fa-hand-paper mr-2"></i> Request Permission
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;