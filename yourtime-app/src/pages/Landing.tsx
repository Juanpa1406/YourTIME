import { Navigate, Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { persistLang, type Lang } from '../i18n';

/**
 * Landing page pública en "/". Si el usuario ya tiene sesión activa,
 * redirige directo a /app para evitar fricción de un click extra.
 */
export default function Landing() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();

  // Si Supabase nos mandó acá con un token de recovery en el hash (cuando
  // su Dashboard ignora nuestro redirectTo y usa el Site URL como fallback),
  // redirigimos manualmente a /reset-password preservando el hash. El SDK
  // de Supabase parsea el hash al cargar /reset-password y deja la sesión
  // de recovery lista para que el form de cambio de contraseña aparezca.
  if (
    typeof window !== 'undefined' &&
    window.location.hash.includes('type=recovery')
  ) {
    window.location.replace(
      '/reset-password' + window.location.search + window.location.hash,
    );
    return null;
  }

  if (loading) return null;
  if (session) return <Navigate to="/app" replace />;

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Halos radiales de fondo — mismos tonos del heatmap, idénticos a AuthShell */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 10%, #4d84ff 0%, transparent 60%),' +
            'radial-gradient(50% 40% at 90% 95%, #4dff5f 0%, transparent 65%)',
        }}
      />

      <div className="relative">
        {/* Header: logo izquierda + toggle de idioma derecha. */}
        <header className="flex items-center justify-between px-6 py-5 md:px-10 max-w-6xl mx-auto">
          <Logo variant="full" className="h-8 w-auto" />
          <LanguageToggle />
        </header>

        {/* Hero: headline + subhead + CTAs */}
        <section className="px-6 md:px-10 pt-10 md:pt-16 pb-12 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-yt-text leading-[1.1]">
            <span className="block">{t('landing.hero.headline1')}</span>
            <span className="block">{t('landing.hero.headline2')}</span>
            <span className="block">{t('landing.hero.headline3')}</span>
          </h1>
          <p className="text-base md:text-lg text-yt-muted mt-6 max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero.subhead')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center font-semibold rounded-lg transition-colors bg-heat-1 hover:bg-heat-2 active:bg-heat-3 text-yt-bg text-base px-6 py-3 min-w-[200px] shadow-lg shadow-heat-1/20"
            >
              {t('landing.hero.ctaPrimary')}
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors bg-yt-surface border border-yt-border hover:border-yt-muted text-yt-text text-base px-6 py-3 min-w-[200px]"
            >
              {t('landing.hero.ctaSecondary')}
            </Link>
          </div>
        </section>

        {/* Screenshot del dashboard real */}
        <section className="px-6 md:px-10 pb-16 max-w-5xl mx-auto">
          <div className="rounded-xl overflow-hidden border border-yt-border shadow-2xl shadow-black/40">
            <img
              src="/preview.png"
              alt={t('landing.hero.previewAlt')}
              className="w-full h-auto block"
              draggable={false}
            />
          </div>
        </section>

        {/* Grid de 3 features */}
        <section className="px-6 md:px-10 pb-20 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title={t('landing.features.kanban.title')}
              desc={t('landing.features.kanban.desc')}
              accent="bg-heat-1"
              icon={<KanbanIcon />}
            />
            <FeatureCard
              title={t('landing.features.pomodoro.title')}
              desc={t('landing.features.pomodoro.desc')}
              accent="bg-heat-3"
              icon={<PomodoroIcon />}
            />
            <FeatureCard
              title={t('landing.features.heatmap.title')}
              desc={t('landing.features.heatmap.desc')}
              accent="bg-heat-5"
              icon={<HeatmapIcon />}
            />
          </div>
        </section>

        {/* Footer con email de soporte */}
        <footer className="px-6 md:px-10 pb-10 max-w-5xl mx-auto">
          <div className="border-t border-yt-border/60 pt-8">
            <p className="text-sm text-yt-muted text-center">
              <Trans
                i18nKey="landing.footer.contact"
                components={{
                  supportLink: (
                    <a
                      href="mailto:support@yourtimeapp.me"
                      className="text-heat-2 hover:text-heat-3 transition-colors"
                    />
                  ),
                }}
              />
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

