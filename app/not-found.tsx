import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Image src="/logo.png" alt="Kynea" width={120} height={40} className="mx-auto" />
        </div>
        <h1 className="text-6xl font-black text-neutral-900 mb-4">404</h1>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Esta página no existe</h2>
        <p className="text-neutral-500 mb-8">Parece que esta clase ya terminó o fue removida. Pero hay muchas más esperándote.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold px-8 py-3 rounded-btn transition-colors"
        >
          Explorar clases
        </Link>
      </div>
    </div>
  );
}
