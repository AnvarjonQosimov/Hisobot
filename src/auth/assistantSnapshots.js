import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../Firebase/Firebase";
import { normalizeEmail } from "./assistantAccess";

const getSnapshotId = (bossEmail, section, contextId = "root") =>
  encodeURIComponent(`${normalizeEmail(bossEmail)}:${section}:${contextId}`);

export const saveBossSectionSnapshot = async (
  bossEmail,
  section,
  data,
  contextId,
) => {
  const normalizedBossEmail = normalizeEmail(bossEmail);
  if (normalizeEmail(auth.currentUser?.email) !== normalizedBossEmail) {
    throw new Error("Only the cabinet owner can publish a section snapshot.");
  }

  await setDoc(
    doc(db, "assistantSectionSnapshots", getSnapshotId(normalizedBossEmail, section, contextId)),
    {
      bossEmail: normalizedBossEmail,
      section,
      contextId: String(contextId || "root"),
      data,
      updatedAt: new Date().toISOString(),
    },
  );
};

export const getBossSectionSnapshot = async (bossEmail, section, contextId) => {
  const snapshot = await getDoc(
    doc(db, "assistantSectionSnapshots", getSnapshotId(bossEmail, section, contextId)),
  );
  return snapshot.exists() ? snapshot.data().data : null;
};
