import { lazy, Suspense, type FormEvent, useEffect, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bone,
  Camera,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  FolderOpen,
  Fingerprint,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Plus,
  Ruler,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

const BodyViewer = lazy(() =>
  import("./BodyViewer").then((module) => ({ default: module.BodyViewer })),
);

type Role = "admin" | "specialist" | "user";
type User = {
  id: number;
  dni: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};
type Screen = "landing" | "login" | "workspace" | "atlas";
type WorkspaceTab =
  | "dashboard"
  | "profiles"
  | "measurements"
  | "capture"
  | "analysis"
  | "viewer"
  | "analytics"
  | "simulations"
  | "reports"
  | "users";
type UserDraft = {
  dni: string;
  full_name: string;
  password: string;
  role: Role;
  is_active: boolean;
};

const emptyDraft: UserDraft = {
  dni: "",
  full_name: "",
  password: "",
  role: "user",
  is_active: true,
};

const workspaceNavGroups: {
  title: string;
  items: { id: WorkspaceTab; label: string; icon: LucideIcon; ready?: boolean }[];
}[] = [
  {
    title: "GENERAL",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true }],
  },
  {
    title: "GESTIÓN",
    items: [
      { id: "profiles", label: "Expedientes", icon: FolderOpen },
      { id: "measurements", label: "Mediciones", icon: Ruler },
      { id: "capture", label: "Captura", icon: Camera },
      { id: "analysis", label: "Análisis de pose", icon: ScanLine },
    ],
  },
  {
    title: "ANÁLISIS Y VISUALIZACIÓN",
    items: [
      { id: "viewer", label: "Atlas 3D", icon: Bone, ready: true },
      { id: "analytics", label: "Analítica", icon: BarChart3 },
      { id: "simulations", label: "Simulaciones", icon: FlaskConical },
      { id: "reports", label: "Reportes", icon: FileText },
    ],
  },
];

const workspaceTabTitles: Record<WorkspaceTab, string> = {
  dashboard: "Dashboard",
  profiles: "Expedientes",
  measurements: "Mediciones",
  capture: "Captura",
  analysis: "Análisis de pose",
  viewer: "Atlas anatómico 3D",
  analytics: "Analítica",
  simulations: "Simulaciones",
  reports: "Reportes",
  users: "Usuarios y roles",
};

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "No se pudo completar la solicitud.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function roleName(role: Role) {
  return role === "admin"
    ? "Administrador"
    : role === "specialist"
      ? "Especialista"
      : "Usuario";
}

type WorkspaceSidebarProps = {
  user: User;
  activeTab: WorkspaceTab;
  onNavigate: (tab: WorkspaceTab) => void;
  onSignOut: () => void;
};

function WorkspaceSidebar({
  user,
  activeTab,
  onNavigate,
  onSignOut,
}: WorkspaceSidebarProps) {
  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-brand"><Brand /></div>
      <div className="sidebar-workspace-label">ESPACIO DE TRABAJO</div>
      <nav className="workspace-nav" aria-label="Secciones de BODYVISION">
        {workspaceNavGroups.map((group) => (
          <div className="workspace-nav-group" key={group.title}>
            <span className="workspace-nav-heading">{group.title}</span>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  aria-current={activeTab === item.id ? "page" : undefined}
                  className={`workspace-nav-item ${activeTab === item.id ? "is-active" : ""}`}
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {!item.ready && <small>Pronto</small>}
                </button>
              );
            })}
          </div>
        ))}
        {user.role === "admin" && (
          <div className="workspace-nav-group admin-nav-group">
            <span className="workspace-nav-heading">ADMINISTRACIÓN</span>
            <button
              aria-current={activeTab === "users" ? "page" : undefined}
              className={`workspace-nav-item ${activeTab === "users" ? "is-active" : ""}`}
              onClick={() => onNavigate("users")}
            >
              <Users size={16} />
              <span>Usuarios y roles</span>
              <ChevronRight className="nav-item-arrow" size={14} />
            </button>
          </div>
        )}
      </nav>
      <div className="sidebar-account">
        <span className="avatar">{user.full_name.slice(0, 1).toUpperCase()}</span>
        <span className="sidebar-account-name"><strong>{user.full_name}</strong><small>{roleName(user.role)}</small></span>
        <button className="icon-button" onClick={onSignOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>
      </div>
    </aside>
  );
}

