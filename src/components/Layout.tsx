import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CurrencyDollarIcon,
  UsersIcon,
  FolderIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';
import SEO from './SEO';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Bounties', href: '/bounties', icon: CurrencyDollarIcon },
  { name: 'Miners', href: '/miners', icon: UsersIcon },
  { name: 'Repositories', href: '/repositories', icon: FolderIcon },
  { name: 'FAQ', href: '/faq', icon: QuestionMarkCircleIcon },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gray-50">
        {/* Mobile menu */}
        <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
          <div className="fixed inset-0 bg-gray-600/75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-6">
              <Link to="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Gittensor</span>
              </Link>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-5 px-2">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href === '/bounties' && location.pathname === '/issues');
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        isActive
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 h-6 w-6'
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-white shadow">
            <div className="flex h-16 items-center px-6">
              <Link to="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Gittensor</span>
              </Link>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4">
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href ||
                      (item.href === '/bounties' && location.pathname === '/issues');
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          isActive
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          'group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4'
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                            'mr-3 h-6 w-6'
                          )}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col flex-1">
          {/* Top bar */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <div className="text-sm text-gray-500">
                  Autonomous Software Development
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}