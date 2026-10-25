import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../Firebase/Firebase";

export const getWorkerDataId = (bossEmail, workerId) =>
  encodeURIComponent(`${bossEmail.toLowerCase()}:${String(workerId)}`);

export const saveBossCabinet = async (bossEmail, data) => {
  const user = auth.currentUser;
  const ownerEmail = user?.email?.toLowerCase();
  const normalizedBossEmail = bossEmail.toLowerCase();

  if (!user || ownerEmail !== normalizedBossEmail) {
    throw new Error("The signed-in account does not own this cabinet.");
  }

  await setDoc(
    doc(db, "cabinets", normalizedBossEmail),
    {
      ...data,
      ownerEmail,
      ownerUid: user.uid,
    },
    { merge: true },
  );

  if (Array.isArray(data.workers)) {
    await syncBossWorkerData(user, ownerEmail, data.workers);
  }
};

const syncBossWorkerData = async (user, ownerEmail, workers) => {
  const currentWorkers = new Map();
  workers.forEach((worker) => {
    if (worker?.id === undefined || worker?.id === null) {
      throw new Error("A worker record is missing its ID.");
    }
    currentWorkers.set(String(worker.id), worker);
  });

  const existingSnapshot = await getDocs(
    query(
      collection(db, "workerData"),
      where("ownerEmail", "==", ownerEmail),
      where("ownerUid", "==", user.uid),
    ),
  );
  const existingById = new Map(
    existingSnapshot.docs.map((workerDoc) => [
      workerDoc.id,
      workerDoc.data(),
    ]),
  );
  const changes = [];

  currentWorkers.forEach((worker, workerId) => {
    const id = getWorkerDataId(ownerEmail, workerId);
    const workerData = { ...worker };
    delete workerData.workerCode;
    const workerDocument = {
      bossEmail: ownerEmail,
      ownerEmail,
      ownerUid: user.uid,
      workerId: worker.id,
      worker: workerData,
    };

    if (JSON.stringify(existingById.get(id)?.worker) !== JSON.stringify(workerData)) {
      changes.push({
        type: "set",
        reference: doc(db, "workerData", id),
        data: workerDocument,
      });
    }
    existingById.delete(id);
  });

  existingById.forEach((_, id) => {
    changes.push({ type: "delete", reference: doc(db, "workerData", id) });
  });

  for (let index = 0; index < changes.length; index += 450) {
    const batch = writeBatch(db);
    changes.slice(index, index + 450).forEach((change) => {
      if (change.type === "delete") {
        batch.delete(change.reference);
      } else {
        batch.set(change.reference, change.data);
      }
    });
    await batch.commit();
  }
};
