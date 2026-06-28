// Unauthenticated gate. One action: hand off to Google OAuth.
export default function Login() {
  return (
    <main className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ember">JobDekho</p>
        <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-tight">
          Every internship,
          <br />
          before everyone else.
        </h1>
        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
          A quiet board that watches the sources you care about and surfaces what is new today.
        </p>
        <a
          href="/auth/google"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-ember px-6 py-3 font-medium text-paper transition hover:opacity-90"
        >
          Continue with Google
          <span aria-hidden="true">-&gt;</span>
        </a>
      </div>
    </main>
  );
}