type DashboardOverviewProps = {
  user: User;
  users: User[];
  onNavigate: (tab: WorkspaceTab) => void;
};

function DashboardOverview({ user, users, onNavigate }: DashboardOverviewProps) {
  const activeUsers = users.filter((entry) => entry.is_active).length;

  return (
    <>
      <div className="workspace-heading dashboard-page-heading">
        <div>
          <span className="eyebrow">VISTA GENERAL</span>
          <h1>Hola, {user.full_name.split(" ")[0]}</h1>
          <p>Este es el espacio de trabajo compartido de BODYVISION AI. Elige un módulo desde el menú para continuar.</p>
        </div>
        <div className="admin-heading-mark"><LayoutDashboard size={25} /></div>
      </div>

      <section className="dashboard-stat-grid" aria-label="Resumen">
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon"><Users size={17} /></span>
          <span className="dashboard-stat-label">CUENTAS DE USUARIO</span>
          <strong>{user.role === "admin" ? users.length : "—"}</strong>
          <small>{user.role === "admin" ? `${activeUsers} activas` : "Disponible para administración"}</small>
        </article>
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon"><FolderOpen size={17} /></span>
          <span className="dashboard-stat-label">EXPEDIENTES</span>
          <strong>—</strong>
          <small>Módulo aún no conectado</small>
        </article>
        <article className="dashboard-stat-card">
          <span className="dashboard-stat-icon"><Ruler size={17} /></span>
          <span className="dashboard-stat-label">MEDICIONES</span>
          <strong>—</strong>
          <small>Módulo aún no conectado</small>
        </article>
      </section>

      <section className="dashboard-lower-grid">
        <article className="dashboard-card quick-access-card">
          <div className="dashboard-card-heading"><div><span className="eyebrow">NAVEGACIÓN GLOBAL</span><h2>Acceso rápido</h2></div><LayoutDashboard size={19} /></div>
          <p>Las secciones se organizan aquí para todo el equipo; no dependen de abrir primero un expediente.</p>
          <div className="dashboard-shortcuts">
            <button onClick={() => onNavigate("profiles")}><FolderOpen size={17} /><span>Expedientes</span><ArrowRight size={14} /></button>
            <button onClick={() => onNavigate("measurements")}><Ruler size={17} /><span>Mediciones</span><ArrowRight size={14} /></button>
            <button onClick={() => onNavigate("viewer")}><Bone size={17} /><span>Atlas 3D</span><ArrowRight size={14} /></button>
            {user.role === "admin" && <button onClick={() => onNavigate("users")}><Users size={17} /><span>Usuarios y roles</span><ArrowRight size={14} /></button>}
          </div>
        </article>
        <article className="dashboard-card roadmap-card">
          <div className="dashboard-card-heading"><div><span className="eyebrow">ESTADO DEL MVP</span><h2>Módulos por implementar</h2></div><Activity size={19} /></div>
          <div className="roadmap-row"><span className="roadmap-state state-ready" /><span>Acceso y usuarios</span><strong>Disponible</strong></div>
          <div className="roadmap-row"><span className="roadmap-state state-ready" /><span>Atlas educativo 3D</span><strong>Disponible</strong></div>
          <div className="roadmap-row"><span className="roadmap-state state-pending" /><span>Expedientes y mediciones</span><strong>Pendiente</strong></div>
          <div className="roadmap-row"><span className="roadmap-state state-pending" /><span>Captura, análisis y reportes</span><strong>Pendiente</strong></div>
          <small className="roadmap-disclaimer">Los módulos pendientes se muestran sin inventar datos ni resultados.</small>
        </article>
      </section>
    </>
  );
}

