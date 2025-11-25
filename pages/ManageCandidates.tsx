import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

const ManageCandidates: React.FC = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchCandidates = async () => {
      try {
        const q = query(
          collection(db, 'users'), 
          where('role', '==', 'candidate'), 
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data() as UserProfile);
        setCandidates(data);
        setFilteredCandidates(data);
      } catch (err) {
        console.error("Error fetching candidates:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [user]);

  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = candidates.filter(c => 
      (c.fullname || '').toLowerCase().includes(lowerTerm) || 
      (c.email || '').toLowerCase().includes(lowerTerm)
    );
    setFilteredCandidates(filtered);
  }, [searchTerm, candidates]);

  const toggleStatus = async (candidate: UserProfile) => {
    // Explicitly type newStatus to match UserProfile['accountStatus']
    const newStatus: 'active' | 'disabled' = candidate.accountStatus === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'active' ? 'Enable' : 'Disable';
    
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this account?`)) return;

    try {
      await updateDoc(doc(db, 'users', candidate.uid), {
        accountStatus: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      const updatedList = candidates.map(c => 
        c.uid === candidate.uid ? { ...c, accountStatus: newStatus } : c
      );
      setCandidates(updatedList);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  if (loading) return <div className="text-center py-10">Loading candidates...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Candidates</h2>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCandidates.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No candidates found.</p>
        ) : (
          filteredCandidates.map(candidate => (
            <div key={candidate.uid} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                   {candidate.profilePhotoURL ? (
                     <img src={candidate.profilePhotoURL} alt={candidate.fullname} className="h-full w-full object-cover" />
                   ) : (
                     <i className="fas fa-user text-gray-400 text-xl"></i>
                   )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{candidate.fullname}</h3>
                  <div className="text-sm text-gray-500 flex gap-3">
                    <span><i className="fas fa-envelope mr-1"></i> {candidate.email}</span>
                    <span><i className="fas fa-briefcase mr-1"></i> {candidate.experience} years</span>
                  </div>
                  {candidate.phone && <p className="text-sm text-gray-500"><i className="fas fa-phone mr-1"></i> {candidate.phone}</p>}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                  candidate.accountStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {candidate.accountStatus}
                </span>
                
                <button 
                  onClick={() => toggleStatus(candidate)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    candidate.accountStatus === 'active' 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {candidate.accountStatus === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageCandidates;