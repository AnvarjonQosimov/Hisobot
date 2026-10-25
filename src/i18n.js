import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import trasUZ from "./lang/uz.json"
import trasEng from "./lang/en.json"
import trasRU from "./lang/ru.json"

const resources = {
  uz: {
    translation: trasUZ,
  },
  en: {
    translation: trasEng,
  },
  ru: {
    translation: trasRU,
  },
}

const savedLanguage = localStorage.getItem("appLanguage");

i18n.use(initReactI18next).init({
    resources,
    lng: ["uz", "ru", "en"].includes(savedLanguage) ? savedLanguage : "uz",
    fallbackLng: "en",

    interpolation: {
      escapeValue: false
    },
  });

  i18n.on("languageChanged", (language) => {
    localStorage.setItem("appLanguage", language);
  });

  export default i18n;