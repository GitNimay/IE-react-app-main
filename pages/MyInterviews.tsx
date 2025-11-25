import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Interview } from '../types';
import { Link } from 'react-router-dom';

const MyInterviews: React.FC = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchInterviews = async () => {
      try {
        const q = query(collection(db, 'interviews'), where('candidateUID', '==', user.uid), orderBy('submittedAt', 'desc'));
        const snap = await getDocs(q);
        setInterviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interview)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, [user]);

  if (loading) return <div className="text-center py-10">Loading history...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Interview History</h2>
      {interviews.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg">You haven't completed any interviews yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {interviews.map(int => (
            <div key={int.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
               <div>
                 <h3 className="text-lg font-bold text-primary">{int.jobTitle}</h3>
                 <p className="text-sm text-gray-500">
                   Submitted: {int.submittedAt?.toDate ? int.submittedAt.toDate().toLocaleDateString() : 'N/A'}
                 </p>
                 <div className="mt-2 flex gap-3 text-sm">
                   <span className="text-gray-600">Score: <strong>{int.score}</strong></span>
                   <span className={`px-2 rounded text-xs flex items-center ${int.status === 'Hired' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                     {int.status}
                   </span>
                 </div>
               </div>
               <Link to={`/report/${int.id}`} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-medium">
                 View Report
               </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyInterviews;