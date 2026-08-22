"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, Binoculars, Bookmark, CalendarDays, Camera, Check,
  ChevronRight, Clock3, Compass, Ellipsis, Eye, Flag, Footprints, Heart,
  Home, Leaf, Map as MapIcon, MapPin, MessageCircle, Mountain, Navigation,
  Pause, Play, Plus, Route, Search, Send, Settings, Share2, ShieldCheck,
  SlidersHorizontal, Sparkles, Star, TentTree, Trees, Trophy, UserRound,
  Users, Waves, WifiOff, X,
} from "lucide-react";
import { BrandMark } from "./brand-mark";
import { ExploreMap } from "./explore-map";
import { persistPoint } from "../lib/offline-route";
import { createClient, isSupabaseConfigured } from "../lib/supabase/client";

type Tab = "home" | "explore" | "community" | "profile";
type Toast = { id: number; text: string };

const nearby = [
  { name: "Serra dos Cocais", place: "Coronel Fabriciano, MG", type: "Trilha", distance: "8,2 km", level: "Moderada", image: "https://viajento.files.wordpress.com/2022/04/vale-bocaina-serra-do-cipo-minas-gerais-brasil-estrada-terra.jpg" },
  { name: "Cachoeira do Gavião", place: "Serra do Cipó, MG", type: "Cachoeira", distance: "6,0 km", level: "Fácil", image: "https://www.anavoando.com.br/wp-content/uploads/2020/05/SAGKE3862-scaled.jpg" },
  { name: "Vale do Bocaina", place: "Santana do Riacho, MG", type: "Trekking", distance: "11,4 km", level: "Difícil", image: "https://viajento.files.wordpress.com/2022/04/cachoeira-tombador-serra-do-cipo-minas-gerais-brasil-trilha.jpg" },
];

const groups = [
  { name: "Trilheiros do Vale do Aço", meta: "2.481 membros · Ipatinga, MG", icon: Mountain, joined: true, tint: "forest" },
  { name: "Cachoeiras de Minas", meta: "8.902 membros · Minas Gerais", icon: Waves, joined: false, tint: "water" },
  { name: "Camping Selvagem Brasil", meta: "5.173 membros · Brasil", icon: TentTree, joined: false, tint: "sand" },
];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function Avatar({ label, image, size = "md" }: { label: string; image?: string; size?: "sm" | "md" | "lg" }) {
  return image ? <img className={`avatar avatar-${size}`} src={image} alt={label} /> : <span className={`avatar avatar-${size} avatar-fallback`}>{label.slice(0, 1)}</span>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button onClick={onAction}>{action}<ChevronRight size={16} /></button>}</div>;
}

function Topbar({ onSearch, onNotifications, onAccount }: { onSearch: () => void; onNotifications: () => void; onAccount: () => void }) {
  return (
    <header className="topbar">
      <BrandMark />
      <div className="top-actions">
        <button className="search-wide" onClick={onSearch}><Search size={18} /><span>Buscar trilhas, pessoas e grupos</span><kbd>⌘ K</kbd></button>
        <button className="icon-button mobile-search" onClick={onSearch} aria-label="Pesquisar"><Search size={20} /></button>
        <button className="icon-button notification-button" onClick={onNotifications} aria-label="Notificações"><Bell size={20} /><span /></button>
        <button className="avatar-button" onClick={onAccount} aria-label="Abrir conta"><Avatar label="Abner" image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" size="sm" /></button>
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
  return <aside className="sidebar">
    <div className="sidebar-brand"><BrandMark size="lg" /></div>
    <nav>{items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><Icon size={20} />{label}</button>)}</nav>
    <button className="sidebar-create" onClick={onCreate}><Plus size={20} /> Nova aventura</button>
    <div className="sidebar-preserve"><span><Leaf size={19} /></span><div><strong>Preserve a trilha</strong><small>Reporte ocorrências e ajude a comunidade.</small></div></div>
    <button className="sidebar-settings"><Settings size={18} /> Configurações</button>
  </aside>;
}

function BottomNav({ active, setActive, onCreate }: { active: Tab; setActive: (tab: Tab) => void; onCreate: () => void }) {
  return <nav className="bottom-nav" aria-label="Navegação principal">
    <button className={active === "home" ? "active" : ""} onClick={() => setActive("home")}><Home size={21} /><span>Início</span></button>
    <button className={active === "explore" ? "active" : ""} onClick={() => setActive("explore")}><Compass size={21} /><span>Explorar</span></button>
    <button className="create-nav" onClick={onCreate} aria-label="Criar"><span><Plus size={26} /></span></button>
    <button className={active === "community" ? "active" : ""} onClick={() => setActive("community")}><Users size={21} /><span>Comunidade</span></button>
    <button className={active === "profile" ? "active" : ""} onClick={() => setActive("profile")}><UserRound size={21} /><span>Perfil</span></button>
  </nav>;
}

function WeeklyCard() {
  return <section className="weekly-card">
    <div className="weekly-heading"><div><small>SUA SEMANA</small><strong>Bom ritmo, Abner!</strong></div><span>+12% <Sparkles size={14} /></span></div>
    <div className="weekly-stats">
      <div><strong>18,6</strong><span>km</span><small>Distância</small></div>
      <div><strong>4h32</strong><small>Tempo</small></div>
      <div><strong>1.240</strong><span>m</span><small>Elevação</small></div>
      <div><strong>3</strong><small>Aventuras</small></div>
    </div>
    <div className="weekly-track"><span style={{ width: "68%" }} /></div>
    <p>Mais <strong>8,4 km</strong> para alcançar sua meta semanal</p>
  </section>;
}

function TrailCard({ trail, onOpen }: { trail: typeof nearby[number]; onOpen: () => void }) {
  return <article className="trail-card" onClick={onOpen} tabIndex={0} role="button">
    <div className="trail-image"><img src={trail.image} alt={trail.name} /><button aria-label="Salvar trilha" onClick={(e) => e.stopPropagation()}><Bookmark size={17} /></button><span>{trail.type}</span></div>
    <div className="trail-copy"><strong>{trail.name}</strong><p><MapPin size={13} />{trail.place}</p><div><span><Route size={14} />{trail.distance}</span><span className="difficulty-dot">{trail.level}</span></div></div>
  </article>;
}

function PostCard({ notify }: { notify: (text: string) => void }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(128);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  return <article className="post-card">
    <header className="post-author">
      <Avatar label="Lucas" image="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80" />
      <div><div><strong>Lucas Andrade</strong><button onClick={() => setFollowing(!following)}>{following ? "Seguindo" : "Seguir"}</button></div><p><MapPin size={12} /> Parque Nacional da Serra do Cipó · 2h</p></div>
      <button className="icon-button"><Ellipsis size={20} /></button>
    </header>
    <div className="activity-label"><Footprints size={15} /> Hiking</div>
    <div className="post-text"><h3>Travessia do Vale da Bocaina</h3><p>Manhã perfeita entre campos rupestres, vento fresco e muita vista bonita. A trilha está seca, mas levem bastante água. 🌿</p></div>
    <div className="post-photo"><img src="https://www.gov.br/icmbio/pt-br/centrais-de-conteudo/serradocipo-jpg" alt="Pessoa caminhando na Serra do Cipó" /><div className="photo-count"><Camera size={14} /> 6</div></div>
    <div className="activity-summary">
      <div><span>Distância</span><strong>12,4 km</strong></div><div><span>Tempo</span><strong>3h 42</strong></div><div><span>Elevação</span><strong>+840 m</strong></div><div><span>Ritmo</span><strong>17:54/km</strong></div>
    </div>
    <div className="condition-note"><Check size={15} /><span><strong>Condição recente:</strong> trilha seca e bem sinalizada</span></div>
    <div className="post-social-count"><span>{likes} curtidas</span><span>18 comentários</span></div>
    <footer className="post-actions">
      <button className={liked ? "liked" : ""} onClick={() => { setLiked(!liked); setLikes(likes + (liked ? -1 : 1)); }}><Heart size={20} fill={liked ? "currentColor" : "none"} /><span>Curtir</span></button>
      <button onClick={() => notify("Comentários abertos") }><MessageCircle size={20} /><span>Comentar</span></button>
      <button onClick={() => notify("Link da aventura copiado") }><Share2 size={20} /><span>Compartilhar</span></button>
      <button className={saved ? "saved" : ""} onClick={() => { setSaved(!saved); notify(saved ? "Removido dos salvos" : "Salvo em Quero conhecer"); }}><Bookmark size={20} fill={saved ? "currentColor" : "none"} /></button>
    </footer>
  </article>;
}

