import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function EventCarousel({ events }: { events: any[] }) {
  const carouselEvents = events.filter(e => e.imageUrl);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselEvents.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselEvents.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselEvents.length]);

  if (carouselEvents.length === 0) return null;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % carouselEvents.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + carouselEvents.length) % carouselEvents.length);

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden shadow-lg group mb-8">
      {carouselEvents.map((event, index) => (
        <div
          key={event.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
        >
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <span className="inline-block px-2 py-1 bg-blue-600 text-xs font-bold rounded mb-2 uppercase tracking-wider">
              Destaque
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">{event.title}</h2>
            <p className="text-sm sm:text-base text-gray-200">
              {format(new Date(event.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })} • {event.location}
            </p>
          </div>
        </div>
      ))}
      
      {carouselEvents.length > 1 && (
        <>
          <button 
            onClick={prevSlide} 
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide} 
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 right-6 flex space-x-2 z-20">
            {carouselEvents.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
