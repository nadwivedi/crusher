import { Star } from 'lucide-react';

export default function TestimonialCard({ quote, name, role, location }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3 flex gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-current" />
        ))}
      </div>
      <blockquote className="mb-4 text-xs sm:text-sm leading-relaxed text-brand-slate">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <footer>
        <strong className="block text-xs sm:text-sm font-semibold text-brand-navy">{name}</strong>
        <span className="text-[0.6875rem] sm:text-xs text-brand-slate/70">
          {role} &middot; {location}
        </span>
      </footer>
    </article>
  );
}
