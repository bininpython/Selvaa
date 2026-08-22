import Link from "next/link";
import { Compass } from "lucide-react";
import { BrandMark } from "./components/brand-mark";

export default function NotFound() {
  return <main className="error-page"><BrandMark size="lg" /><span><Compass size={30} /></span><h1>Caminho não encontrado.</h1><p>Esta rota não existe ou foi removida da comunidade.</p><Link href="/">VOLTAR AO MAPA</Link></main>;
}
