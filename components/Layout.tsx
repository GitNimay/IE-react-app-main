import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine if we are in an active interview session to hide nav
  const isInterviewSession = location.pathname.startsWith('/interview');

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isInterviewSession) {
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 no-underline">
             <div className="h-10 w-10 rounded-full border-2 border-primary p-1 bg-white flex items-center justify-center">
               <img src="https://i.ibb.co/3y9DKsB6/Yellow-and-Black-Illustrative-Education-Logo-1.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
             </div>
             <div>
               <h1 className="text-xl md:text-2xl font-bold text-primary-dark m-0 leading-tight">InterviewXpert</h1>
               <p className="text-xs text-gray-400 m-0 hidden md:block">AI-Powered Interview Platform</p>
             </div>
          </Link>

          {user && userProfile && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end text-sm">
                <span className="font-semibold text-gray-700">{userProfile.fullname}</span>
                <span className="text-gray-500 capitalize">{userProfile.role}</span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 overflow-hidden focus:outline-none hover:border-primary transition-colors"
                >
                  {userProfile.profilePhotoURL ? (
                    <img src={userProfile.profilePhotoURL} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-gray-500"></i>
                  )}
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100 animate-fade-in z-50">
                     <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                        <p className="text-sm font-medium text-gray-900">{userProfile.fullname}</p>
                        <p className="text-xs text-gray-500">{userProfile.role}</p>
                     </div>
                    <button 
                      onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <i className="fas fa-user-circle w-6"></i> Profile
                    </button>
                    <button 
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <i className="fas fa-sign-out-alt w-6"></i> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {user && userProfile && (
           <nav className="bg-gray-50 border-t border-gray-200">
             <div className="container mx-auto flex justify-center gap-2 md:gap-4 p-2 overflow-x-auto">
                {userProfile.role === 'recruiter' ? (
                  <>
                    <NavLink to="/recruiter/jobs" icon="fas fa-list-alt" label="Posted Jobs" />
                    <NavLink to="/recruiter/post" icon="fas fa-plus-circle" label="Post Job" />
                    <NavLink to="/recruiter/candidates" icon="fas fa-users-cog" label="Manage Candidates" />
                    <NavLink to="/recruiter/requests" icon="fas fa-bell" label="Requests" />
                  </>
                ) : (
                  <>
                    <NavLink to="/candidate/jobs" icon="fas fa-briefcase" label="Available Jobs" />
                    <NavLink to="/candidate/interviews" icon="fas fa-history" label="My Interviews" />
                  </>
                )}
             </div>
           </nav>
        )}
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 md:py-8">
        {children}
      </main>

      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm border-t-4 border-primary">
        <div className="container mx-auto">
          <p>&copy; 2025 InterviewXpert. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const NavLink: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
        isActive 
          ? 'bg-primary text-white shadow-sm' 
          : 'text-gray-600 hover:bg-gray-200 hover:text-primary-dark'
      }`}
    >
      <i className={icon}></i> {label}
    </Link>
  );
};

export default Layout;