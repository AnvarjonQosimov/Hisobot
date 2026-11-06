import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../Firebase/Firebase";
import { mergeBossSectionSnapshot } from "./assistantSnapshots";

export const getWorkerDataId = (bossEmail, workerId) =>
  encodeURIComponent(`${bossEmail.toLowerCase()}:${String(workerId)}`);

export const getWorkerInviteCodeId = (bossEmail, code) =>
  encodeURIComponent(`${bossEmail.trim().toLowerCase()}:${code.trim()}`);

export const deleteWorkerRelatedData = async (
  bossEmail,
  workerId,
  { workerCode, workers, workerObjects } = {},
) => {
  const user = auth.currentUser;
  const normalizedBossEmail = bossEmail.trim().toLowerCase();
  if (!user || user.email?.toLowerCase() !== normalizedBossEmail) {
    throw new Error("Only the cabinet owner can delete worker data.");
  }
  if (workerId === undefined || workerId === null) {
    throw new Error("Cannot delete worker data without a worker ID.");
  }

  if (Array.isArray(workers) || Array.isArray(workerObjects)) {
    await mergeBossSectionSnapshot(normalizedBossEmail, "workers", {
      ...(Array.isArray(workers) && { workers }),
      ...(Array.isArray(workerObjects) && { workerObjects }),
    });
  }

  const workerIdValues = [...new Set([workerId, String(workerId)])];
  const references = new Map();
  if (workerCode?.trim()) {
    const inviteCodeIds = new Set([
      getWorkerInviteCodeId(normalizedBossEmail, workerCode),
      workerCode.trim(),
    ]);
    for (const inviteCodeId of inviteCodeIds) {
      try {
        const inviteCode = await getDoc(doc(db, "inviteCodes", inviteCodeId));
        const data = inviteCode.data();
        if (
          inviteCode.exists() &&
          data.bossEmail?.toLowerCase() === normalizedBossEmail &&
          String(data.workerId) === String(workerId)
        ) {
          references.set(inviteCode.ref.path, inviteCode.ref);
        }
      } catch (error) {
        console.error("Could not read worker invite code while deleting worker:", error);
        throw new Error(
          `Could not read worker invite code while deleting worker (${error.code || "unknown"}).`,
        );
      }
    }

    const inviteReferences = [...references.values()];
    if (inviteReferences.length) {
      const batch = writeBatch(db);
      inviteReferences.forEach((reference) => batch.delete(reference));
      try {
        await batch.commit();
      } catch (error) {
        console.error("Could not release worker invite code:", error);
        throw new Error(
          `Could not release worker invite code (${error.code || "unknown"}).`,
        );
      }
      inviteReferences.forEach((reference) => references.delete(reference.path));
    }
  }

  const queryReads = [
    ...workerIdValues.map((id) => ({
      label: "worker report data",
      request: query(
        collection(db, "workerData"),
        where("ownerEmail", "==", normalizedBossEmail),
        where("ownerUid", "==", user.uid),
        where("workerId", "==", id),
      ),
    })),
    {
      label: "registered face photos",
      request: query(
      collection(db, "attendanceFaces"),
      where("bossEmail", "==", normalizedBossEmail),
      where("ownerEmail", "==", normalizedBossEmail),
      where("workerId", "==", String(workerId)),
      ),
    },
    ...workerIdValues.map((id) => ({
      label: "attendance records",
      request: query(
        collection(db, "attendanceRecords"),
        where("bossEmail", "==", normalizedBossEmail),
        where("ownerEmail", "==", normalizedBossEmail),
        where("workerId", "==", id),
      ),
    })),
  ];
  const queryResults = await Promise.allSettled(
    queryReads.map(async ({ label, request }) => {
      try {
        return await getDocs(request);
      } catch (error) {
        console.error(`Could not read ${label} while deleting worker:`, error);
        throw new Error(
          `Could not read ${label} while deleting worker (${error.code || "unknown"}).`,
        );
      }
    }),
  );
  const cleanupErrors = [];
  queryResults.forEach((result) => {
    if (result.status === "rejected") {
      cleanupErrors.push(result.reason.message);
      return;
    }
    result.value.docs.forEach((workerDocument) => {
      references.set(workerDocument.ref.path, workerDocument.ref);
    });
  });

  const documents = [...references.values()];
  for (let index = 0; index < documents.length; index += 450) {
    const batch = writeBatch(db);
    documents.slice(index, index + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
  if (cleanupErrors.length) {
    throw new Error(`Some worker data could not be deleted: ${cleanupErrors.join("; ")}`);
  }
};

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
      try {
        await setDoc(doc(db, "inviteCodes", getWorkerInviteCodeId(bossEmail, code)), {
          bossEmail: bossEmail.toLowerCase(),
          workerId: worker.id,
          inviteCode: code,
          ownerEmail: bossEmail.toLowerCase(),
          ownerUid: auth.currentUser.uid,
        });
      } catch (error) {
        console.error("Could not save an attendance worker invite code:", error);
        throw new Error(`Invite code save failed for ${worker.workerName || worker.id}: ${error.message}`);
      }
      try {
        await saveAttendanceWorkerData(bossEmail, worker);
      } catch (error) {
        console.error("Could not save attendance worker data:", error);
        throw new Error(`Worker data save failed for ${worker.workerName || worker.id}: ${error.message}`);
      }
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
