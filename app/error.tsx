"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { BrandMark } from "./components/brand-mark";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="error-page"><BrandMark size="lg" /><span><AlertTriangle size={30} /></span><h1>Algo saiu da trilha.</h1><p>Seus dados locais de GPS continuam protegidos. Tente carregar a interface novamente.</p><button onClick={reset}><RotateCcw size={18} /> TENTAR NOVAMENTE</button></main>;
}
