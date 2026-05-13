import { useState } from "react";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
  { code: "mr", label: "मराठी", flag: "🇮🇳" },
];

export default function LanguageSwitcher() {
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const next = (current + 1) % languages.length;
    setCurrent(next);
    localStorage.setItem("lang", languages[next].code);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm text-white transition-colors"
    >
      <span>{languages[current].flag}</span>
      <span>{languages[current].label}</span>
    </button>
  );
}
