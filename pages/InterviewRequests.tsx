import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { InterviewRequest } from '../types';

const InterviewRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<InterviewRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      try {
        const q = query(
          collection(db, 'interviewRequests'),
          where('recruiterUID', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InterviewRequest)));
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const handleAction = async (requestId: string, action: 'accepted' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to ${action === 'accepted' ? 'accept' : 'reject'} this request?`)) return;
    
    try {
      await updateDoc(doc(db, 'interviewRequests', requestId), {
        status: action,
        respondedAt: serverTimestamp()
      });
      
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status: action } : req
      ));
    } catch (err) {
      alert("Failed to update request");
    }
  };

  if (loading) return <div className="text-center py-10">Loading requests...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Interview Permission Requests</h2>
      
      {requests.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-gray-500">No interview requests found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg text-primary">{req.jobTitle}</h3>
                  <p className="text-gray-600 mb-1"><span className="font-medium">Candidate:</span> {req.candidateName}</p>
                  <p className="text-xs text-gray-400">
                    Requested: {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {req.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => handleAction(req.id, 'accepted')}
                        className="bg-green-100 text-green-700 px-4 py-2 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleAction(req.id, 'rejected')}
                        className="bg-red-100 text-red-700 px-4 py-2 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1 rounded text-sm font-medium capitalize ${
                      req.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewRequests;