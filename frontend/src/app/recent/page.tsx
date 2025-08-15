'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { File, Home, LoaderCircle, Clock, HardDrive, Users, Star, Trash2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { formatDistanceToNow } from 'date-fns';

interface RecentFile {
  id: string;
  name: string;
  updated_at: string;
  owner_name: string;
}

export default function RecentPage() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchRecent = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const response = await axios.get('http://localhost:8000/recent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentFiles(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-white dark:bg-gray-800 p-4 border-r dark:border-gray-700 flex-col hidden md:flex">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-500 mb-8">Zenith Drive</h1>
        <ul className="space-y-2">
          <li><Link href="/dashboard" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"><HardDrive className="w-5 h-5" /><span>My Drive</span></Link></li>
          <li><Link href="/shared" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"><Users className="w-5 h-5" /><span>Shared with me</span></Link></li>
          <li><Link href="/recent" className="flex items-center gap-3 p-2 rounded-md font-medium bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400"><Clock className="w-5 h-5" /><span>Recent</span></Link></li>
          <li><Link href="/starred" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"><Star className="w-5 h-5" /><span>Starred</span></Link></li>
          <li><Link href="/trash" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"><Trash2 className="w-5 h-5" /><span>Trash</span></Link></li>
        </ul>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Clock className="w-6 h-6" /> Recent Files
          </h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><LoaderCircle className="w-12 h-12 animate-spin text-blue-600" /></div>
          ) : (
            <div className="space-y-2">
              {recentFiles.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 mt-16">No recent files.</p>
              ) : (
                <ul className="space-y-3">
                  {recentFiles.map(file => (
                    <li key={file.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3 truncate">
                        <File className="w-6 h-6 text-gray-400 flex-shrink-0" />
                        <div className="truncate">
                          <p className="text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Modified {formatDistanceToNow(new Date(file.updated_at))} ago by {file.owner_name}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}