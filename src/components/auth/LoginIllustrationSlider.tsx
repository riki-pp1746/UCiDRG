import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const slides = [
 { image: 'login-team.webp', label: 'Analisis biaya layanan' },
 { image: 'login-episodes.webp', label: 'Biaya per episode' },
 { image: 'login-comparison.webp', label: 'Perbandingan tarif iDRG' },
];

export default function LoginIllustrationSlider() {
 const [activeIndex, setActiveIndex] = useState(0);
 const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const activeSlide = slides[activeIndex];

 useEffect(() => {
  if (!playing) return;
  const timer = window.setTimeout(() => {
   setActiveIndex((activeIndex + 1) % slides.length);
  }, 2000);
  return () => window.clearTimeout(timer);
 }, [activeIndex, playing]);

 function move(offset: number) {
  setActiveIndex(index => (index + offset + slides.length) % slides.length);
 }

 return <section className="uc-login-slider" aria-label="Fitur i-PLC" aria-roledescription="karusel">
  <div className="uc-login-slider-art" aria-hidden="true">
   {slides.map((slide, index) => <img
    key={slide.image}
    src={`${import.meta.env.BASE_URL}brand/${slide.image}`}
    alt=""
    decoding="async"
    fetchPriority={index === 0 ? 'high' : 'low'}
    data-active={index === activeIndex}
   />)}
  </div>
  <div className="uc-login-slider-bar">
   <p className="uc-login-slider-caption" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
    <span className="uc-login-slider-count">{String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
    {activeSlide.label}
   </p>
   <div className="uc-login-slider-controls">
    <button type="button" aria-label={playing ? 'Jeda ilustrasi' : 'Putar ilustrasi otomatis'} onClick={() => setPlaying(value => !value)}>
     {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
    </button>
    <button type="button" aria-label="Ilustrasi sebelumnya" onClick={() => move(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
    <button type="button" aria-label="Ilustrasi berikutnya" onClick={() => move(1)}><ChevronRight size={18} aria-hidden="true" /></button>
   </div>
  </div>
 </section>;
}
