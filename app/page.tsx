export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">WPH Expense Manager</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Fast and efficient expense tracking
        </p>
        <div className="space-y-4">
          <a
            href="/auth/login"
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </a>
          <a
            href="/auth/signup"
            className="block bg-gray-200 dark:bg-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
