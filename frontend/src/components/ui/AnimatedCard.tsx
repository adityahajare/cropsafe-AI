import React from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
  hover?: boolean;
}

export default function AnimatedCard({
  children,
  className = "",
  onClick,
  delay = 0,
  hover = true,
}: AnimatedCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 
        transition-all duration-200
        ${hover ? "hover:shadow-md hover:-translate-y-0.5" : ""}
        active:scale-[0.98] cursor-pointer
        animate-slide-up
        ${className}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