function PendingModule({ tab }: { tab: WorkspaceTab }) {
  const item = workspaceNavGroups.flatMap((group) => group.items).find((entry) => entry.id === tab);
  const Icon = item?.icon ?? FileText;

  return (
    <section className="module-page">
      <div className="workspace-heading">
        <div><span className="eyebrow">MÓDULO BODYVISION</span><h1>{workspaceTabTitles[tab]}</h1><p>Esta sección estará disponible desde la navegación global del espacio de trabajo.</p></div>
        <div className="admin-heading-mark"><Icon size={25} /></div>
      </div>
      <div className="module-empty-state">
        <span className="module-empty-icon"><Icon size={25} /></span>
        <span className="eyebrow">EN CONSTRUCCIÓN</span>
        <h2>{workspaceTabTitles[tab]}</h2>
        <p>Este módulo está en la hoja de ruta del proyecto, pero todavía no tiene operaciones conectadas. No se muestran registros ficticios.</p>
      </div>
    </section>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);

  async function refreshUsers() {
    setLoadingUsers(true);
    try {
      setUsers(await apiRequest<User[]>("/api/users"));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la lista de usuarios.",
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest<User | null>("/api/auth/session")
      .then((authenticatedUser) => {
        if (!active || !authenticatedUser) return;
        setUser(authenticatedUser);
        setScreen("workspace");
        setActiveTab("dashboard");
        if (authenticatedUser.role === "admin") void refreshUsers();
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function openCreateUser() {
    setEditingUser(null);
    setDraft(emptyDraft);
    setError("");
    setModalOpen(true);
  }

  function openEditUser(selectedUser: User) {
    setEditingUser(selectedUser);
    setDraft({
      dni: selectedUser.dni,
      full_name: selectedUser.full_name,
      password: "",
      role: selectedUser.role,
      is_active: selectedUser.is_active,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const authenticatedUser = await apiRequest<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ dni, password }),
      });
      setUser(authenticatedUser);
      setScreen("workspace");
      setActiveTab("dashboard");
      setDni("");
      setPassword("");
      if (authenticatedUser.role === "admin") await refreshUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const body: Record<string, string | boolean> = {
      dni: draft.dni,
      full_name: draft.full_name,
      role: draft.role,
      is_active: draft.is_active,
    };
    if (draft.password) body.password = draft.password;
    if (!editingUser && !draft.password) {
      setBusy(false);
      setError("La contraseña es obligatoria para una cuenta nueva.");
      return;
    }
    try {
      if (editingUser) {
        await apiRequest<User>(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setNotice("Los cambios del usuario se guardaron.");
      } else {
        await apiRequest<User>("/api/users", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setNotice("El usuario se creó correctamente.");
      }
      setModalOpen(false);
      await refreshUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el usuario.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleUserStatus(selectedUser: User) {
    setError("");
    setNotice("");
    try {
      await apiRequest<User>(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !selectedUser.is_active }),
      });
      setNotice(
        selectedUser.is_active
          ? "La cuenta quedó desactivada."
          : "La cuenta quedó activada.",
      );
      await refreshUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cambiar el estado de la cuenta.",
      );
    }
  }

  async function signOut() {
    await apiRequest<void>("/api/auth/logout", { method: "POST" }).catch(
      () => undefined,
    );
    setUser(null);
    setUsers([]);
    setScreen("landing");
    setActiveTab("dashboard");
    setNotice("");
  }

  function navigateWorkspace(tab: WorkspaceTab) {
    setActiveTab(tab);
    setError("");
    setNotice("");
  }

  if (screen === "login") {
    return (
      <main className="login-page">
        <button className="back-link" onClick={() => setScreen("landing")}>
          <ArrowLeft size={17} /> Volver al inicio
        </button>
        <div className="login-layout">
          <div className="login-story">
            <Brand />
            <div className="login-story-copy">
              <span className="eyebrow"><span className="eyebrow-dot" /> ACCESO PRIVADO</span>
              <h1>Tu espacio de trabajo, <em>en buenas manos.</em></h1>
              <p>Ingresa con el DNI y la contraseña que te asignó el administrador de BODYVISION.</p>
              <div className="login-trust"><ShieldCheck size={18} /> Acceso protegido · Sesión privada</div>
            </div>
            <div className="login-decoration" aria-hidden="true"><Fingerprint size={250} strokeWidth={0.45} /></div>
          </div>
          <form className="login-card" onSubmit={handleLogin}>
            <div className="form-icon"><LockKeyhole size={21} /></div>
            <span className="eyebrow">INICIAR SESIÓN</span>
            <h2>Bienvenido</h2>
            <p className="form-intro">Introduce tus credenciales para continuar.</p>
            <label className="field-label" htmlFor="login-dni">DNI</label>
            <div className="input-wrap"><Fingerprint size={18} /><input id="login-dni" value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="username" placeholder="8 dígitos" required pattern="\d{8}" /></div>
            <label className="field-label" htmlFor="login-password">Contraseña</label>
            <div className="input-wrap"><LockKeyhole size={17} /><input id="login-password" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Tu contraseña" required /><button className="password-toggle" type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary login-submit" disabled={busy} type="submit">{busy ? "Validando…" : "Entrar a BODYVISION"}<ArrowRight size={17} /></button>
            <p className="login-footnote">¿No tienes acceso? Solicita una cuenta al administrador.</p>
          </form>
        </div>
      </main>
    );
  }

  if (screen === "workspace" && user) {
    const activeTitle = workspaceTabTitles[activeTab];
    return (
      <main className="workspace-page">
        <WorkspaceSidebar user={user} activeTab={activeTab} onNavigate={navigateWorkspace} onSignOut={signOut} />
        <div className="workspace-main">
          <header className="workspace-topbar">
            <div className="workspace-topbar-title"><span>BODYVISION</span><ChevronRight size={14} /><strong>{activeTitle}</strong></div>
            <span className="workspace-role-badge">{roleName(user.role)}</span>
          </header>
          <section className="workspace-content">
            {notice && <div className="notice success-notice"><Check size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={15} /></button></div>}
            {error && !modalOpen && <div className="notice error-notice" role="alert">{error}<button onClick={() => setError("")} aria-label="Cerrar aviso"><X size={15} /></button></div>}

            {activeTab === "dashboard" && <DashboardOverview user={user} users={users} onNavigate={navigateWorkspace} />}

            {activeTab === "users" && user.role === "admin" && <>
              <div className="workspace-heading">
                <div><span className="eyebrow">ADMINISTRACIÓN</span><h1>Usuarios y roles</h1><p>Gestiona las cuentas desde el mismo espacio de trabajo, sin salir a otra vista.</p></div>
                <div className="admin-heading-mark"><Users size={25} /></div>
              </div>
              <section className="user-panel">
                <div className="panel-heading"><div><div className="panel-title"><Users size={19} /><h2>Usuarios</h2><span className="count-pill">{users.length}</span></div><p>Solo los administradores pueden modificar las cuentas.</p></div><button className="button button-primary" onClick={openCreateUser}><Plus size={17} />Nuevo usuario</button></div>
                <div className="user-table-wrap"><table><thead><tr><th>PERSONA</th><th>DNI</th><th>ROL</th><th>ESTADO</th><th className="actions-column">ACCIONES</th></tr></thead><tbody>
                  {loadingUsers ? <tr><td className="table-message" colSpan={5}>Cargando usuarios…</td></tr> : users.length === 0 ? <tr><td className="table-message" colSpan={5}>Aún no hay cuentas registradas.</td></tr> : users.map((entry) => <tr key={entry.id}><td><div className="person-cell"><span className="person-avatar">{entry.full_name.slice(0, 1).toUpperCase()}</span><span><strong>{entry.full_name}</strong><small>Desde {new Date(entry.created_at).toLocaleDateString("es-PE")}</small></span></div></td><td className="dni-cell">{entry.dni}</td><td><span className={`role-pill role-${entry.role}`}>{roleName(entry.role)}</span></td><td><span className={`account-state ${entry.is_active ? "state-active" : "state-inactive"}`}><span />{entry.is_active ? "Activo" : "Inactivo"}</span></td><td><div className="row-actions"><button className="text-action" onClick={() => openEditUser(entry)}>Editar</button><button className="text-action muted-action" disabled={entry.id === user.id} onClick={() => void toggleUserStatus(entry)}>{entry.is_active ? "Desactivar" : "Activar"}</button></div></td></tr>)}
                </tbody></table></div>
                <div className="panel-note"><ShieldCheck size={16} /><span>Las contraseñas no se almacenan en texto claro y nunca se muestran. Para cambiarlas, edita la cuenta del usuario.</span></div>
              </section>
            </>}

            {activeTab === "viewer" && <section className="workspace-viewer-section">
              <div className="workspace-heading"><div><span className="eyebrow">ATLAS EDUCATIVO</span><h1>Explora anatomía en 3D</h1><p>Este visor es una herramienta global; no requiere seleccionar un expediente.</p></div><div className="admin-heading-mark"><Bone size={25} /></div></div>
              <Suspense fallback={<div className="atlas-loading" role="status">Preparando el visor 3D…</div>}><BodyViewer /></Suspense>
              <div className="medical-disclaimer"><ShieldCheck size={17} /><span>Modelo educativo. No representa una medición clínica ni proporciona diagnóstico médico.</span></div>
            </section>}

            {!(["dashboard", "users", "viewer"] as WorkspaceTab[]).includes(activeTab) && <PendingModule tab={activeTab} />}
            <footer className="workspace-footer">BODYVISION AI <span>·</span> Espacio de trabajo compartido <span>·</span> MVP de desarrollo</footer>
          </section>
        </div>
        {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title" onSubmit={saveUser}>
          <div className="modal-heading"><div><span className="eyebrow">CUENTAS Y ACCESOS</span><h2 id="user-modal-title">{editingUser ? "Editar usuario" : "Nuevo usuario"}</h2></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Cerrar"><X size={19} /></button></div>
          <label className="field-label" htmlFor="user-name">Nombre completo</label><input className="text-input" id="user-name" value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} maxLength={120} required />
          <label className="field-label" htmlFor="user-dni">DNI</label><input className="text-input" id="user-dni" value={draft.dni} onChange={(event) => setDraft({ ...draft, dni: event.target.value.replace(/\D/g, "").slice(0, 8) })} inputMode="numeric" pattern="\d{8}" minLength={8} maxLength={8} placeholder="8 dígitos" required />
          <label className="field-label" htmlFor="user-role">Rol</label><select className="text-input" id="user-role" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}><option value="user">Usuario</option><option value="specialist">Especialista</option><option value="admin">Administrador</option></select>
          <label className="field-label" htmlFor="user-password">{editingUser ? "Nueva contraseña (opcional)" : "Contraseña temporal"}</label><input className="text-input" id="user-password" type="password" autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} minLength={10} maxLength={128} required={!editingUser} placeholder={editingUser ? "Deja vacío para mantenerla" : "Mínimo 10 caracteres"} />
          {editingUser && <label className="checkbox-row"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} /><span>Cuenta activa</span></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="button button-primary" disabled={busy} type="submit">{busy ? "Guardando…" : editingUser ? "Guardar cambios" : "Crear usuario"}<ArrowRight size={16} /></button></div>
        </form></div>}
      </main>
    );
  }

  if (screen === "atlas") {
    return <main className="atlas-page"><header className="workspace-topbar"><Brand /><button className="back-link" onClick={() => setScreen(user ? "workspace" : "landing")}><ArrowLeft size={17} />{user ? "Volver al panel" : "Volver al inicio"}</button></header><section className="atlas-content"><div className="atlas-heading"><span className="eyebrow"><span className="eyebrow-dot" /> ATLAS INTERACTIVO</span><h1>Explora el cuerpo <em>en 3D.</em></h1><p>Modelo educativo de esqueleto. Gira y amplía para explorar la anatomía.</p></div><Suspense fallback={<div className="atlas-loading" role="status">Preparando el visor 3D…</div>}><BodyViewer /></Suspense><div className="medical-disclaimer"><ShieldCheck size={17} /><span>Contenido educativo. No representa una medición clínica ni proporciona diagnóstico médico.</span></div></section></main>;
  }

  return (
    <main className="landing-page">
      <header className="landing-header"><Brand /><nav className="landing-nav" aria-label="Navegación principal"><a href="#plataforma">Plataforma</a><a href="#principios">Enfoque</a><a href="#atlas">Atlas 3D</a></nav><button className="button button-outline" onClick={() => setScreen("login")}><LockKeyhole size={16} />Iniciar sesión</button></header>
      <section className="landing-hero">
        <div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" /> VISUALIZA · COMPRENDE · GESTIONA</span><h1>Una nueva forma de <em>ver el cuerpo.</em></h1><p>Una plataforma para explorar anatomía en 3D y, por fases, organizar mediciones y análisis visuales con claridad, trazabilidad y privacidad.</p><div className="hero-actions"><button className="button button-primary" onClick={() => setScreen("login")}>Acceder a mi cuenta<ArrowRight size={17} /></button><a className="hero-text-link" href="#plataforma">Conoce la plataforma <ArrowDown size={15} /></a></div><div className="hero-assurance"><ShieldCheck size={16} /> Diseñada con privacidad y transparencia en mente</div></div>
        <div className="hero-visual"><div className="hero-visual-label"><span className="live-dot" /> ATLAS ANATÓMICO <small>VISTA PREVIA</small></div><div className="hero-art" aria-hidden="true"><div className="hero-art-orbit orbit-a" /><div className="hero-art-orbit orbit-b" /><div className="hero-art-core"><Bone size={62} strokeWidth={0.8} /></div><span className="art-point art-point-a" /><span className="art-point art-point-b" /><span className="art-point art-point-c" /><span className="art-coordinate coordinate-a">3D / 01</span><span className="art-coordinate coordinate-b">BODY ATLAS</span></div><button className="hero-visual-cta" onClick={() => setScreen("atlas")}>Explorar atlas interactivo <ArrowUpRight size={14} /></button><div className="hero-visual-caption"><span>ANATOMÍA · MODELO EDUCATIVO</span><span>WEBGL</span></div><div className="hero-glow" aria-hidden="true" /></div>
        <div className="hero-index">BODYVISION AI <span>·</span> PLATAFORMA DE EXPLORACIÓN</div>
      </section>
      <section className="platform-section" id="plataforma"><div className="section-intro"><span className="eyebrow">UNA BASE PARA AVANZAR</span><h2>Herramientas claras.<br /><em>Información con contexto.</em></h2><p>Construimos por etapas para que cada función tenga utilidad, límites definidos y una base segura.</p></div><div className="feature-grid"><article className="feature-card"><span className="feature-number">01</span><div className="feature-icon"><Bone size={21} /></div><h3>Atlas anatómico 3D</h3><p>Explora un modelo interactivo en el navegador. Gira, amplía y consulta sus capas educativas.</p><button className="feature-link" id="atlas" onClick={() => setScreen("atlas")}>Abrir atlas <ArrowUpRight size={15} /></button></article><article className="feature-card"><span className="feature-number">02</span><div className="feature-icon"><Activity size={21} /></div><h3>Datos con trazabilidad</h3><p>La hoja de ruta separa los registros observados de las estimaciones visuales y los escenarios hipotéticos.</p><span className="feature-status"><span /> EN DESARROLLO</span></article><article className="feature-card"><span className="feature-number">03</span><div className="feature-icon"><Users size={21} /></div><h3>Acceso administrado</h3><p>Ingreso con DNI y contraseña. El administrador crea cuentas y gestiona roles desde un solo lugar.</p><button className="feature-link" onClick={() => setScreen("login")}>Iniciar sesión <ArrowUpRight size={15} /></button></article></div></section>
      <section className="principles-section" id="principios"><div className="principles-copy"><span className="eyebrow">NUESTRO COMPROMISO</span><h2>La confianza también se <em>diseña.</em></h2><p>La tecnología debe explicar qué sabe, qué estima y qué todavía no puede afirmar.</p></div><div className="principle-list"><article><span><ShieldCheck size={19} /></span><div><h3>Privacidad primero</h3><p>Usa datos ficticios en esta etapa. No ingreses información personal real.</p></div></article><article><span><Sparkles size={19} /></span><div><h3>Sin promesas clínicas</h3><p>El atlas es educativo; una visualización no es diagnóstico ni medición validada.</p></div></article><article><span><Fingerprint size={19} /></span><div><h3>Acceso bajo control</h3><p>Las cuentas se crean y administran desde el panel de administración.</p></div></article></div></section>
      <section className="cta-section"><div><span className="eyebrow">BODYVISION AI · MVP</span><h2>Empieza explorando.</h2><p>Accede a tu cuenta o descubre el atlas anatómico interactivo.</p></div><div className="cta-actions"><button className="button button-primary" onClick={() => setScreen("login")}>Iniciar sesión<ArrowRight size={16} /></button><button className="button button-secondary" onClick={() => setScreen("atlas")}>Ver atlas 3D<Bone size={16} /></button></div></section>
      <footer className="landing-footer"><Brand /><span>Un proyecto en desarrollo, con foco en información responsable.</span><a href="https://github.com/SeemaBansal1/3d-human-body-anatomy" target="_blank" rel="noreferrer">Créditos del modelo 3D <ArrowUpRight size={13} /></a></footer>
    </main>
  );
}

function Brand() {
  return <a className="brand" href="#" aria-label="BODYVISION AI, inicio"><span className="brand-mark"><Activity size={19} strokeWidth={2.2} /></span><span><strong>BODYVISION</strong><small>AI PLATFORM</small></span></a>;
}

export default App;