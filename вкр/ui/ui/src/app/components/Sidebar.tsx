import { useNavigate, useLocation } from 'react-router';
import { Calendar, BarChart3, LogOut, Phone, Video as VideoIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: Calendar, label: 'Dashboard' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
  ];

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 bg-purple-600 rounded-xl">
            <VideoIcon className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">EmotiCall</h1>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon className="size-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <div className="px-4 py-2">
          <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
          <p className="text-xs text-gray-400">Account Settings</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <LogOut className="size-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}