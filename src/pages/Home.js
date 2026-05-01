import React from 'react'
import "../styles/Home.css"
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function Home() {
  const { t } = useTranslation();
  return (
    <div className='Home'>
      <div className='background-icons'>
        <div className='icon icon-book'>📚</div>
        <div className='icon icon-pencil'>✏️</div>
        <div className='icon icon-lightbulb'>💡</div>
        <div className='icon icon-graduation'>🎓</div>
        <div className='icon icon-brain'>🧠</div>
        <div className='icon icon-star'>⭐</div>
        <div className='icon icon-keyboard'>⌨️</div>
        <div className='icon icon-calculator'>🧮</div>
        <div className='icon icon-globe'>🌍</div>
        <div className='icon icon-palette'>🎨</div>
        <div className='icon icon-microscope'>🔬</div>
        <div className='icon icon-chart'>📊</div>
        <div className='icon icon-computer'>💻</div>
        <div className='icon icon-notebook'>📓</div>
        <div className='icon icon-rocket'>🚀</div>
      </div>
      <div className='content'>
        <h1>OfficeReport</h1>
        <Link to="/login"><button>{t("Start")}</button></Link>
      </div>
    </div>
  )
}

export default Home