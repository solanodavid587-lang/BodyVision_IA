import { type ReactNode, useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Database,
  Layers3,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

type ServiceHealth = {
  status: "ok" | "degraded";
  database: "ok" | "unavailable";
};

type ConnectionState =
  | { kind: "checking" }
  | { kind: "connected"; health: ServiceHealth }
  | { kind: "unreachable" };

function isServiceHealth(value: unknown): value is ServiceHealth {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const health = value as Record<string, unknown>;
  return (
    (health.status === "ok" || health.status === "degraded") &&
    (health.database === "ok" || health.database === "unavailable")
  );
}

function App() {
  const [connection, setConnection] = useState<ConnectionState>({
    kind: "checking",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        if (!isServiceHealth(body)) {
          throw new Error("Respuesta de salud no válida");
        }

        setConnection({ kind: "connected", health: body });
      } catch {
        if (!controller.signal.aborted) {
          setConnection({ kind: "unreachable" });
        }
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  const apiStatus =
    connection.kind === "checking"
      ? "Comprobando"
      : connection.kind === "unreachable"
        ? "Sin conexión"
        : connection.health.status === "ok"
          ? "Disponible"
          : "Degradada";

  const databaseStatus =
    connection.kind === "checking"
      ? "Comprobando"
      : connection.kind === "unreachable"
        ? "Sin conexión"
        : connection.health.database === "ok"
          ? "Disponible"
          : "No disponible";

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="BODYVISION AI, inicio">
          <span className="brand-mark">
            <Activity size={19} strokeWidth={2.2} />
          </span>
          <span>
            <strong>BODYVISION</strong>
            <small>AI PLATFORM</small>
          </span>
        </a>
        <div className="environment">
          <span className="environment-dot" />
          ENTORNO DE DESARROLLO
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            FUNDACIÓN TÉCNICA · V0.1
          </div>
          <h1>
            Una base sólida para
            <br />
            <span>construir con confianza.</span>
          </h1>
          <p>
            Arquitectura modular para expedientes, mediciones y análisis
            visuales. La información observada siempre se mantiene diferenciada
            de estimaciones y escenarios hipotéticos.
          </p>
          <a className="architecture-link" href="/docs">
            Explorar contrato de API <ArrowUpRight size={16} />
          </a>
        </div>

        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-outer" />
          <div className="orbit orbit-inner" />
          <div className="orbit-core">
            <ScanLine size={42} strokeWidth={1.3} />
          </div>
          <span className="orbit-point point-one" />
          <span className="orbit-point point-two" />
          <span className="orbit-point point-three" />
        </div>
      </section>

      <section className="foundation" aria-labelledby="foundation-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ESTADO DEL SISTEMA</div>
            <h2 id="foundation-title">Fundación lista para crecer</h2>
          </div>
          <span className="release-badge">
            <span className="release-dot" />
            STARTER
          </span>
        </div>

        <div className="status-grid">
          <StatusCard
            icon={<Activity size={18} />}
            label="API"
            value={apiStatus}
            healthy={
              connection.kind === "connected" &&
              connection.health.status === "ok"
            }
            checking={connection.kind === "checking"}
          />
          <StatusCard
            icon={<Database size={18} />}
            label="POSTGRESQL"
            value={databaseStatus}
            healthy={
              connection.kind === "connected" &&
              connection.health.database === "ok"
            }
            checking={connection.kind === "checking"}
          />
          <div className="status-card">
            <div className="card-icon"><Layers3 size={18} /></div>
            <span className="card-label">ARQUITECTURA</span>
            <strong className="card-value">Modular</strong>
            <span className="card-detail">Frontend · API · Datos</span>
          </div>
        </div>
      </section>

      <section className="principles" aria-label="Principios de la plataforma">
        <article className="principle">
          <div className="principle-icon"><ShieldCheck size={18} /></div>
          <div>
            <h3>Privacidad primero</h3>
            <p>Sin datos reales hasta habilitar controles de acceso y consentimiento.</p>
          </div>
        </article>
        <article className="principle">
          <div className="principle-icon"><LockKeyhole size={18} /></div>
          <div>
            <h3>Alcance responsable</h3>
            <p>Las estimaciones visuales no son mediciones clínicas ni diagnósticos.</p>
          </div>
        </article>
      </section>

      <footer className="footer">
        <span>BODYVISION AI <span className="footer-separator">/</span> BASE DE DESARROLLO</span>
        <span>Las funciones avanzadas aún no están implementadas.</span>
      </footer>
    </main>
  );
}

type StatusCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  healthy: boolean;
  checking: boolean;
};

function StatusCard({ icon, label, value, healthy, checking }: StatusCardProps) {
  return (
    <div className="status-card">
      <div className="card-icon">{icon}</div>
      <span className="card-label">{label}</span>
      <strong className="card-value">{value}</strong>
      <span className={`card-detail ${checking ? "is-checking" : healthy ? "is-healthy" : "is-unavailable"}`}>
        <span className="status-dot" />
        {checking ? "Verificando conexión" : healthy ? "Operativo" : "Revisar servicio"}
      </span>
    </div>
  );
}

export default App;