function HomeView({ onStart, onExplore, notify }: { onStart: () => void; onExplore: () => void; notify: (text: string) => void }) {
  const [trailOpen, setTrailOpen] = useState(false);
  return <>
    <div className="welcome-row"><div><p>Olá, Abner <span>👋</span></p><h1>Continue explorando.</h1></div><div className="weather-pill"><span>22°</span><small>Ipatinga · Ensolarado</small></div></div>
    <WeeklyCard />
    <button className="start-adventure" onClick={onStart}><span><Navigation size={22} fill="currentColor" /></span><div><strong>INICIAR AVENTURA</strong><small>GPS pronto · toque para começar</small></div><ChevronRight size={21} /></button>
    <section className="content-section"><SectionTitle title="Explorar perto de você" action="Ver mapa" onAction={onExplore} /><div className="trail-scroller">{nearby.map((trail) => <TrailCard key={trail.name} trail={trail} onOpen={() => setTrailOpen(true)} />)}</div></section>
    <section className="content-section"><SectionTitle title="Aventuras recentes" action="Filtrar" onAction={() => notify("Filtros do feed disponíveis")} /><PostCard notify={notify} /></section>
    {trailOpen && <TrailDetail onClose={() => setTrailOpen(false)} onStart={() => { setTrailOpen(false); onStart(); }} notify={notify} />}
  </>;
}

