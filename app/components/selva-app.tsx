"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Eye,
  Flag,
  Footprints,
  Home,
  Leaf,
  MapPin,
  Mountain,
  Navigation,
  Pause,
  Play,
  Plus,
  Route,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TentTree,
  Trees,
  Trophy,
  UserRound,
  Users,
  Waves,
  X,
} from "lucide-react";
import { BrandMark } from "./brand-mark";
import { ExploreMap, type RouteCoordinate } from "./explore-map";
import { persistPoint } from "../lib/offline-route";
import { createClient, isSupabaseConfigured } from "../lib/supabase/client";

type Tab = "home" | "explore" | "community" | "profile";
type Toast = { id: number; text: string };
type ActivityPoint = {
  coordinate: RouteCoordinate;
  altitude: number | null;
  accuracy: number;
  recordedAt: string;
};

const pillars = [
  { title: "Explorar", text: "Descubra trilhas, cachoeiras, picos e parques.", icon: Compass },
  { title: "Registrar", text: "Grave distância, tempo, rota e elevação com GPS.", icon: Navigation },
  { title: "Compartilhar", text: "Transforme cada atividade em uma aventura.", icon: Camera },
  { title: "Conectar", text: "Encontre grupos, eventos e pessoas com os mesmos interesses.", icon: Users },
  { title: "Preservar", text: "Reporte ocorrências e colabore com a conservação.", icon: Leaf },
] as const;

