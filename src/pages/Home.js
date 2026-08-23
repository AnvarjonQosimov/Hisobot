import React from 'react';
import "../styles/Home.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiArrowRight, FiActivity, FiUsers, FiGlobe, FiCloud, FiPieChart, FiBriefcase } from "react-icons/fi";

function Home() {
  const { t } = useTranslation();

  const features = [
    { icon: <FiActivity />, title: t("Expense Tracking"), desc: t("Track every penny with advanced expense management tools.") },
    { icon: <FiUsers />, title: t("Worker Management"), desc: t("Full control over worker payments, history, and status.") },
    { icon: <FiCloud />, title: t("Real-time Sync"), desc: t("Your data is safe and synced across all devices via Firebase.") },
    { icon: <FiGlobe />, title: t("Multilingual"), desc: t("Seamlessly switch between Uzbek, Russian, and English.") },
    { icon: <FiPieChart />, title: t("Financial Stats"), desc: t("Visualize your progress with dynamic charts and reports.") },
    { icon: <FiBriefcase />, title: t("Project Management"), desc: t("Dedicated tools for construction and office project tracking.") }
  ];

  return (
    <div className='Home'>
      {/* Hero Section */}
      <section className='hero'>
        <div className='hero-overlay'></div>
        <div className='hero-content'>
          <div className='badge'>{t("Premium Management Tool")}</div>
          <h1>Office<span>Report</span></h1>
          <p>{t("The ultimate solution for managing construction projects, office expenses, and worker reports in one place.")}</p>
          <div className='hero-btns'>
            <Link to="/login" className='primary-btn'>
              {t("Get Started")} <FiArrowRight />
            </Link>
            <a href="#features" className='secondary-btn'>{t("Learn More")}</a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className='features'>
        <div className='section-header'>
          <h2>{t("Core Features")}</h2>
          <div className='underline'></div>
        </div>
        <div className='features-grid'>
          {features.map((f, i) => (
            <div className='feature-card' key={i}>
              <div className='feature-icon'>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className='stats-preview'>
        <div className='stats-content'>
          <h2>{t("Professional Financial Control")}</h2>
          <p>{t("Manage your balances in multiple currencies and keep track of every transaction with our intuitive dashboard.")}</p>
          <div className='stat-items'>
            <div className='stat-item'>
              <span>99%</span>
              <p>{t("Data Accuracy")}</p>
            </div>
            <div className='stat-item'>
              <span>24/7</span>
              <p>{t("Cloud Access")}</p>
            </div>
            <div className='stat-item'>
              <span>100%</span>
              <p>{t("Secure Storage")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='footer'>
        <div className='footer-content'>
          <div className='footer-brand'>
            <h2>Office<span>Report</span></h2>
            <p>© 2026 OfficeReport. {t("All rights reserved.")}</p>
          </div>
          <div className='footer-links'>
            <Link to="/login">{t("Login")}</Link>
            <Link to="/worker-auth">{t("Worker Cabinet")}</Link>
            <a href="mailto:support@officereport.com">{t("Support")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;