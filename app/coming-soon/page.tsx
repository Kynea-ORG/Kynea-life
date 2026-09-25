import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kynea – Próximamente",
};

export default function ComingSoonPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&display=swap"
      />
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-xs font-medium tracking-[0.3em] text-neutral-400">
          PRÓXIMAMENTE
        </p>
        <h1
          className="mt-8 max-w-3xl font-serif text-3xl italic leading-snug sm:text-4xl md:text-5xl"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          &ldquo;La primera plataforma integral para la danza en el Perú&rdquo;
        </h1>
        <div className="mt-12 h-10 w-px bg-neutral-700" />
        <p className="mt-8 text-xs font-semibold tracking-[0.25em] text-neutral-200">
          LANZAMIENTO
        </p>
        <p className="mt-1 text-sm text-neutral-400">Muy pronto</p>
      </main>
    </>
  );
}
