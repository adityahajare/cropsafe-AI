import React from "react";

interface LanguageSelectorProps {
  onSelect: (lang: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onSelect,
}) => {
  const languages = [
    { code: "marathi", name: "मराठी", flag: "🇮🇳" },
    { code: "hindi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "english", name: "English", flag: "🇬🇧" },
  ];

  return (
    <div className="language-selector">
      <div className="language-card">
        {/* HEADER */}
        <div className="language-header">
          <span className="lang-icon">🌐</span>
          <h2>Select Your Language</h2>
          <p>आपली भाषा निवडा | अपनी भाषा चुनें</p>
        </div>

        {/* GRID */}
        <div className="language-grid">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className="language-btn"
              onClick={() => onSelect(lang.code)}
              aria-label={`Select ${lang.name}`}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-name">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;