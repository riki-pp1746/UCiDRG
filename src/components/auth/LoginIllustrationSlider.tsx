import { useEffect, useState } from 'react';

const slides = [
 { image: 'login-team.webp', label: 'Analisis biaya layanan' },
 { image: 'login-episodes.webp', label: 'Biaya per episode' },
 { image: 'login-comparison.webp', label: 'Perbandingan tarif iDRG' },
];

export default function LoginIllustrationSlider() {
 const [activeIndex, setActiveIndex] = useState(0);
 const activeSlide = slides[activeIndex];

 useEffect(() => {
  const timer = window.setInterval(() => {
   setActiveIndex(index => (index + 1) % slides.length);
  }, 2000);
  return () => window.clearInterval(timer);
 }, []);

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
   <p className="uc-login-slider-caption">
    <span className="uc-login-slider-count">{String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
    {activeSlide.label}
   </p>
  </div>
 </section>;
}