const discoveryTypes = [
  { label: "Trilhas", icon: Footprints },
  { label: "Cachoeiras", icon: Waves },
  { label: "Picos", icon: Mountain },
  { label: "Camping", icon: TentTree },
  { label: "Parques", icon: Trees },
] as const;

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${remaining}`;
}

function distanceBetween(a: RouteCoordinate, b: RouteCoordinate) {
  const radiusKm = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(b[1] - a[1]);
  const longitudeDelta = toRadians(b[0] - a[0]);
  const latitudeA = toRadians(a[1]);
  const latitudeB = toRadians(b[1]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function activityDistance(points: ActivityPoint[]) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceBetween(points[index - 1].coordinate, points[index].coordinate);
  }
  return total;
}

function elevationGain(points: ActivityPoint[]) {
  let gain = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].altitude;
    const current = points[index].altitude;
    if (previous !== null && current !== null && current > previous) gain += current - previous;
  }
  return gain;
}

function Topbar({ onSearch, onNotifications, onAccount }: { onSearch: () => void; onNotifications: () => void; onAccount: () => void }) {
  return (
    <header className="topbar">
      <BrandMark />
      <div className="top-actions">
        <button className="search-wide" onClick={onSearch}><Search size={18} /><span>Buscar trilhas, lugares, grupos e eventos</span><kbd>⌘ K</kbd></button>
        <button className="icon-button mobile-search" onClick={onSearch} aria-label="Pesquisar"><Search size={20} /></button>
        <button className="icon-button" onClick={onNotifications} aria-label="Notificações"><Bell size={20} /></button>
        <button className="account-button" onClick={onAccount}><UserRound size={18} /><span>Entrar</span></button>
      </div>
    </header>
  );
}

function Sidebar({ active, setActive, onCreate }: { active: Tab; setActive: (tab: Tab) => void; onCreate: () => void }) {
  const items = [
    { id: "home" as Tab, label: "Início", icon: Home },
    { id: "explore" as Tab, label: "Explorar", icon: Compass },
    { id: "community" as Tab, label: "Comunidade", icon: Users },
    { id: "profile" as Tab, label: "Perfil", icon: UserRound },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><BrandMark size="lg" inverted /></div>
      <nav>{items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={20} />{label}</button>)}</nav>
      <button className="sidebar-create" onClick={onCreate}><Plus size={20} /> Nova aventura</button>
      <div className="sidebar-preserve"><span><Leaf size={19} /></span><div><strong>Natureza em primeiro lugar</strong><small>Explore com responsabilidade e respeite áreas protegidas.</small></div></div>
      <button className="sidebar-settings"><Settings size={18} /> Configurações</button>
    </aside>
  );
}

function BottomNav({ active, setActive, onCreate }: { active: Tab; setActive: (tab: Tab) => void; onCreate: () => void }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <button className={active === "home" ? "active" : ""} onClick={() => setActive("home")}><Home size={21} /><span>Início</span></button>
      <button className={active === "explore" ? "active" : ""} onClick={() => setActive("explore")}><Compass size={21} /><span>Explorar</span></button>
      <button className="create-nav" onClick={onCreate} aria-label="Criar"><span><Plus size={26} /></span></button>
      <button className={active === "community" ? "active" : ""} onClick={() => setActive("community")}><Users size={21} /><span>Comunidade</span></button>
      <button className={active === "profile" ? "active" : ""} onClick={() => setActive("profile")}><UserRound size={21} /><span>Perfil</span></button>
    </nav>
  );
}

function EmptyState({ icon: Icon, title, text, action, onAction }: { icon: typeof Compass; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <section className="empty-state">
      <span><Icon size={27} /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && onAction ? <button onClick={onAction}>{action}</button> : null}
    </section>
  );
}

function HomeView({ onStart, onExplore, onAccount }: { onStart: () => void; onExplore: () => void; onAccount: () => void }) {
  return (
    <>
      <section className="intro-card">
        <div className="intro-copy">
          <span className="eyebrow"><Sparkles size={14} /> SELVA+ BETA</span>
          <h1>Uma comunidade para quem vive a natureza.</h1>
          <p>Explore lugares, registre atividades com GPS, compartilhe aventuras e ajude a preservar cada caminho.</p>
          <div className="intro-actions"><button className="primary-button" onClick={onAccount}>CRIAR CONTA</button><button className="secondary-button" onClick={onExplore}><Compass size={18} /> Explorar mapa</button></div>
          <small>Não compartilhamos sua localização precisa automaticamente.</small>
        </div>
        <div className="intro-map"><ExploreMap compact /><div className="map-intro-label"><Navigation size={18} /><span><strong>Mapa de exploração</strong><small>GPS, trilhas e colaboração ambiental</small></span></div></div>
      </section>

      <section className="pillars-grid" aria-label="Como o SELVA+ funciona">
        {pillars.map(({ title, text, icon: Icon }) => <article key={title}><span><Icon size={20} /></span><div><strong>{title}</strong><p>{text}</p></div></article>)}
      </section>

      <section className="weekly-empty">
        <div className="section-heading"><div><small>SUA SEMANA</small><h2>Comece sua primeira aventura</h2></div><span>0 atividades</span></div>
        <div className="zero-stats"><div><strong>0,0</strong><span>km</span><small>Distância</small></div><div><strong>0h00</strong><small>Tempo</small></div><div><strong>0</strong><span>m</span><small>Elevação</small></div><div><strong>0</strong><small>Aventuras</small></div></div>
        <button className="start-adventure" onClick={onStart}><span><Navigation size={22} /></span><div><strong>INICIAR AVENTURA</strong><small>O GPS será solicitado somente ao iniciar</small></div><ChevronRight size={21} /></button>
      </section>

      <div className="home-columns">
        <EmptyState icon={Footprints} title="Seu feed começa aqui" text="Siga aventureiros e participe de grupos para acompanhar atividades, fotos e condições recentes." action="CRIAR MINHA CONTA" onAction={onAccount} />
        <EmptyState icon={Bookmark} title="Monte sua lista de exploração" text="Salve trilhas, lugares e eventos em coleções como Quero conhecer e Fim de semana." action="EXPLORAR LUGARES" onAction={onExplore} />
      </div>
    </>
  );
}

function ExploreView({ onStart }: { onStart: () => void }) {
  const [filter, setFilter] = useState("Trilhas");

  return (
    <div className="explore-view">
      <div className="page-heading"><div><p>Encontre seu próximo caminho</p><h1>Explorar</h1></div><button className="filter-button"><SlidersHorizontal size={18} /> Filtros</button></div>
      <div className="explore-search"><Search size={18} /><input placeholder="Buscar trilha, cachoeira, pico ou parque" aria-label="Buscar local" /><button aria-label="Usar minha localização"><Navigation size={18} /></button></div>
      <div className="filter-row">{discoveryTypes.map(({ label, icon: Icon }) => <button className={filter === label ? "active" : ""} key={label} onClick={() => setFilter(label)}><Icon size={15} />{label}</button>)}</div>
      <ExploreMap />
      <div className="explore-onboarding"><div><MapPin size={22} /><span><strong>Explore perto de você</strong><small>Autorize o GPS ou pesquise uma região. Os resultados reais serão consultados no Supabase/PostGIS.</small></span></div><button onClick={onStart}><Navigation size={17} /> Registrar atividade</button></div>
      <EmptyState icon={Compass} title="Nenhum local carregado" text="O mapa está pronto para exibir trilhas verificadas, condições recentes e ocorrências ambientais cadastradas pela comunidade." />
    </div>
  );
}

function CommunityView({ onAccount }: { onAccount: () => void }) {
  return (
    <div className="community-view">
      <div className="page-heading"><div><p>Vá mais longe, juntos.</p><h1>Comunidade</h1></div><button className="green-round" onClick={onAccount} aria-label="Criar grupo"><Plus size={21} /></button></div>
      <div className="community-tabs"><button className="active">Grupos</button><button>Eventos</button><button>Ranking</button></div>
      <section className="community-intro"><div><Users size={30} /></div><h2>Encontre sua turma de aventura</h2><p>Crie grupos por região, organize eventos de trilha e compartilhe atividades com pessoas que cuidam da natureza.</p><button onClick={onAccount}>COMEÇAR AGORA</button></section>
      <div className="community-features"><article><span><Users size={21} /></span><strong>Grupos</strong><p>Feeds, membros, fotos, trilhas e moderação.</p></article><article><span><Clock3 size={21} /></span><strong>Eventos</strong><p>Encontros, vagas, dificuldade e equipamentos.</p></article><article><span><Trophy size={21} /></span><strong>Conquistas</strong><p>Reconhecimento por explorar e preservar.</p></article></div>
      <EmptyState icon={TentTree} title="Nenhum grupo por enquanto" text="Depois do cadastro, grupos da sua região e dos seus interesses aparecerão aqui." />
    </div>
  );
}

function ProfileView({ onAccount }: { onAccount: () => void }) {
  return (
    <div className="profile-view">
      <section className="profile-blank">
        <div className="profile-symbol"><UserRound size={40} /></div>
        <span className="eyebrow">PERFIL DO AVENTUREIRO</span>
        <h1>Sua história na natureza começa aqui.</h1>
        <p>Crie seu perfil para registrar aventuras, acompanhar estatísticas e construir o Passaporte SELVA+.</p>
        <button className="primary-button" onClick={onAccount}>CRIAR PERFIL</button>
      </section>
      <div className="profile-social"><div><strong>0</strong><span>Seguidores</span></div><div><strong>0</strong><span>Seguindo</span></div><div><strong>0</strong><span>Grupos</span></div></div>
      <div className="profile-stats"><div><Footprints size={19} /><strong>0</strong><span>Aventuras</span></div><div><Route size={19} /><strong>0 km</strong><span>Distância</span></div><div><Mountain size={19} /><strong>0 m</strong><span>Elevação</span></div></div>
      <section className="passport-card empty-passport"><div className="passport-heading"><div><span><BrandMark size="sm" withName={false} /></span><div><small>PASSAPORTE SELVA+</small><strong>Nenhum local visitado</strong></div></div><ShieldCheck size={19} /></div><p>Trilhas, cachoeiras, picos, parques e regiões visitadas formarão seu mapa de exploração.</p><div className="passport-progress"><span style={{ width: "0%" }} /></div></section>
      <div className="profile-tabs"><button className="active">Atividades</button><button>Fotos</button><button>Trilhas</button><button>Conquistas</button></div>
      <EmptyState icon={Trophy} title="Conquistas bloqueadas" text="Complete sua primeira atividade para desbloquear Primeiros Passos." />
    </div>
  );
}

function CreateSheet({ onClose, onStart, onAccount, notify }: { onClose: () => void; onStart: () => void; onAccount: () => void; notify: (text: string) => void }) {
  const actions = [
    { title: "Iniciar atividade", text: "Registre seu percurso com GPS", icon: Navigation, className: "green", run: onStart },
    { title: "Publicar aventura", text: "Compartilhe fotos e histórias", icon: Camera, className: "blue", run: onAccount },
    { title: "Cadastrar local", text: "Adicione um lugar à comunidade", icon: MapPin, className: "purple", run: onAccount },
    { title: "Criar trilha", text: "Documente um novo percurso", icon: Route, className: "orange", run: onAccount },
    { title: "Ocorrência ambiental", text: "Reporte um problema na natureza", icon: Leaf, className: "red", run: onAccount },
  ];

  return <div className="modal-layer align-end" onMouseDown={onClose}><div className="action-sheet" onMouseDown={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-title"><div><h2>O que vamos fazer?</h2><p>Explore. Registre. Compartilhe. Preserve.</p></div><button onClick={onClose}><X size={20} /></button></div><div className="create-actions">{actions.map(({ title, text, icon: Icon, className, run }) => <button key={title} onClick={() => { run(); if (title !== "Iniciar atividade") notify("Crie sua conta para continuar"); onClose(); }}><span className={className}><Icon size={22} /></span><div><strong>{title}</strong><small>{text}</small></div><ChevronRight size={18} /></button>)}</div></div></div>;
}

function ActivityTracker({ onClose, notify }: { onClose: () => void; notify: (text: string) => void }) {
  const [status, setStatus] = useState<"running" | "paused" | "finish">("running");
  const [seconds, setSeconds] = useState(0);
  const [points, setPoints] = useState<ActivityPoint[]>([]);
  const [gpsMessage, setGpsMessage] = useState("Aguardando autorização do GPS…");

  const route = useMemo(() => points.map((point) => point.coordinate), [points]);
  const distanceKm = useMemo(() => activityDistance(points), [points]);
  const gainMeters = useMemo(() => elevationGain(points), [points]);
  const latestAccuracy = points.at(-1)?.accuracy;

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "running") return;
    if (!("geolocation" in navigator)) {
      const fallback = window.setTimeout(() => setGpsMessage("GPS não disponível neste dispositivo"), 0);
      return () => window.clearTimeout(fallback);
    }

    const watcher = navigator.geolocation.watchPosition(({ coords, timestamp }) => {
      if (coords.accuracy > 120) {
        setGpsMessage("Sinal fraco — procurando melhor precisão");
        return;
      }

      const point: ActivityPoint = {
        coordinate: [coords.longitude, coords.latitude],
        altitude: coords.altitude,
        accuracy: coords.accuracy,
        recordedAt: new Date(timestamp).toISOString(),
      };
      setGpsMessage(coords.accuracy <= 20 ? "Sinal GPS excelente" : "GPS conectado");
      setPoints((current) => {
        const previous = current.at(-1);
        if (previous && distanceBetween(previous.coordinate, point.coordinate) < 0.002) return current;
        void persistPoint({
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude,
          accuracy: coords.accuracy,
          speed: coords.speed,
          recordedAt: point.recordedAt,
        }).catch(() => undefined);
        return [...current, point];
      });
    }, () => setGpsMessage("Autorize o GPS para registrar o percurso"), {
      enableHighAccuracy: true,
      maximumAge: 3_000,
      timeout: 15_000,
    });

    return () => navigator.geolocation.clearWatch(watcher);
  }, [status]);

  if (status === "finish") {
    return <div className="activity-screen finish-screen"><div className="activity-top"><button onClick={() => setStatus("paused")}><ChevronRight className="rotate-180" size={22} /></button><strong>Finalizar atividade</strong><span /></div><div className="finish-scroll"><ExploreMap compact tracking route={route} /><div className="finish-summary"><span><Check size={18} /></span><div><strong>Percurso salvo no dispositivo</strong><small>{distanceKm.toFixed(2)} km · {formatTime(seconds)} · {points.length} pontos GPS</small></div></div><div className="finish-fields"><label>Título<input placeholder="Dê um nome para sua aventura" /></label><label>Descrição<textarea placeholder="Conte como foi sua aventura…" /></label><div className="field-row"><label>Tipo<select defaultValue="trilha"><option value="trilha">Trilha</option><option value="hiking">Hiking</option><option value="trekking">Trekking</option><option value="corrida">Trail running</option></select></label><label>Dificuldade<select defaultValue="moderada"><option value="facil">Fácil</option><option value="moderada">Moderada</option><option value="dificil">Difícil</option></select></label></div><label>Privacidade<select defaultValue="publica"><option value="publica">Pública</option><option value="seguidores">Seguidores</option><option value="privada">Somente eu</option></select></label><button className="photo-upload"><Camera size={20} /> Adicionar fotos</button></div></div><div className="finish-action"><button onClick={() => { notify(isSupabaseConfigured ? "Aventura pronta para publicar" : "Rascunho mantido neste dispositivo"); onClose(); }}><Send size={19} /> PUBLICAR AVENTURA</button></div></div>;
  }

  return <div className="activity-screen"><div className="activity-top"><button onClick={onClose}><X size={22} /></button><strong>Atividade outdoor</strong><button aria-label="Opções"><Settings size={20} /></button></div><div className="tracker-map"><ExploreMap tracking route={route} /></div><div className="tracker-panel"><div className="gps-quality"><span /><strong>{gpsMessage}</strong><small>{latestAccuracy ? `Precisão aproximada: ${Math.round(latestAccuracy)} m` : "Rota protegida em modo offline"}</small></div><div className="timer-main">{formatTime(seconds)}</div><span className="timer-label">TEMPO</span><div className="tracker-stats"><div><strong>{distanceKm.toFixed(2)}</strong><span>km</span><small>Distância</small></div><div><strong>{Math.round(gainMeters)}</strong><span>m</span><small>Elevação</small></div><div><strong>{distanceKm > 0 ? formatTime(Math.round(seconds / distanceKm)).slice(3) : "--:--"}</strong><small>Ritmo /km</small></div></div><div className="tracker-controls"><button className="finish-button" onClick={() => setStatus("finish")}><span><Flag size={20} /></span>Finalizar</button><button className="pause-button" onClick={() => setStatus(status === "paused" ? "running" : "paused")}><span>{status === "paused" ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}</span>{status === "paused" ? "Continuar" : "Pausar"}</button><button className="safety-button" onClick={() => notify("Recursos de segurança em preparação")}><span><ShieldCheck size={20} /></span>Segurança</button></div><p className="safety-copy"><ShieldCheck size={14} /> O SELVA+ não substitui serviços oficiais de emergência.</p></div></div>;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  return <div className="modal-layer search-layer"><div className="search-panel"><div className="search-input-modal"><Search size={20} /><input autoFocus placeholder="Buscar no SELVA+" /><button onClick={onClose}><X size={19} /></button></div><p className="search-label">PESQUISE POR CATEGORIA</p><div className="search-categories">{discoveryTypes.map(({ label, icon: Icon }) => <button key={label}><Icon size={17} />{label}</button>)}<button><Users size={17} />Grupos</button><button><Clock3 size={17} />Eventos</button></div><div className="search-empty"><Search size={24} /><strong>Nenhuma busca recente</strong><span>Usuários, trilhas, grupos, lugares e eventos aparecerão aqui.</span></div></div></div>;
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  return <div className="modal-layer notification-layer" onMouseDown={onClose}><div className="notification-panel" onMouseDown={(event) => event.stopPropagation()}><div className="notification-title"><h2>Notificações</h2><button onClick={onClose}><X size={19} /></button></div><div className="notification-empty"><Bell size={26} /><strong>Tudo tranquilo por aqui</strong><span>Curtidas, novos seguidores, eventos e condições de trilhas aparecerão neste espaço.</span></div></div></div>;
}

function AuthPanel({ onClose, notify }: { onClose: () => void; notify: (text: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isSupabaseConfigured) {
      setError("Configure as variáveis públicas do Supabase para ativar contas reais.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const supabase = createClient();
    if (!supabase) return;

    setLoading(true);
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: String(form.get("full_name")), username: String(form.get("username")) } } });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    notify(mode === "login" ? "Login realizado com sucesso" : "Conta criada. Verifique seu e-mail.");
    onClose();
  }

  async function social(provider: "google" | "apple") {
    if (!isSupabaseConfigured) {
      setError("Conecte o Supabase antes de ativar o login social.");
      return;
    }
    await createClient()?.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
  }

  return <div className="modal-layer auth-layer" role="dialog" aria-modal="true" aria-label="Acessar SELVA+"><div className="auth-panel"><button className="auth-close" onClick={onClose}><X size={20} /></button><BrandMark size="lg" /><div className="auth-heading"><h2>{mode === "login" ? "Boas-vindas de volta" : "Comece sua jornada"}</h2><p>{mode === "login" ? "Entre para continuar explorando." : "Crie seu perfil de aventureiro."}</p></div><div className="auth-social"><button onClick={() => social("google")}><span>G</span> Continuar com Google</button><button onClick={() => social("apple")}><span>●</span> Continuar com Apple</button></div><div className="auth-divider"><span>ou use seu e-mail</span></div><form onSubmit={submit}>{mode === "register" ? <div className="auth-row"><label>Nome<input name="full_name" required placeholder="Seu nome" /></label><label>Username<input name="username" required placeholder="@usuario" /></label></div> : null}<label>E-mail<input name="email" type="email" required placeholder="voce@email.com" /></label><label>Senha<input name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" /></label>{error ? <p className="auth-error">{error}</p> : null}<button className="auth-submit" disabled={loading}>{loading ? "Aguarde…" : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}</button></form><button className="auth-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Ainda não tem conta? Criar agora" : "Já tem conta? Entrar"}</button><div className="privacy-note"><Eye size={15} /><span>Sua localização precisa nunca será publicada automaticamente.</span></div></div></div>;
}

export function SelvaApp() {
  const [active, setActive] = useState<Tab>("home");
  const [createOpen, setCreateOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function notify(text: string) {
    const id = Date.now();
    setToasts((items) => [...items, { id, text }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 2800);
  }

  function startActivity() {
    setCreateOpen(false);
    setActivityOpen(true);
  }

  return <div className="selva-app"><Sidebar active={active} setActive={setActive} onCreate={() => setCreateOpen(true)} /><div className="app-frame"><Topbar onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen(true)} onAccount={() => setAuthOpen(true)} /><main className={`main-content view-${active}`}>{active === "home" ? <HomeView onStart={startActivity} onExplore={() => setActive("explore")} onAccount={() => setAuthOpen(true)} /> : null}{active === "explore" ? <ExploreView onStart={startActivity} /> : null}{active === "community" ? <CommunityView onAccount={() => setAuthOpen(true)} /> : null}{active === "profile" ? <ProfileView onAccount={() => setAuthOpen(true)} /> : null}</main><BottomNav active={active} setActive={setActive} onCreate={() => setCreateOpen(true)} /></div>{createOpen ? <CreateSheet onClose={() => setCreateOpen(false)} onStart={startActivity} onAccount={() => setAuthOpen(true)} notify={notify} /> : null}{activityOpen ? <ActivityTracker onClose={() => setActivityOpen(false)} notify={notify} /> : null}{searchOpen ? <SearchPanel onClose={() => setSearchOpen(false)} /> : null}{notificationsOpen ? <NotificationPanel onClose={() => setNotificationsOpen(false)} /> : null}{authOpen ? <AuthPanel onClose={() => setAuthOpen(false)} notify={notify} /> : null}<div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className="toast" key={toast.id}><Check size={17} />{toast.text}</div>)}</div></div>;
}
