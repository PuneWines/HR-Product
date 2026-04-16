import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Globe,
  Search,
  Phone,
  UserCheck,
  UserX,
  UserMinus,
  AlarmClockCheck,
  Users,
  Calendar,
  DollarSign,
  FileText as LeaveIcon,
  User as ProfileIcon,
  Clock,
  LogOut as LogOutIcon,
  X,
  User,
  Menu,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  Book,
  BadgeDollarSign,
  BookPlus,
  Wallet
} from 'lucide-react';
import useAuthStore from '../store/authStore';
//nothig there changes
const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    navigate('/login', { replace: true });
  };

  const adminMenuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/indent', icon: FileText, label: 'Indent' },
    { path: '/find-enquiry', icon: Search, label: 'Find Enquiry' },
    { path: '/call-tracker', icon: Phone, label: 'Call Tracker' },
    { path: '/after-joining-work', icon: UserCheck, label: 'After Joining Work' },
    { path: '/leaving', icon: UserX, label: 'Leaving' },
    { path: '/after-leaving-work', icon: UserMinus, label: 'After Leaving Work' },
    { path: '/employee', icon: Users, label: 'Employee' },
    { path: '/leave-management', icon: BookPlus, label: 'Leave Management' },
    {
      type: 'dropdown',
      icon: Book,
      label: 'Attendance',
      isOpen: attendanceOpen,
      toggle: () => setAttendanceOpen(!attendanceOpen),
      items: [
        { path: '/attendance', label: 'Monthly' },
        { path: '/attendancedaily', label: 'Daily' }
      ]
    },
    { path: '/payroll', icon: BadgeDollarSign, label: 'Payroll' },
    { path: '/misreport', icon: AlarmClockCheck, label: 'MIS Report' },
    { path: '/admin-advance', icon: Wallet, label: 'Advance' },
  ];

  const employeeMenuItems = [
    { path: '/my-profile', icon: ProfileIcon, label: 'My Profile' },
    { path: '/my-attendance', icon: Clock, label: 'My Attendance' },
    { path: '/leave-request', icon: LeaveIcon, label: 'Leave Request' },
    { path: '/my-salary', icon: DollarSign, label: 'My Salary' },
    { path: '/advance', icon: Wallet, label: 'Advance' },
    { path: '/company-calendar', icon: Calendar, label: 'Company Calendar' },
  ];

  const menuItems = user?.Admin === 'Yes' ? adminMenuItems : employeeMenuItems;

  return (
    <>
      {/* Backdrop for mobile/tablet */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <aside className={`fixed top-0 left-0 h-full bg-indigo-900 text-white z-50 transition-transform duration-300 ease-in-out w-64 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col shadow-2xl lg:shadow-none`}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-indigo-800">
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <Users size={24} />
            <span>HR FMS</span>
          </h1>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-indigo-800 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            if (item.type === 'dropdown') {
              return (
                <div key={item.label}>
                  <button
                    onClick={item.toggle}
                    className={`flex items-center justify-between w-full py-2.5 px-4 rounded-lg transition-colors ${item.isOpen
                        ? 'bg-indigo-800 text-white'
                        : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3" size={20} />
                      <span>{item.label}</span>
                    </div>
                    {item.isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {item.isOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.items.map((subItem) => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          className={({ isActive }) =>
                            `flex items-center py-2 px-4 rounded-lg transition-colors ${isActive
                              ? 'bg-indigo-700 text-white'
                              : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
                            }`
                          }
                          onClick={onClose}
                        >
                          <span>{subItem.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center py-2.5 px-4 rounded-lg transition-colors ${isActive
                    ? 'bg-indigo-800 text-white'
                    : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
                  }`
                }
                onClick={onClose}
              >
                <item.icon className="mr-3" size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-indigo-800">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <User size={20} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.Name || user?.Username || 'Guest'}</p>
              <p className="text-xs text-indigo-300 truncate">{user?.Admin === 'Yes' ? 'Administrator' : 'Employee'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleLogout();
              onClose?.();
            }}
            className="flex items-center py-2.5 px-4 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors w-full cursor-pointer"
          >
            <LogOutIcon className="mr-3" size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;