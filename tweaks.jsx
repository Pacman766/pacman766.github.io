// Tweaks panel: lightweight controls for swapping accent + font + density
const { useEffect } = React;

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 60,
  "fontPair": "Fraunces + Inter",
  "density": "Comfortable",
  "showOrbit": true
}/*EDITMODE-END*/;

const FONT_PAIRS = {
  "Fraunces + Inter": { serif: '"Fraunces", Georgia, serif', sans: '"Inter", sans-serif' },
  "Playfair + Inter": { serif: '"Playfair Display", Georgia, serif', sans: '"Inter", sans-serif' },
  "Instrument + Geist": { serif: '"Instrument Serif", Georgia, serif', sans: '"Geist", sans-serif' },
};

function loadGoogleFonts(pair) {
  const map = {
    "Fraunces + Inter": "Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600",
    "Playfair + Inter": "Playfair+Display:wght@400;500;600&family=Inter:wght@300;400;500;600",
    "Instrument + Geist": "Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600",
  };
  const id = "tweak-fonts";
  let el = document.getElementById(id);
  const href = `https://fonts.googleapis.com/css2?family=${map[pair]}&display=swap`;
  if (!el) {
    el = document.createElement('link');
    el.rel = "stylesheet"; el.id = id;
    document.head.appendChild(el);
  }
  el.href = href;
}

function App() {
  const [tweaks, setTweak] = window.useTweaks(DEFAULTS);

  useEffect(() => {
    const root = document.documentElement;
    // Accent hue
    root.style.setProperty('--accent', `oklch(0.68 0.13 ${tweaks.accentHue})`);
    root.style.setProperty('--accent-ink', `oklch(0.30 0.05 ${tweaks.accentHue})`);
    // Density
    const pad = tweaks.density === "Compact" ? "clamp(16px, 3vw, 40px)" : tweaks.density === "Airy" ? "clamp(28px, 6vw, 80px)" : "clamp(20px, 4vw, 56px)";
    root.style.setProperty('--pad', pad);
    // Font pair
    const fonts = FONT_PAIRS[tweaks.fontPair];
    if (fonts) {
      loadGoogleFonts(tweaks.fontPair);
      root.style.setProperty('--serif', fonts.serif);
      root.style.setProperty('--sans', fonts.sans);
    }
    // Orbit
    const orbit = document.querySelector('.portrait-orbit');
    if (orbit) orbit.style.display = tweaks.showOrbit ? '' : 'none';
  }, [tweaks]);

  return (
    <window.TweaksPanel title="Tweaks">
      <window.TweakSection title="Accent">
        <window.TweakSlider label="Hue" min={0} max={360} step={5} value={tweaks.accentHue} onChange={(v) => setTweak('accentHue', v)} />
      </window.TweakSection>
      <window.TweakSection title="Typography">
        <window.TweakRadio label="Pair" options={["Fraunces + Inter", "Playfair + Inter", "Instrument + Geist"]} value={tweaks.fontPair} onChange={(v) => setTweak('fontPair', v)} />
      </window.TweakSection>
      <window.TweakSection title="Layout">
        <window.TweakRadio label="Density" options={["Compact", "Comfortable", "Airy"]} value={tweaks.density} onChange={(v) => setTweak('density', v)} />
        <window.TweakToggle label="Portrait orbit" value={tweaks.showOrbit} onChange={(v) => setTweak('showOrbit', v)} />
      </window.TweakSection>
    </window.TweaksPanel>
  );
}

const mount = document.createElement('div');
document.body.appendChild(mount);
ReactDOM.createRoot(mount).render(<App />);
