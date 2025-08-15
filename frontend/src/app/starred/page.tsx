'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { File, Folder, Home, LoaderCircle, Star } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface ItemType {
  id: string;
  name: string;
}

export default function StarredPage() {
  const [items, setItems] = useState<{ files: ItemType[], folders: ItemType[] }>({ files: [], folders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchStarred = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const response = await axios.get('http://localhost:8000/stars', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStarred();
  }, [fetchStarred]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-white dark:bg-gray-800 p-4 border-r dark:border-gray-700 flex-col hidden md:flex">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-500 mb-8">Zenith Drive</h1>
        <ul className="space-y-2">
          <li><Link href="/dashboard" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"><span>My Drive</span></Link></li>
          <li><Link href="/shared" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"><span>Shared with me</span></Link></li>
          <li><Link href="/starred" className="flex items-center gap-3 p-2 rounded-md font-medium bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400"><span>Starred</span></Link></li>
          <li><Link href="/trash" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"><span>Trash</span></Link></li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Star className="w-6 h-6" /> Starred
          </h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><LoaderCircle className="w-12 h-12 animate-spin text-blue-600" /></div>
          ) : (
            <div className="space-y-8">
              {items.folders.length === 0 && items.files.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 mt-16">No starred items.</p>
              )}
              {items.folders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Folders</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {items.folders.map(folder => (
                      <div key={folder.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col items-center">
                        <Folder className="w-16 h-16 text-blue-500 mb-2" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full">{folder.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {items.files.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Files</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {items.files.map(file => (
                      <div key={file.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col items-center">
                        <File className="w-16 h-16 text-gray-400 mb-2" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}