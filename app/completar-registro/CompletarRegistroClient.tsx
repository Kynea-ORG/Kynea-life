'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, BookOpen, Building2, Loader2, Check } from 'lucide-react';
import { completeOAuthRegistration } from '@/lib/auth/actions';

type Role = 'alumno' | 'profesor' | 'academia';

const ROLES: { key: Role; icon: React.ElementType; label: string; description: string }[] = [
  { key: 'alumno',   icon: User,      label: 'Alumno',   description: 'Quiero encontrar clases de baile' },
  { key: 'profesor', icon: BookOpen,  label: 'Profesor', description: 'Enseño clases de manera independiente' },
  { key: 'academia', icon: Building2, label: 'Academia', description: 'Gestiono un estudio o academia de danza' },
];

interface Props {
  userName: string;
  userEmail: string;
  userAvatar: string;
}

export default function CompletarRegistroClient({ userName, userEmail, userAvatar }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    if (!selected || loading) return;
    setLoading(true);
    setError('');
    try {
      await completeOAuthRegistration(selected);
      router.refresh();
      router.push(selected === 'alumno' ? '/clases' : '/onboarding?new=1');
    } catch {
      setError('No pudimos guardar tu tipo de cuenta. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="Kynea" width={90} height={30} priority style={{ height: 'auto' }} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">

            {/* Confirmación de identidad */}
            <div className="flex items-center gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 mb-7">
              {userAvatar ? (
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                  <Image src={userAvatar} alt={userName} fill sizes="40px" className="object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-neutral-900 truncate">{userName}</p>
                <p className="text-[12px] text-neutral-500 truncate">{userEmail}</p>
              </div>
            </div>

            <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-1">
              ¿Cómo usarás Kynea?
            </h1>
            <p className="text-[15px] text-neutral-500 mb-6">
              Elige tu tipo de cuenta para personalizar tu experiencia.
            </p>

            <div className="flex flex-col gap-3 mb-6">
              {ROLES.map(r => {
                const Icon = r.icon;
                const isSelected = selected === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => !loading && setSelected(r.key)}
                    disabled={loading}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-[border-color,background-color] active:scale-[0.98] ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-400 disabled:hover:border-neutral-200 disabled:cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 text-[15px]">{r.label}</p>
                      <p className="text-[13px] text-neutral-500">{r.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-[background-color,border-color] ${
                      isSelected ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 mb-4 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!selected || loading}
              className="btn-dark w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Guardando…' : 'Continuar'}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
