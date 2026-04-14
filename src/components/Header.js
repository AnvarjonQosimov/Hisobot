import React from "react";
import "../styles/Header.css";
import FormControl from "@mui/material/FormControl";
import { TbReportSearch } from "react-icons/tb";
import { useTranslation } from "react-i18next";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { Link, NavLink } from "react-router-dom";
import { useRef, useState, useEffect } from "react";

function Header() {
  const [age, setAge] = React.useState("uz");
  const { t, i18n } = useTranslation();

  const handleChange = (event) => {
    const lang = String(event.target.value);
    setAge(lang);
    i18n.changeLanguage(lang);
  };

  const menuRef = useRef(null);
  const [burgerOpen, setBurgerOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setBurgerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="Header">
      <div className="logo">
        <div className="imgLogo">
          <i>
            <TbReportSearch />
          </i>
        </div>
        <div className="textLogo">
          <h1>OfficeReport</h1>
        </div>
      </div>

      <div className="menu">
        <ul>
          <Link to="/">
            <li>{t("Home")}</li>
          </Link>
          <Link to="/calculator">
            <li>{t("Kalkulator")}</li>
          </Link>
        </ul>
      </div>

      <div className="burger-wrapper" ref={menuRef}>
        <button
          className={`burger ${burgerOpen ? "active" : ""}`}
          onClick={() => setBurgerOpen(!burgerOpen)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`burger-dropdown ${burgerOpen ? "show" : ""}`}>
          <NavLink
            to="/"
            onClick={() => setBurgerOpen(false)}
            className="menu-link"
          >
            {t("Home")}
          </NavLink>

          <NavLink
            to="/calculator"
            onClick={() => setBurgerOpen(false)}
            className="menu-link"
          >
            {t("Kalkulator")}
          </NavLink>
        </div>
      </div>

      <div className="translator">
        <FormControl sx={{ m: 1, minWidth: 80 }} size="small">
          <InputLabel id="demo-select-small-label">{t("lang")}</InputLabel>
          <Select
            id="demo-select-small"
            value={age}
            label="Age"
            onChange={handleChange}
          >
            <MenuItem value={"uz"}>UZ</MenuItem>
            <MenuItem value={"en"}>EN</MenuItem>
            <MenuItem value={"ru"}>РУ</MenuItem>
          </Select>
        </FormControl>
      </div>
    </div>
  );
}

export default Header;