/**
 * Toggle ES / US para cambiar idioma desde la landing. Persiste en
 * localStorage (clave `yt:lang`) y refresca toda la app vía i18n.
 */
function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current: Lang = i18n.language.split('-')[0] === 'en' ? 'en' : 'es';

  const switchTo = (lang: Lang) => {
    if (current === lang) return;
    i18n.changeLanguage(lang);
    persistLang(lang);
  };

  const activeClass = 'font-semibold text-yt-text';
  const inactiveClass = 'text-yt-muted hover:text-yt-text transition-colors';

  return (
    <div
      className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm bg-yt-surface/60 backdrop-blur-sm border border-yt-border rounded-full shadow-lg shadow-black/20"
      role="group"
      aria-label={t('landing.langToggle.label')}
    >
      <button
        type="button"
        onClick={() => switchTo('es')}
        className={current === 'es' ? activeClass : inactiveClass}
        aria-label={t('landing.langToggle.toEs')}
        aria-pressed={current === 'es'}
      >
        ES
      </button>
      <span className="text-yt-border" aria-hidden>
        |
      </span>
      <button
        type="button"
        onClick={() => switchTo('en')}
        className={current === 'en' ? activeClass : inactiveClass}
        aria-label={t('landing.langToggle.toEn')}
        aria-pressed={current === 'en'}
      >
        US
      </button>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  accent,
  icon,
}: {
  title: string;
  desc: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-yt-surface border border-yt-border rounded-2xl p-6 hover:border-yt-muted/50 transition-colors">
      <div
        className={`w-10 h-10 rounded-lg ${accent} mb-4 flex items-center justify-center text-yt-bg`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-yt-text mb-2">{title}</h3>
      <p className="text-sm text-yt-muted leading-relaxed">{desc}</p>
    </div>
  );
}

/**
 * Iconos SVG inline para el grid de features. Cada uno dibuja
 * literalmente lo que la feature hace en la app. Heredan currentColor
 * del padre (text-yt-bg) para que contrasten con el fondo accent.
 */

/** Tres columnas verticales con cards dentro — el Kanban. */
function KanbanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="10" rx="1" />
      <rect x="17" y="4" width="4" height="13" rx="1" />
    </svg>
  );
}

/** Cronómetro con manecillas — el Pomodoro. */
function PomodoroIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="14" r="7" />
      <path d="M12 11v3l2 2" />
      <path d="M10 3h4" />
      <path d="M12 3v3" />
    </svg>
  );
}

/** Grid de cuadritos con distintas intensidades — mini-heatmap. */
function HeatmapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="4" height="4" rx="0.7" opacity="0.4" />
      <rect x="7" y="3" width="4" height="4" rx="0.7" opacity="0.7" />
      <rect x="12" y="3" width="4" height="4" rx="0.7" opacity="1" />
      <rect x="17" y="3" width="4" height="4" rx="0.7" opacity="0.7" />
      <rect x="2" y="8" width="4" height="4" rx="0.7" opacity="0.7" />
      <rect x="7" y="8" width="4" height="4" rx="0.7" opacity="1" />
      <rect x="12" y="8" width="4" height="4" rx="0.7" opacity="0.4" />
      <rect x="17" y="8" width="4" height="4" rx="0.7" opacity="0.7" />
      <rect x="2" y="13" width="4" height="4" rx="0.7" opacity="1" />
      <rect x="7" y="13" width="4" height="4" rx="0.7" opacity="0.4" />
      <rect x="12" y="13" width="4" height="4" rx="0.7" opacity="0.7" />
      <rect x="17" y="13" width="4" height="4" rx="0.7" opacity="1" />
    </svg>
  );
}
