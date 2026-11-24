import React from 'react';
import { NavLink } from 'react-router-dom';
import { Images, PlusCircle, MapPin } from 'lucide-react';

export const BottomNav: React.FC = () => {
  // ナビゲーションのアイテム定義
  const navItems = [
    { to: '/', label: 'アルバム', icon: Images },
    { to: '/new', label: '追加', icon: PlusCircle, highlight: true },
    { to: '/map', label: '地図', icon: MapPin },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-paper-100/90 backdrop-blur-md border-t border-paper-200/80 px-4 py-2 pb-safe shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-amber-800 font-medium scale-105'
                    : 'text-stone-500 hover:text-stone-700'
                } ${item.highlight ? 'relative -top-2' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {item.highlight ? (
                    <div className="bg-amber-700 text-white p-3 rounded-full shadow-md hover:bg-amber-800 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                  ) : (
                    <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  )}
                  <span className={`text-[11px] mt-0.5 ${item.highlight ? 'text-amber-900 font-medium' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
