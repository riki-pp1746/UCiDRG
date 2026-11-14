import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
 { image: 'login-team.webp', label: 'Analisis biaya layanan' },
 { image: 'login-episodes.webp', label: 'Biaya per episode' },
 { image: 'login-comparison.webp', label: 'Perbandingan tarif iDRG' },
];

export default function LoginIllustrationSlider() {
 const [activeIndex, setActiveIndex] = useState(0);
 const activeSlide = slides[activeIndex];

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
   <p className="uc-login-slider-caption" aria-live="polite" aria-atomic="true">
    <span className="uc-login-slider-count">{String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
    {activeSlide.label}
   </p>
   <div className="uc-login-slider-controls">
    <button type="button" aria-label="Ilustrasi sebelumnya" onClick={() => move(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
    <button type="button" aria-label="Ilustrasi berikutnya" onClick={() => move(1)}><ChevronRight size={18} aria-hidden="true" /></button>
   </div>
  </div>
 </section>;
}
