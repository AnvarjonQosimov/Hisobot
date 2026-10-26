import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/AssistantManager.css";
import {
  addAssistant,
  ASSISTANT_SECTIONS,
  ASSISTANT_SECTION_LABELS,
  listAssistants,
  removeAssistant,
  updateAssistant,
} from "../auth/assistantAccess";

function AssistantManager({ bossEmail, onClose }) {
  const { t } = useTranslation();
  const [assistants, setAssistants] = useState([]);
  const [email, setEmail] = useState("");
  const [sections, setSections] = useState([]);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingNextEmail, setEditingNextEmail] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAssistants = async () => {
    setLoading(true);
    setError("");
    try {
      setAssistants(await listAssistants(bossEmail));
    } catch (loadError) {
      console.error("Failed to load assistants:", loadError);
      setError(t("assistant_load_failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssistants();
    // loadAssistants intentionally runs once for the active boss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossEmail]);

  const toggleSection = (section) => {
    setSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addAssistant(bossEmail, email, sections);
      setEmail("");
      setSections([]);
      await loadAssistants();
    } catch (saveError) {
      console.error("Failed to add assistant:", saveError);
      setError(
        saveError?.code
          ? `${t("assistant_save_failed")} (${saveError.code})`
          : t("assistant_save_failed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (assistant) => {
    setEditingEmail(assistant.email);
    setEditingNextEmail(assistant.email);
    setSections(assistant.sections || []);
    setError("");
  };

  const cancelEditing = () => {
    setEditingEmail("");
    setEditingNextEmail("");
    setSections([]);
    setError("");
  };

  const handleUpdate = async () => {
    if (confirmation?.type !== "update") return;
    const assistantEmail = confirmation.email;
    setSaving(true);
    setError("");
    try {
      await updateAssistant(bossEmail, assistantEmail, editingNextEmail, sections);
      setEditingEmail("");
      setEditingNextEmail("");
      setSections([]);
      setConfirmation(null);
      await loadAssistants();
    } catch (saveError) {
      console.error("Failed to update assistant:", saveError);
      setError(
        saveError?.code
          ? `${t("assistant_save_failed")} (${saveError.code})`
          : t("assistant_save_failed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmation?.type !== "delete") return;
    const assistantEmail = confirmation.email;
    setSaving(true);
    setError("");
    try {
      await removeAssistant(bossEmail, assistantEmail);
      setConfirmation(null);
      await loadAssistants();
    } catch (deleteError) {
      console.error("Failed to remove assistant:", deleteError);
      setError(t("assistant_delete_failed"));
    } finally {
      setSaving(false);
    }
  };

  const renderSectionOptions = () => (
    <div className="assistant-section-options">
      {ASSISTANT_SECTIONS.map((section) => (
        <label key={section}>
          <input
            type="checkbox"
            checked={sections.includes(section)}
            onChange={() => toggleSection(section)}
          />
          <span>{t(`assistant_section_${section}`) || ASSISTANT_SECTION_LABELS[section]}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="assistant-overlay" onMouseDown={onClose}>
      <section
        className="assistant-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-manager-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="assistant-dialog-header">
          <div className="assistant-title-icon" aria-hidden="true">+</div>
          <div>
            <h2 id="assistant-manager-title">{t("assistant_manager_title")}</h2>
            <p>{t("assistant_manager_description")}</p>
          </div>
          <button className="assistant-close" type="button" onClick={onClose} aria-label={t("Close")}>
            &times;
          </button>
        </header>
        <form className="assistant-add-form" onSubmit={handleAdd}>
          <label className="assistant-email-label">
            {t("assistant_email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@gmail.com"
              required
            />
          </label>
          <p className="assistant-section-heading">{t("assistant_choose_sections")}</p>
          {renderSectionOptions()}
          <button className="assistant-primary" type="submit" disabled={saving || sections.length === 0}>
            {t("assistant_add")}
          </button>
        </form>

        {error && <p className="assistant-error" role="alert">{error}</p>}
        <div className="assistant-list">
          <div className="assistant-list-header">
            <h3>{t("assistant_list_title")}</h3>
            {!loading && <span className="assistant-count">{assistants.length}</span>}
          </div>
          {loading ? (
            <p>{t("Loading")}</p>
          ) : assistants.length === 0 ? (
            <p>{t("assistant_empty")}</p>
          ) : assistants.map((assistant) => (
            <article className="assistant-row" key={assistant.email}>
              <div className="assistant-row-heading">
                <strong>{assistant.email}</strong>
                <div className="assistant-row-actions">
                  <button className="assistant-edit-button" type="button" onClick={() => startEditing(assistant)} disabled={saving}>
                    {t("Edit")}
                  </button>
                  <button
                    type="button"
                    className="assistant-danger"
                    onClick={() => setConfirmation({ type: "delete", email: assistant.email })}
                    disabled={saving}
                  >
                    {t("Delete")}
                  </button>
                </div>
              </div>
              <p className="assistant-grants">
                {(assistant.sections || [])
                  .map((section) => t(`assistant_section_${section}`) || ASSISTANT_SECTION_LABELS[section])
                  .join(", ")}
              </p>
            </article>
          ))}
        </div>
      </section>

      {editingEmail && (
        <div
          className="assistant-edit-overlay"
          role="presentation"
          onMouseDown={() => {
            if (!saving && !confirmation) cancelEditing();
          }}
        >
          <section
            className="assistant-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assistant-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="assistant-edit-header">
              <div className="assistant-title-icon" aria-hidden="true">&#9998;</div>
              <div>
                <h3 id="assistant-edit-title">{t("assistant_edit_title")}</h3>
                <p>{editingEmail}</p>
              </div>
              <button
                className="assistant-close"
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                aria-label={t("Close")}
              >
                &times;
              </button>
            </header>
            <form
              className="assistant-edit-form"
              onSubmit={(event) => {
                event.preventDefault();
                setConfirmation({ type: "update", email: editingEmail });
              }}
            >
              <label className="assistant-email-label">
                {t("assistant_new_email")}
                <input
                  type="email"
                  value={editingNextEmail}
                  onChange={(event) => setEditingNextEmail(event.target.value)}
                  required
                />
              </label>
              <div className="assistant-edit-sections">
                <p className="assistant-section-heading">{t("assistant_choose_sections")}</p>
                {renderSectionOptions()}
              </div>
              {error && <p className="assistant-error" role="alert">{error}</p>}
              <div className="assistant-edit-actions">
                <button type="button" onClick={cancelEditing} disabled={saving}>
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  className="assistant-primary"
                  disabled={saving || sections.length === 0}
                >
                  {t("Save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {confirmation && (
        <div
          className="assistant-confirm-overlay"
          role="presentation"
          onMouseDown={() => {
            if (!saving) {
              setConfirmation(null);
              setError("");
            }
          }}
        >
          <section
            className="assistant-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="assistant-confirm-title"
            aria-describedby="assistant-confirm-message"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={`assistant-confirm-icon ${confirmation.type === "delete" ? "is-danger" : ""}`} aria-hidden="true">
              {confirmation.type === "delete" ? "!" : "?"}
            </div>
            <h3 id="assistant-confirm-title">
              {confirmation.type === "delete"
                ? t("assistant_delete_confirm_title")
                : t("assistant_update_confirm_title")}
            </h3>
            <p id="assistant-confirm-message">
              {confirmation.type === "delete"
                ? t("assistant_delete_prompt", { email: confirmation.email })
                : t("assistant_confirm_update")}
            </p>
            {error && <p className="assistant-error" role="alert">{error}</p>}
            <div className="assistant-confirm-actions">
              <button
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  setError("");
                }}
                disabled={saving}
              >
                {t("Cancel")}
              </button>
              {confirmation.type === "delete" ? (
                <button
                  type="button"
                  className="assistant-danger"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {t("Delete")}
                </button>
              ) : (
                <button
                  type="button"
                  className="assistant-primary"
                  onClick={handleUpdate}
                  disabled={saving}
                >
                  {t("Save")}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AssistantManager;
