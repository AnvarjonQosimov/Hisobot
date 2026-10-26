import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../Firebase/Firebase";

export const ASSISTANT_SECTIONS = ["workers", "office", "construction"];

export const ASSISTANT_SECTION_LABELS = {
  workers: "Ishchilar hisoboti",
  office: "O'fis Xarajatlari",
  construction: "Qurilish Xarajatlari",
};

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const getAssistantAccess = async (email = auth.currentUser?.email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const assistantSnapshot = await getDoc(doc(db, "assistants", normalizedEmail));
  if (!assistantSnapshot.exists()) return null;

  const assistant = assistantSnapshot.data();
  const bossEmail = normalizeEmail(assistant.bossEmail);
  const sections = Array.isArray(assistant.sections)
    ? assistant.sections.filter((section) => ASSISTANT_SECTIONS.includes(section))
    : [];

  if (!bossEmail || sections.length === 0) return null;
  return { assistant: true, bossEmail, sections };
};

const requireBoss = (bossEmail) => {
  const user = auth.currentUser;
  const normalizedBossEmail = normalizeEmail(bossEmail);
  if (
    !user?.email ||
    normalizeEmail(user.email) !== normalizedBossEmail
  ) {
    throw new Error("Only the cabinet owner can manage assistants.");
  }
  return normalizedBossEmail;
};

export const listAssistants = async (bossEmail) => {
  const normalizedBossEmail = requireBoss(bossEmail);
  const snapshot = await getDocs(
    query(
      collection(db, "assistants"),
      where("bossEmail", "==", normalizedBossEmail),
    ),
  );
  return snapshot.docs.map((assistantDocument) => ({
    email: assistantDocument.id,
    ...assistantDocument.data(),
  }));
};

export const addAssistant = async (bossEmail, email, sections) => {
  const normalizedBossEmail = requireBoss(bossEmail);
  const normalizedEmail = normalizeEmail(email);
  const normalizedSections = [...new Set(sections)].filter((section) =>
    ASSISTANT_SECTIONS.includes(section),
  );

  if (!normalizedEmail.includes("@")) {
    throw new Error("Enter a valid assistant email.");
  }
  if (normalizedEmail === normalizedBossEmail) {
    throw new Error("The cabinet owner cannot be added as an assistant.");
  }
  if (normalizedSections.length === 0) {
    throw new Error("Select at least one section.");
  }

  const existingAssistants = await listAssistants(normalizedBossEmail);
  if (existingAssistants.some((assistant) => assistant.email === normalizedEmail)) {
    throw new Error("An assistant with this email already exists.");
  }

  const assistantRef = doc(db, "assistants", normalizedEmail);
  await setDoc(assistantRef, {
    email: normalizedEmail,
    bossEmail: normalizedBossEmail,
    sections: normalizedSections,
    createdAt: new Date().toISOString(),
  });
};

export const updateAssistant = async (bossEmail, email, nextEmail, sections) => {
  const normalizedBossEmail = requireBoss(bossEmail);
  const normalizedEmail = normalizeEmail(email);
  const normalizedNextEmail = normalizeEmail(nextEmail);
  const normalizedSections = [...new Set(sections)].filter((section) =>
    ASSISTANT_SECTIONS.includes(section),
  );
  if (!normalizedNextEmail.includes("@")) {
    throw new Error("Enter a valid assistant email.");
  }
  if (normalizedNextEmail === normalizedBossEmail) {
    throw new Error("The cabinet owner cannot be an assistant.");
  }
  if (normalizedSections.length === 0) {
    throw new Error("Select at least one section.");
  }

  const assistantRef = doc(db, "assistants", normalizedEmail);
  const existing = await getDoc(assistantRef);
  if (!existing.exists() || normalizeEmail(existing.data().bossEmail) !== normalizedBossEmail) {
    throw new Error("Assistant was not found in this cabinet.");
  }
  const updatedAssistant = {
    ...existing.data(),
    email: normalizedNextEmail,
    sections: normalizedSections,
    updatedAt: new Date().toISOString(),
  };

  if (normalizedNextEmail === normalizedEmail) {
    await updateDoc(assistantRef, updatedAssistant);
    return;
  }

  const existingAssistants = await listAssistants(normalizedBossEmail);
  if (existingAssistants.some((assistant) => assistant.email === normalizedNextEmail)) {
    throw new Error("An assistant with this email already exists.");
  }
  const batch = writeBatch(db);
  batch.set(doc(db, "assistants", normalizedNextEmail), updatedAssistant);
  batch.delete(assistantRef);
  await batch.commit();
};

export const removeAssistant = async (bossEmail, email) => {
  const normalizedBossEmail = requireBoss(bossEmail);
  const normalizedEmail = normalizeEmail(email);
  const assistantRef = doc(db, "assistants", normalizedEmail);
  const existing = await getDoc(assistantRef);
  if (!existing.exists() || normalizeEmail(existing.data().bossEmail) !== normalizedBossEmail) {
    throw new Error("Assistant was not found in this cabinet.");
  }
  await deleteDoc(assistantRef);
};
