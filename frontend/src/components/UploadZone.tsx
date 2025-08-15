'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Define a prop for the component to receive the folderId and a callback
interface UploadZoneProps {
  folderId: string | null;
  onUploadSuccess: () => void; // Callback function to refresh file list
}

export default function UploadZone({ folderId, onUploadSuccess }: UploadZoneProps) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error("You are not logged in.");
      return;
    }

    const toastId = toast.loading(`Uploading ${file.name}...`);
    setUploadProgress(0);

    try {
      await axios.post('http://localhost:8000/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
          setUploadProgress(percentCompleted);
          toast.loading(`Uploading... ${percentCompleted}%`, { id: toastId });
        },
      });

      toast.success('Upload complete!', { id: toastId });
      onUploadSuccess(); // Call the callback to trigger a refresh
    } catch (error) {
      toast.error('Upload failed. Please try again.', { id: toastId });
      console.error(error);
    } finally {
      setUploadProgress(null);
    }
  }, [folderId, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-gray-500">
        <UploadCloud className="w-12 h-12 mb-4" />
        <p>{isDragActive ? "Drop the file here..." : "Drag 'n' drop a file here, or click to select a file"}</p>
        {uploadProgress !== null && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
      </div>
    </div>
  );
}