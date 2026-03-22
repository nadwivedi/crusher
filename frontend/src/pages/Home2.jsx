import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const homeCards = [
  {
    title: 'Manage Party',
    image: '/home icons/ChatGPT Image Mar 22, 2026, 12_27_17 PM-Photoroom.png',
    path: '/party'
  },
  {
    title: 'Manage Sales',
    image: '/home icons/ChatGPT Image Mar 22, 2026, 12_27_19 PM-Photoroom.png',
    path: '/sales'
  },
  {
    title: 'Manage Purchase',
    image: '/home icons/ChatGPT Image Mar 22, 2026, 12_27_21 PM-Photoroom.png',
    path: '/purchases'
  },
  {
    title: 'Manage Expense',
    image: '/home icons/ChatGPT Image Mar 22, 2026, 12_27_23 PM-Photoroom.png',
    path: '/expenses'
  }
];

export default function Home2() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % homeCards.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + homeCards.length) % homeCards.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        navigate(homeCards[activeIndex].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_22%),linear-gradient(180deg,#e0f2fe_0%,#f8fafc_38%,#ecfeff_100%)] px-1 py-8 md:px-8">
      <div className="mx-auto flex max-w-7xl justify-center">
        <div className="w-full max-w-[24rem] rounded-[32px] border border-white/70 bg-white/78 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur md:max-w-[21rem] md:p-6">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1 md:justify-items-center md:gap-3">
          {homeCards.map((card, index) => (
            <button
              key={card.title}
              type="button"
              onClick={() => navigate(card.path)}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              className={`group relative text-left transition duration-300 hover:-translate-y-1 md:w-full md:max-w-[17.5rem] ${
                activeIndex === index ? 'z-10' : ''
              }`}
            >
              <div className={`${activeIndex === index ? 'rounded-[24px] md:ring-4 md:ring-sky-300/80' : ''}`}>
                <img
                  src={card.image}
                  alt={card.title}
                  className="block w-full rounded-[20px] transition duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
