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

export const saveAttendanceWorkerData = async (bossEmail, worker) => {
  const user = auth.currentUser;
  const ownerEmail = user?.email?.toLowerCase();
  const normalizedBossEmail = bossEmail.toLowerCase();
  if (!user || ownerEmail !== normalizedBossEmail) {
    throw new Error("The signed-in account does not own this cabinet.");
  }
  if (worker?.id === undefined || worker?.id === null) {
    throw new Error("An attendance worker is missing its ID.");
  }

  const workerData = { ...worker };
  delete workerData.workerCode;
  workerData.objectWorkHistory = [];
  await setDoc(doc(db, "workerData", getWorkerDataId(normalizedBossEmail, worker.id)), {
    bossEmail: normalizedBossEmail,
    ownerEmail: normalizedBossEmail,
    ownerUid: user.uid,
    workerId: worker.id,
    worker: workerData,
  });
};

export const syncAttendanceWorkerAccess = async (bossEmail, workers) => {
  const workersWithCodes = workers.filter(
    (worker) => worker?.workerCode?.trim() && worker?.id !== undefined && worker?.id !== null,
  );
  const results = await Promise.allSettled(
    workersWithCodes.map(async (worker) => {
      const code = worker.workerCode.trim();
      await setDoc(doc(db, "inviteCodes", code), {
        bossEmail: bossEmail.toLowerCase(),
        workerId: worker.id,
        ownerEmail: bossEmail.toLowerCase(),
        ownerUid: auth.currentUser.uid,
      });
      await saveAttendanceWorkerData(bossEmail, worker);
    }),
  );
  const failures = results
    .map((result, index) => ({ result, worker: workersWithCodes[index] }))
    .filter(({ result }) => result.status === "rejected");

  if (failures.length) {
    throw new Error(
      failures
        .map(({ result, worker }) => `${worker.workerName || worker.id}: ${result.reason.message}`)
        .join("; "),
    );
  }
};

const getProjectHistoryKey = (item) =>
  JSON.stringify([
    item.type,
    item.date,
    item.work,
    item.percent,
    item.amount,
    item.received,
    item.currency,
    item.receivedCurrency,
  ]);

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
    await syncBossWorkerData(
      user,
      ownerEmail,
      data.workers,
      Array.isArray(data.workerObjects) ? data.workerObjects : [],
    );
  }
};

const syncBossWorkerData = async (user, ownerEmail, workers, workerObjects) => {
  const currentWorkers = new Map();
  const objectWorkByWorkerId = new Map();
  const rootWorkerIds = new Set();

  workers.forEach((worker) => {
    if (worker?.id === undefined || worker?.id === null) {
      throw new Error("A worker record is missing its ID.");
    }
    const workerId = String(worker.id);
    currentWorkers.set(workerId, worker);
    rootWorkerIds.add(workerId);
  });

  workerObjects.forEach((workerObject) => {
    if (!Array.isArray(workerObject.workers)) return;

    workerObject.workers.forEach((worker) => {
      if (worker?.id === undefined || worker?.id === null) {
        throw new Error("A worker object record is missing its worker ID.");
      }

      const workerId = String(worker.id);
      if (!currentWorkers.has(workerId)) currentWorkers.set(workerId, worker);

      const rootHistoryKeys = new Set(
        rootWorkerIds.has(workerId)
          ? (currentWorkers.get(workerId).history || [])
              .filter((item) => item.type === "project_completed" || item.type === "archived")
              .map(getProjectHistoryKey)
          : [],
      );
      const objectWork = [
        ...(Array.isArray(worker.history) ? worker.history : [])
          .filter(
            (item) =>
              (item.type === "project_completed" || item.type === "archived") &&
              (item.objectName || !rootHistoryKeys.has(getProjectHistoryKey(item))),
          )
          .map((item) => ({
            ...item,
            objectName: item.objectName || workerObject.name,
          })),
        ...(worker.currentWork
          ? [{
              work: worker.currentWork,
              percent: worker.workPercent || "0%",
              objectName: workerObject.name,
              type: "current",
              isCurrent: true,
            }]
          : []),
      ];

      objectWorkByWorkerId.set(workerId, [
        ...(objectWorkByWorkerId.get(workerId) || []),
        ...objectWork,
      ]);
    });
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
    workerData.objectWorkHistory = objectWorkByWorkerId.get(workerId) || [];
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
