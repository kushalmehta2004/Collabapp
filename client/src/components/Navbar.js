import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import ThemeToggle from './common/ThemeToggle';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Collab App</h1>
            </Link>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link
                to="/dashboard"
                className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full" />
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName ? user.firstName[0].toUpperCase() : user?.username[0].toUpperCase()}
                </span>
              </div>
              <span className="text-gray-700 dark:text-gray-200 text-sm">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;