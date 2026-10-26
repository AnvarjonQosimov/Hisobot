import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../Firebase/Firebase";
import { getAssistantAccess, normalizeEmail } from "./assistantAccess";

export const subscribeAssistantRecords = (
  bossEmail,
  section,
  onData,
  onError,
  contextId,
) => {
  const constraints = [
    where("bossEmail", "==", normalizeEmail(bossEmail)),
    where("section", "==", section),
  ];
  if (contextId !== undefined) constraints.push(where("contextId", "==", String(contextId)));
  const recordsQuery = query(collection(db, "assistantRecords"), ...constraints);
  return onSnapshot(
    recordsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((record) => ({ id: record.id, ...record.data() })));
    },
    onError,
  );
};

export const createAssistantRecord = async (bossEmail, section, contextId, type, payload) => {
  const user = auth.currentUser;
  const email = normalizeEmail(user?.email);
  const assistant = await getAssistantAccess(email);
  if (!assistant || assistant.bossEmail !== normalizeEmail(bossEmail) || !assistant.sections.includes(section)) {
    throw new Error("The assistant is not allowed to add records in this section.");
  }

  await addDoc(collection(db, "assistantRecords"), {
    bossEmail: assistant.bossEmail,
    section,
    contextId: String(contextId),
    type,
    payload,
    title: payload.workerName || payload.name || "",
    details: payload.note || payload.category || "",
    amount: payload.amount || payload.amountPerUnit || "",
    currency: payload.currency || payload.currencyToReceive || "sum",
    date: payload.date || payload.dateToGive || "",
    createdByEmail: email,
    createdByUid: user.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const updateAssistantRecord = async (recordId, type, payload) => {
  await updateDoc(doc(db, "assistantRecords", recordId), {
    type,
    payload,
    title: payload.workerName || payload.name || "",
    details: payload.note || payload.category || "",
    amount: payload.amount || payload.amountPerUnit || "",
    currency: payload.currency || payload.currencyToReceive || "sum",
    date: payload.date || payload.dateToGive || "",
    updatedAt: new Date().toISOString(),
  });
};

export const deleteAssistantRecord = async (recordId) => {
  await deleteDoc(doc(db, "assistantRecords", recordId));
};
