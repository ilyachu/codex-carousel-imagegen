import carousel from "./generated/carousel-data.json";

const params = new URLSearchParams(window.location.search);
const exportMode = params.get("export") === "1";
const slideIndex = Number.parseInt(params.get("slide") || "", 10);

const accentMap = {
  coral: "var(--coral)",
  sky: "var(--sky)",
  moss: "var(--moss)",
  gold: "var(--gold)"
};

function resolveAsset(slide) {
  if (!slide.runtimeAsset) {
    return null;
  }

  return `./runtime-assets/${slide.runtimeAsset}`;
}

function Slide({ slide, index }) {
  const accent = accentMap[slide.accent] || "var(--coral)";
  const asset = resolveAsset(slide);
  const showAside = exportMode ? slide.showAsideOnExport === true : slide.showAside !== false;
  const cornerLabel = exportMode ? "" : carousel.styleLock.cornerLabel || "";

  return (
    <article
      className={`slide-shell layout-${slide.layout} role-${slide.role}`}
      style={{ "--slide-accent": accent }}
      data-slide-id={slide.id}
    >
      <div className="background-layer background-base" />
      <div className="background-layer background-noise" />
      <div className="background-layer background-glow" />
      {asset ? (
        <div
          className="background-layer background-asset"
          style={{ backgroundImage: `url("${asset}")` }}
        />
      ) : null}

      <div className="frame frame-top">
        <span>{cornerLabel}</span>
        <span>
          {String(index + 1).padStart(2, "0")} / {String(carousel.slides.length).padStart(2, "0")}
        </span>
      </div>

      <div className="slide-content">
        <div className="eyebrow">{slide.eyebrow}</div>
        <h1>{slide.headline}</h1>
        <div className="body-block">
          {slide.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {slide.list ? (
          <ul className="detail-list">
            {slide.list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {slide.chips ? (
          <div className="chips">
            {slide.chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        ) : null}
      </div>

      {showAside ? (
        <aside className="aside-panel">
          <div className="aside-label">{slide.asideLabel || slide.role}</div>
          <div className="aside-value">{slide.asideValue || slide.visualIdea}</div>
          <div className="aside-note">{slide.visualIdea}</div>
        </aside>
      ) : null}
    </article>
  );
}

function Overview() {
  return (
    <main className={`app-shell ${exportMode ? "export-mode" : ""}`}>
      {!exportMode ? (
        <header className="page-header">
          <div>
            <div className="page-kicker">codex-carousel-imagegen</div>
            <h2>{carousel.meta.title}</h2>
          </div>
          <div className="page-meta">
            <span>{carousel.meta.size.width}x{carousel.meta.size.height}</span>
            <span>{carousel.meta.language}</span>
            <span>{carousel.meta.platforms.join(" / ")}</span>
          </div>
        </header>
      ) : null}

      <section className={exportMode ? "slides-export" : "slides-grid"}>
        {carousel.slides.map((slide, index) => (
          <Slide key={slide.id} slide={slide} index={index} />
        ))}
      </section>
    </main>
  );
}

function SingleSlide() {
  const safeIndex = Number.isFinite(slideIndex) ? slideIndex - 1 : 0;
  const slide = carousel.slides[safeIndex] || carousel.slides[0];

  return (
    <main className={`app-shell single ${exportMode ? "export-mode" : ""}`}>
      <Slide slide={slide} index={safeIndex} />
    </main>
  );
}

export default function App() {
  if (Number.isInteger(slideIndex) && slideIndex > 0) {
    return <SingleSlide />;
  }

  return <Overview />;
}
