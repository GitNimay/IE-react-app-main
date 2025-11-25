import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { uploadToCloudinary } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [role, setRole] = useState<'recruiter' | 'candidate'>('candidate');
  const [experience, setExperience] = useState(0);
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      let photoURL = null;
      
      if (photo) {
        photoURL = await uploadToCloudinary(photo, 'image');
      }

      const userData: any = {
        uid: cred.user.uid,
        email,
        fullname,
        role,
        experience: Number(experience),
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        profilePhotoURL: photoURL
      };

      if (role === 'candidate') {
        userData.phone = phone;
      }

      await setDoc(doc(db, 'users', cred.user.uid), userData);
      navigate('/');
    } catch (err: any) {
      setError("Signup failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-center text-primary-dark mb-6">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
        {/* Signup Only Fields */}
        {!isLogin && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input 
                type="text" 
                required 
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary"
                value={fullname}
                onChange={e => setFullname(e.target.value)}
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select 
                className="mt-1 w-full px-3 py-2 border rounded-md"
                value={role}
                onChange={e => setRole(e.target.value as any)}
              >
                <option value="candidate">Candidate</option>
                {/* Normally hide recruiter signup or make it restricted, but kept open per original app */}
                <option value="recruiter">Recruiter</option> 
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
              <input 
                type="number" 
                min="0"
                required 
                className="mt-1 w-full px-3 py-2 border rounded-md"
                value={experience}
                onChange={e => setExperience(Number(e.target.value))}
              />
            </div>
            {role === 'candidate' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input 
                  type="tel" 
                  pattern="[0-9]{10}"
                  required 
                  placeholder="10 digit number"
                  className="mt-1 w-full px-3 py-2 border rounded-md"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            )}
             <div>
              <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
              <input 
                type="file" 
                accept="image/*"
                className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-light/80"
                onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)}
              />
            </div>
          </>
        )}

        {/* Common Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            required 
            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            required 
            minLength={6}
            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> 
              Processing...
            </span>
          ) : (
             isLogin ? 'Login' : 'Sign Up'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-primary hover:underline focus:outline-none"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;