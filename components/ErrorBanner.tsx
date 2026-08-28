export default function ErrorBanner({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-text animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
