/** Remonta a cada navegação: dá a transição suave entre telas. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in">{children}</div>;
}
