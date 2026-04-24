import React from "react";
import "../styles/Profil.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import PersonFace from "../images/personFace.jpg";
import { GrFormPrevious, GrEdit } from "react-icons/gr";
import { useState, useEffect } from "react";

function Profil() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
    itemIndex: null
  });

  const { t } = useTranslation();

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      setNewUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    const storedPassword = localStorage.getItem("password");
    if (storedPassword) {
      setPassword(storedPassword);
      setNewPassword(storedPassword);
    }
  }, []);

  const handleEdit = (field) => {
    if (field === 'username') {
      setIsEditingUsername(true);
    } else if (field === 'password') {
      setIsEditingPassword(true);
    }
  };

  const handleSave = (field) => {
    if (field === 'username') {
      setConfirmDialog({
        isOpen: true,
        message: t('save_changes_username'),
        onConfirm: () => {
          localStorage.setItem("username", newUsername);
          setUsername(newUsername);
          setIsEditingUsername(false);
          setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
        }
      });
    } else if (field === 'password') {
      setConfirmDialog({
        isOpen: true,
        message: t('save_changes_password'),
        onConfirm: () => {
          localStorage.setItem("password", newPassword);
          setPassword(newPassword);
          setIsEditingPassword(false);
          setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
        }
      });
    }
  };

  const handleCancel = (field) => {
    if (field === 'username') {
      setNewUsername(username);
      setIsEditingUsername(false);
    } else if (field === 'password') {
      setNewPassword(password);
      setIsEditingPassword(false);
    }
  };

  const handleConfirmCancel = () => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
  };
  return (
    <div className="Profil">
      <div className="prevBtn">
        <Link to="/hisobot">
          <GrFormPrevious /> {t("ortga")}
        </Link>
      </div>
      <div className="profileText">
        {t("profil")}
      </div>
      <div className="profilCard">
        <div className="image">
          <img src={PersonFace} alt="profilImage" />
        </div>
        <div className="profilInfo">
          <div className="nameProfil">
            <h3>{t("username_label")}:</h3>
            <div className="nameLine"></div>
            {isEditingUsername ? (
              <div className="editContainer">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="editInput"
                  placeholder={t("enter_new_username")}
                />
                <div className="editButtons">
                  <button className="btn-save" onClick={() => handleSave('username')}>
                    {t("saqlash_btn")}
                  </button>
                  <button className="btn-cancel" onClick={() => handleCancel('username')}>
                    {t("bekor_qilish_btn")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="displayContainer">
                <h3>{username}</h3>
                <button className="btn-edit-inline" onClick={() => handleEdit('username')}>
                  <GrEdit />
                </button>
              </div>
            )}
          </div>
          <div className="passwordProfil">
            <h3>{t("password_label")}:</h3>
            <div className="passwordLine"></div>
            {isEditingPassword ? (
              <div className="editContainer">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="editInput"
                  placeholder={t("enter_new_password")}
                />
                <div className="editButtons">
                  <button className="btn-save" onClick={() => handleSave('password')}>
                    {t("saqlash_btn")}
                  </button>
                  <button className="btn-cancel" onClick={() => handleCancel('password')}>
                    {t("bekor_qilish_btn")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="displayContainer">
                <h3>{password}</h3>
                <button className="btn-edit-inline" onClick={() => handleEdit('password')}>
                  <GrEdit />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Dialog for Save */}
      {confirmDialog.isOpen && (
        <div className="confirm-overlay" onClick={handleConfirmCancel}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-message">{confirmDialog.message}</div>
            <div className="confirm-buttons">
              <button 
                className="confirm-btn confirm-cancel"
                onClick={handleConfirmCancel}
              >
                {t("bekor_qilish_btn")}
              </button>
              <button 
                className="confirm-btn confirm-save"
                onClick={confirmDialog.onConfirm}
              >
                {t("saqlash_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profil;