function ExploreView({ onStart, notify }: { onStart: () => void; notify: (text: string) => void }) {
  const [filter, setFilter] = useState("Todos");
  return <div className="explore-view">
    <div className="page-heading"><div><p>Descubra a natureza</p><h1>Explorar</h1></div><button className="filter-button" onClick={() => notify("Filtros avançados abertos")}><SlidersHorizontal size={18} /> Filtros</button></div>
    <div className="explore-search"><Search size={18} /><input placeholder="Buscar trilha, cachoeira ou parque" aria-label="Buscar local" /><button><Navigation size={18} /></button></div>
    <div className="filter-row">{["Todos", "Trilhas", "Cachoeiras", "Picos", "Camping"].map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <ExploreMap />
    <div className="map-results"><div className="result-count"><strong>18 lugares próximos</strong><span>até 50 km de você</span></div>{nearby.slice(0, 2).map((trail) => <div className="map-result" key={trail.name}><img src={trail.image} alt="" /><div><small>{trail.type} · {trail.level}</small><strong>{trail.name}</strong><span><Star size={13} fill="currentColor" /> 4,8 · {trail.distance}</span></div><button onClick={onStart}><Navigation size={17} /></button></div>)}</div>
  </div>;
}

function CommunityView({ notify }: { notify: (text: string) => void }) {
  const [joined, setJoined] = useState<string[]>([groups[0].name]);
  return <div className="community-view">
    <div className="page-heading"><div><p>Vá mais longe, juntos.</p><h1>Comunidade</h1></div><button className="green-round" onClick={() => notify("Criação de grupo iniciada")}><Plus size={21} /></button></div>
    <div className="community-tabs"><button className="active">Grupos</button><button>Eventos</button><button>Ranking</button></div>
    <section className="featured-event">
      <div className="event-top"><span>PRÓXIMA AVENTURA</span><span><CalendarDays size={15} /> Domingo, 07:00</span></div><h2>Trilha Serra dos Cocais</h2><p><MapPin size={15} /> Praça da Estação · Fabriciano, MG</p>
      <div className="event-details"><span><Mountain size={16} /> Moderado</span><span><Route size={16} /> 11 km</span><span><Users size={16} /> 14/20</span></div>
      <div className="event-footer"><div className="avatar-stack"><Avatar label="L" size="sm" /><Avatar label="R" size="sm" /><Avatar label="M" size="sm" /><span>+11</span></div><button onClick={() => notify("Presença confirmada no evento")}>PARTICIPAR</button></div>
    </section>
    <section className="content-section"><SectionTitle title="Seus grupos" action="Ver todos" />
      <div className="group-list">{groups.map(({ name, meta, icon: Icon, tint }) => { const isJoined = joined.includes(name); return <article className="group-card" key={name}><span className={`group-icon ${tint}`}><Icon size={24} /></span><div><strong>{name}</strong><small>{meta}</small></div><button className={isJoined ? "joined" : ""} onClick={() => { setJoined(isJoined ? joined.filter((g) => g !== name) : [...joined, name]); notify(isJoined ? "Você saiu do grupo" : "Bem-vindo ao grupo!"); }}>{isJoined ? "Membro" : "Participar"}</button></article>; })}</div>
    </section>
    <section className="ranking-preview"><div><Trophy size={22} /><span><small>RANKING SEMANAL · VALE DO AÇO</small><strong>Você está em 8º lugar</strong></span></div><button>Ver ranking <ChevronRight size={16} /></button></section>
  </div>;
}

function ProfileView({ notify }: { notify: (text: string) => void }) {
  const [tab, setTab] = useState("Atividades");
  return <div className="profile-view">
    <div className="profile-cover"><div className="profile-cover-shade" /><button className="icon-button"><Settings size={19} /></button></div>
    <div className="profile-header"><Avatar label="Abner" image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" size="lg" /><button onClick={() => notify("Edição de perfil aberta")}>Editar perfil</button></div>
    <div className="profile-copy"><h1>Abner Lucas</h1><p>@abnerlucas · Ipatinga, MG</p><span>Entre vales, serras e cachoeiras. Sempre deixando a trilha melhor do que encontrei. 🌿</span></div>
    <div className="profile-social"><div><strong>386</strong><span>Seguidores</span></div><div><strong>214</strong><span>Seguindo</span></div><div><strong>5</strong><span>Grupos</span></div></div>
    <div className="profile-stats"><div><Footprints size={19} /><strong>42</strong><span>Aventuras</span></div><div><Route size={19} /><strong>326 km</strong><span>Distância</span></div><div><Mountain size={19} /><strong>8.420 m</strong><span>Elevação</span></div></div>
    <section className="passport-card"><div className="passport-heading"><div><span><BrandMark size="sm" withName={false} dark /></span><div><small>PASSAPORTE SELVA+</small><strong>Minas Gerais</strong></div></div><button onClick={() => notify("Passaporte pronto para compartilhar")}><Share2 size={17} /></button></div><div className="passport-grid"><span><strong>31</strong> locais</span><span><strong>18</strong> trilhas</span><span><strong>6</strong> cachoeiras</span><span><strong>4</strong> picos</span></div><div className="passport-progress"><span style={{ width: "64%" }} /></div><p>64% do nível Aventureiro concluído</p></section>
    <div className="profile-tabs">{["Atividades", "Fotos", "Trilhas", "Conquistas"].map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
    <section className="achievement-row"><div className="achievement"><span><Trophy size={23} /></span><strong>Mateiro</strong><small>50 km explorados</small></div><div className="achievement"><span><Waves size={23} /></span><strong>Caçador de águas</strong><small>5 cachoeiras</small></div><div className="achievement locked"><span><ShieldCheck size={23} /></span><strong>Guardião</strong><small>2/5 contribuições</small></div></section>
  </div>;
}

function TrailDetail({ onClose, onStart, notify }: { onClose: () => void; onStart: () => void; notify: (text: string) => void }) {
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Detalhes da trilha"><div className="detail-sheet">
    <div className="detail-hero"><img src={nearby[0].image} alt="Serra dos Cocais" /><button className="close-float" onClick={onClose}><X size={20} /></button><div><small>TRILHA · CORONEL FABRICIANO, MG</small><h2>Serra dos Cocais</h2><span><Star size={15} fill="currentColor" /> 4,8 · 126 avaliações</span></div></div>
    <div className="detail-metrics"><div><Route size={18} /><strong>8,2 km</strong><span>Distância</span></div><div><Clock3 size={18} /><strong>2h45</strong><span>Duração</span></div><div><Mountain size={18} /><strong>+620 m</strong><span>Elevação</span></div><div><Footprints size={18} /><strong>Moderada</strong><span>Dificuldade</span></div></div>
    <div className="detail-body"><h3>Sobre a trilha</h3><p>Um dos percursos mais bonitos do Vale do Aço, com trechos de mata, campo aberto e vista panorâmica. Leve água e proteção solar.</p><div className="feature-chips"><span><Waves size={15} /> Água no percurso</span><span><WifiOff size={15} /> Sinal limitado</span><span><TentTree size={15} /> Camping próximo</span></div><div className="recent-condition"><Check size={17} /><div><strong>Condição atual: boa</strong><span>Confirmada por 7 pessoas nas últimas 48h</span></div></div></div>
    <div className="detail-actions"><button className="save-detail" onClick={() => notify("Trilha salva") }><Bookmark size={19} /> Salvar</button><button className="primary-detail" onClick={onStart}><Navigation size={19} /> Iniciar trilha</button></div>
  </div></div>;
}

function CreateSheet({ onClose, onStart, notify }: { onClose: () => void; onStart: () => void; notify: (text: string) => void }) {
  const actions = [
    { title: "Iniciar atividade", text: "Registre seu percurso com GPS", icon: Navigation, color: "green", run: onStart },
    { title: "Publicar aventura", text: "Compartilhe fotos e histórias", icon: Camera, color: "blue" },
    { title: "Cadastrar local", text: "Adicione um lugar à comunidade", icon: MapPin, color: "purple" },
    { title: "Criar trilha", text: "Desenhe e documente um percurso", icon: Route, color: "orange" },
    { title: "Ocorrência ambiental", text: "Reporte um problema na natureza", icon: Leaf, color: "red" },
  ];
  return <div className="modal-layer align-end" onMouseDown={onClose}><div className="action-sheet" onMouseDown={(e) => e.stopPropagation()}><div className="sheet-handle" /><div className="sheet-title"><div><h2>O que vamos fazer?</h2><p>Explore. Registre. Compartilhe. Preserve.</p></div><button onClick={onClose}><X size={20} /></button></div><div className="create-actions">{actions.map(({ title, text, icon: Icon, color, run }) => <button key={title} onClick={() => { if (run) run(); else notify(`${title}: fluxo preparado para o próximo passo`); onClose(); }}><span className={color}><Icon size={22} /></span><div><strong>{title}</strong><small>{text}</small></div><ChevronRight size={18} /></button>)}</div></div></div>;
}

function ActivityTracker({ onClose, notify }: { onClose: () => void; notify: (text: string) => void }) {
  const [status, setStatus] = useState<"running" | "paused" | "finish">("running");
  const [seconds, setSeconds] = useState(0);
  const [gpsMessage, setGpsMessage] = useState("Buscando sinal GPS…");
  const distance = useMemo(() => Math.min(seconds * 0.0017, 0.99), [seconds]);

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!("geolocation" in navigator)) { setGpsMessage("GPS não disponível neste dispositivo"); return; }
    const watcher = navigator.geolocation.watchPosition(async ({ coords, timestamp }) => {
      setGpsMessage(coords.accuracy < 30 ? "Sinal GPS excelente" : "Sinal GPS conectado");
      try { await persistPoint({ latitude: coords.latitude, longitude: coords.longitude, altitude: coords.altitude, accuracy: coords.accuracy, speed: coords.speed, recordedAt: new Date(timestamp).toISOString() }); } catch { /* recording continues in memory */ }
    }, () => setGpsMessage("Autorize o GPS para registrar o percurso"), { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  if (status === "finish") return <div className="activity-screen finish-screen"><div className="activity-top"><button onClick={() => setStatus("paused")}><ChevronRight className="rotate-180" size={22} /></button><strong>Finalizar aventura</strong><span /></div><div className="finish-scroll"><ExploreMap compact tracking /><div className="finish-summary"><span><Check size={18} /></span><div><strong>Aventura registrada!</strong><small>Seu percurso está salvo neste dispositivo.</small></div></div><div className="finish-fields"><label>Título<input defaultValue="Trilha da manhã" /></label><label>Descrição<textarea placeholder="Conte como foi sua aventura…" /></label><div className="field-row"><label>Tipo<select defaultValue="trilha"><option value="trilha">Trilha</option><option value="hiking">Hiking</option><option value="trekking">Trekking</option><option value="corrida">Trail running</option></select></label><label>Dificuldade<select defaultValue="moderada"><option>Fácil</option><option value="moderada">Moderada</option><option>Difícil</option></select></label></div><label>Privacidade<select defaultValue="publica"><option value="publica">Pública</option><option>Seguidores</option><option>Somente eu</option></select></label><button className="photo-upload"><Camera size={20} /> Adicionar fotos</button></div></div><div className="finish-action"><button onClick={() => { notify("Aventura publicada com sucesso!"); onClose(); }}><Send size={19} /> PUBLICAR AVENTURA</button></div></div>;

  return <div className="activity-screen"><div className="activity-top"><button onClick={onClose}><X size={22} /></button><strong>Trilha</strong><button><Ellipsis size={21} /></button></div><div className="tracker-map"><ExploreMap tracking /></div><div className="tracker-panel"><div className="gps-quality"><span /><strong>{gpsMessage}</strong><small>Modo offline ativo</small></div><div className="timer-main">{formatTime(seconds)}</div><span className="timer-label">TEMPO</span><div className="tracker-stats"><div><strong>{distance.toFixed(2)}</strong><span>km</span><small>Distância</small></div><div><strong>{Math.round(distance * 38)}</strong><span>m</span><small>Elevação</small></div><div><strong>{seconds > 6 ? "18:32" : "--:--"}</strong><small>Ritmo /km</small></div></div><div className="tracker-controls"><button className="finish-button" onClick={() => setStatus("finish")}><span><Flag size={20} /></span>Finalizar</button><button className="pause-button" onClick={() => setStatus(status === "paused" ? "running" : "paused")}><span>{status === "paused" ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}</span>{status === "paused" ? "Continuar" : "Pausar"}</button><button className="safety-button" onClick={() => notify("Atalhos de segurança abertos")}><span><ShieldCheck size={20} /></span>Segurança</button></div><p className="safety-copy"><ShieldCheck size={14} /> O SELVA+ não substitui serviços oficiais de emergência.</p></div></div>;
}

function SearchPanel({ onClose, notify }: { onClose: () => void; notify: (text: string) => void }) {
  return <div className="modal-layer search-layer"><div className="search-panel"><div className="search-input-modal"><Search size={20} /><input autoFocus placeholder="Buscar no SELVA+" /><button onClick={onClose}><X size={19} /></button></div><p className="search-label">BUSCAS RECENTES</p><button className="search-result" onClick={() => notify("Abrindo Serra dos Cocais")}><span><Mountain size={20} /></span><div><strong>Serra dos Cocais</strong><small>Trilha · Coronel Fabriciano</small></div><ChevronRight size={18} /></button><button className="search-result"><span><Users size={20} /></span><div><strong>Trilheiros do Vale do Aço</strong><small>Grupo · 2.481 membros</small></div><ChevronRight size={18} /></button><div className="search-categories"><button><Footprints size={17} /> Trilhas</button><button><Users size={17} /> Pessoas</button><button><CalendarDays size={17} /> Eventos</button><button><Waves size={17} /> Cachoeiras</button></div></div></div>;
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notices = [
    { icon: Heart, text: <><strong>Lucas</strong> curtiu sua aventura.</>, time: "há 12 min" },
    { icon: Users, text: <><strong>Rayssa</strong> começou a seguir você.</>, time: "há 1h" },
    { icon: AlertTriangle, text: <>Uma condição foi reportada em <strong>Serra dos Cocais</strong>.</>, time: "há 3h" },
    { icon: Trophy, text: <>Você desbloqueou a conquista <strong>Mateiro</strong>.</>, time: "ontem" },
  ];
  return <div className="modal-layer notification-layer" onMouseDown={onClose}><div className="notification-panel" onMouseDown={(e) => e.stopPropagation()}><div className="notification-title"><h2>Notificações</h2><button onClick={onClose}><X size={19} /></button></div>{notices.map(({ icon: Icon, text, time }, i) => <div className="notice" key={i}><span><Icon size={19} /></span><div><p>{text}</p><small>{time}</small></div>{i < 2 && <i />}</div>)}</div></div>;
}

function AuthPanel({ onClose, notify }: { onClose: () => void; notify: (text: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isSupabaseConfigured) {
      notify("Acesso de demonstração ativo");
      onClose();
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
    if (result.error) { setError(result.error.message); return; }
    notify(mode === "login" ? "Login realizado com sucesso" : "Conta criada. Verifique seu e-mail.");
    onClose();
  }

  async function social(provider: "google" | "apple") {
    if (!isSupabaseConfigured) { notify("Login social será ativado ao conectar o Supabase"); return; }
    await createClient()?.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
  }

  return <div className="modal-layer auth-layer" role="dialog" aria-modal="true" aria-label="Acessar SELVA+"><div className="auth-panel">
    <button className="auth-close" onClick={onClose}><X size={20} /></button>
    <BrandMark size="lg" />
    <div className="auth-heading"><h2>{mode === "login" ? "Boas-vindas de volta" : "Comece sua jornada"}</h2><p>{mode === "login" ? "Entre para continuar explorando." : "Crie sua conta de aventureiro."}</p></div>
    <div className="auth-social"><button onClick={() => social("google")}><span>G</span> Continuar com Google</button><button onClick={() => social("apple")}><span>●</span> Continuar com Apple</button></div>
    <div className="auth-divider"><span>ou use seu e-mail</span></div>
    <form onSubmit={submit}>
      {mode === "register" && <div className="auth-row"><label>Nome<input name="full_name" required placeholder="Seu nome" /></label><label>Username<input name="username" required placeholder="@usuario" /></label></div>}
      <label>E-mail<input name="email" type="email" required placeholder="voce@email.com" /></label>
      <label>Senha<input name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" /></label>
      {error && <p className="auth-error">{error}</p>}
      <button className="auth-submit" disabled={loading}>{loading ? "Aguarde…" : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}</button>
    </form>
    <button className="auth-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Ainda não tem conta? Criar agora" : "Já tem conta? Entrar"}</button>
    {!isSupabaseConfigured && <div className="demo-note"><Eye size={15} /><span><strong>Modo demonstração</strong> — a interface funciona sem cadastro. A autenticação real ativa automaticamente com as variáveis do Supabase.</span></div>}
  </div></div>;
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
  function start() { setCreateOpen(false); setActivityOpen(true); }

  return <div className="selva-app">
    <Sidebar active={active} setActive={setActive} onCreate={() => setCreateOpen(true)} />
    <div className="app-frame"><Topbar onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen(true)} onAccount={() => setAuthOpen(true)} /><main className={`main-content view-${active}`}>
      {active === "home" && <HomeView onStart={start} onExplore={() => setActive("explore")} notify={notify} />}
      {active === "explore" && <ExploreView onStart={start} notify={notify} />}
      {active === "community" && <CommunityView notify={notify} />}
      {active === "profile" && <ProfileView notify={notify} />}
    </main><BottomNav active={active} setActive={setActive} onCreate={() => setCreateOpen(true)} /></div>
    {createOpen && <CreateSheet onClose={() => setCreateOpen(false)} onStart={start} notify={notify} />}
    {activityOpen && <ActivityTracker onClose={() => setActivityOpen(false)} notify={notify} />}
    {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} notify={notify} />}
    {notificationsOpen && <NotificationPanel onClose={() => setNotificationsOpen(false)} />}
    {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} notify={notify} />}
    <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className="toast" key={toast.id}><Check size={17} />{toast.text}</div>)}</div>
  </div>;
}
