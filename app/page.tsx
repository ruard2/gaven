import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">🌱</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Gavenroute</h1>
        <p className="text-gray-600 mb-8">
          Verbind vrijwilligers met taken die bij hen passen.
        </p>
        <Link
          href="/admin/login"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Beheerder inloggen
        </Link>
        <p className="mt-6 text-sm text-gray-500">
          Gebruiker? Scan de QR-code van jouw organisatie.
        </p>
      </div>
    </main>
  );
}
