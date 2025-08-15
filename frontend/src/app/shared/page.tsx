'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { File, Folder, Home, Users, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ThemeToggle'; // Assuming you might want this

interface SharedItem {
  item_id: string;
  name: string;
  type: 'file' | 'folder';
  owner_name: string; // The email of the person who shared it
}

export default function SharedWithMePage() {
  const [files, setFiles] = useState<SharedItem[]>([]);
  const [folders, setFolders] = useState<SharedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchSharedContent = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const response = await axios.get('http://localhost:8000/shared-with-me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(response.data.files);
      setFolders(response.data.folders);
    } catch (err) {
      toast.error('Failed to fetch shared items.');
      console.error('Failed to fetch shared items', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSharedContent();
  }, [fetchSharedContent]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar Navigation - copied from your dashboard for consistency */}
      <nav className="w-64 bg-white dark:bg-gray-800 p-4 border-r dark:border-gray-700 flex-col hidden md:flex">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-500 mb-8">Zenith Drive</h1>
        <ul className="space-y-2">
          <li><Link href="/dashboard" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"><span>My Drive</span></Link></li>
          <li><Link href="/shared" className="flex items-center gap-3 p-2 rounded-md font-medium bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400"><span>Shared with me</span></Link></li>
          <li><Link href="/trash" className="flex items-center gap-3 p-2 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"><span>Trash</span></Link></li>
        </ul>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Users className="w-6 h-6" /> Shared With Me
          </h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <LoaderCircle className="w-12 h-12 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-8">
              {folders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Folders</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {folders.map(folder => (
                      <div key={folder.item_id} className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <Folder className="w-16 h-16 text-blue-500 mb-2" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full" title={folder.name}>{folder.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center" title={`Owner: ${folder.owner_name}`}>Owner: {folder.owner_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {files.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Files</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {files.map(file => (
                       <div key={file.item_id} className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                          <File className="w-16 h-16 text-gray-400 mb-2" />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full" title={file.name}>{file.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center" title={`Owner: ${file.owner_name}`}>Owner: {file.owner_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isLoading && files.length === 0 && folders.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-16">
                  <p>No items have been shared with you yet.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}