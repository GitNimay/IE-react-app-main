import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Interview } from '../types';

const JobCandidates: React.FC = () => {
  const { jobId } = useParams();
  const [jobTitle, setJobTitle] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!jobId) return;
      try {
        // Fetch Job Info
        const jobSnap = await getDoc(doc(db, 'jobs', jobId));
        if (jobSnap.exists()) {
          setJobTitle(jobSnap.data().title);
        }

        // Fetch Interviews
        const q = query(
          collection(db, 'interviews'),
          where('jobId', '==', jobId),
          orderBy('submittedAt', 'desc')
        );
        const snap = await getDocs(q);
        setInterviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interview)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId]);

  if (loading) return <div className="text-center py-10">Loading candidates...</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/recruiter/jobs" className="text-gray-500 hover:text-primary">
          <i className="fas fa-arrow-left"></i> Back
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Candidates for: <span className="text-primary">{jobTitle}</span></h2>
      </div>

      {interviews.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-500">No interviews completed for this job yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interviews.map(interview => (
            <div key={interview.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                 <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold">
                    {interview.candidateName.charAt(0)}
                 </div>
                 <div>
                   <h3 className="font-bold text-gray-800">{interview.candidateName}</h3>
                   <p className="text-xs text-gray-500">
                     {interview.submittedAt?.toDate ? interview.submittedAt.toDate().toLocaleDateString() : 'N/A'}
                   </p>
                 </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Overall Score:</span>
                  <span className="font-bold text-gray-800">{interview.score}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Resume Match:</span>
                  <span className="font-semibold text-gray-700">{interview.resumeScore}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Q&A Quality:</span>
                  <span className="font-semibold text-gray-700">{interview.qnaScore}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                   interview.status === 'Hired' ? 'bg-teal-100 text-teal-800' : 
                   interview.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                   'bg-gray-100 text-gray-600'
                }`}>
                  {interview.status || 'Pending'}
                </span>
                
                <Link to={`/report/${interview.id}`} className="text-primary hover:text-primary-dark text-sm font-medium">
                  View Full Report <i className="fas fa-chevron-right ml-1"></i>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobCandidates;