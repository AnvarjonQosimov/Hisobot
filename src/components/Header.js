import React, { useRef, useState, useEffect } from "react";
import "../styles/Header.css";
import { TbReportSearch } from "react-icons/tb";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FiMenu, FiX, FiGlobe } from "react-icons/fi";

function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  const dashboardPaths = ["/hisobot", "/officexarajat", "/workerdashboard", "/profil", "/worker-auth"];
  const isDashboard = dashboardPaths.includes(location.pathname);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isDashboard) return null;

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setBurgerOpen(false);
  };

  return (
    <header className={`Header ${scrolled ? "scrolled" : ""}`}>
      <div className="header-container">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <TbReportSearch />
          </div>
          <div className="logo-text">
            <h1>Office<span>Report</span></h1>
          </div>
        </Link>

        <nav className="nav-menu">
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            {t("Home")}
          </NavLink>
          <NavLink to="/calculator" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            {t("Kalkulator")}
          </NavLink>
          <Link to="/login" className="login-btn-header">
            {t("Login")}
          </Link>
        </nav>

        <div className="header-actions">
          <div className="lang-switcher">
            <FiGlobe className="globe-icon" />
            <select value={i18n.language} onChange={(e) => changeLanguage(e.target.value)}>
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </div>

          <button className="mobile-toggle" onClick={() => setBurgerOpen(!burgerOpen)}>
            {burgerOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-nav ${burgerOpen ? "open" : ""}`} ref={menuRef}>
        <button className="mobile-nav-close" onClick={() => setBurgerOpen(false)}>
          <FiX />
        </button>
        <NavLink to="/" onClick={() => setBurgerOpen(false)}>{t("Home")}</NavLink>
        <NavLink to="/calculator" onClick={() => setBurgerOpen(false)}>{t("Kalkulator")}</NavLink>
        <Link to="/login" onClick={() => setBurgerOpen(false)} className="mobile-login">{t("Login")}</Link>
        
        <div className="mobile-lang">
          <button 
            type="button"
            onClick={() => changeLanguage("uz")} 
            className={i18n.language === "uz" ? "active" : ""}
            style={{
              background: i18n.language === "uz" ? "linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)" : "rgba(255, 255, 255, 0.08)",
              border: i18n.language === "uz" ? "1.5px solid rgba(99, 102, 241, 0.6)" : "1.5px solid rgba(255, 255, 255, 0.15)",
              color: i18n.language === "uz" ? "white" : "rgba(204, 194, 255, 0.6)",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
              flex: "1",
              minWidth: "60px",
              boxSizing: "border-box",
              boxShadow: i18n.language === "uz" ? "0 4px 15px rgba(99, 102, 241, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2)" : "none"
            }}
          >
            UZ
          </button>
          <button 
            type="button"
            onClick={() => changeLanguage("ru")} 
            className={i18n.language === "ru" ? "active" : ""}
            style={{
              background: i18n.language === "ru" ? "linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)" : "rgba(255, 255, 255, 0.08)",
              border: i18n.language === "ru" ? "1.5px solid rgba(99, 102, 241, 0.6)" : "1.5px solid rgba(255, 255, 255, 0.15)",
              color: i18n.language === "ru" ? "white" : "rgba(204, 194, 255, 0.6)",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
              flex: "1",
              minWidth: "60px",
              boxSizing: "border-box",
              boxShadow: i18n.language === "ru" ? "0 4px 15px rgba(99, 102, 241, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2)" : "none"
            }}
          >
            RU
          </button>
          <button 
            type="button"
            onClick={() => changeLanguage("en")} 
            className={i18n.language === "en" ? "active" : ""}
            style={{
              background: i18n.language === "en" ? "linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)" : "rgba(255, 255, 255, 0.08)",
              border: i18n.language === "en" ? "1.5px solid rgba(99, 102, 241, 0.6)" : "1.5px solid rgba(255, 255, 255, 0.15)",
              color: i18n.language === "en" ? "white" : "rgba(204, 194, 255, 0.6)",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
              flex: "1",
              minWidth: "60px",
              boxSizing: "border-box",
              boxShadow: i18n.language === "en" ? "0 4px 15px rgba(99, 102, 241, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2)" : "none"
            }}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
