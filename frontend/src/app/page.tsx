import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-gray-200">
          Welcome to Zenith Drive
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Your secure and modern cloud storage solution.
        </p>
      </div>
      <div className="mt-8 flex gap-4">
        <Link 
          href="/login" 
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          Login
        </Link>
        <Link 
          href="/signup" 
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}