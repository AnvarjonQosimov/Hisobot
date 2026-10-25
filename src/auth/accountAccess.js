import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../Firebase/Firebase";

export const ADMIN_EMAIL = "anvarqosimov153@gmail.com";
export const LEGACY_ADMIN_EMAIL = "archoltinnisbatarch@gmail.com";

export const isAdminEmail = (email) => email?.toLowerCase() === ADMIN_EMAIL;

export const checkAccountAccess = async () => {
  const email = auth.currentUser?.email?.toLowerCase();
  if (email === ADMIN_EMAIL) {
    return { allowed: true, admin: true };
  }
  if (email === LEGACY_ADMIN_EMAIL) {
    return { allowed: true, admin: false };
  }
  if (!email) return { allowed: false, admin: false };
  const account = await getDoc(doc(db, "managedAccounts", email));
  return { allowed: account.exists(), admin: false };
};

export const getAdminDashboard = async () => {
  if (!isAdminEmail(auth.currentUser?.email || "")) {
    throw new Error("Только администратор может просматривать эту панель.");
  }

  const [accountsSnapshot, usersSnapshot, workersSnapshot] = await Promise.all([
    getDocs(collection(db, "managedAccounts")),
    getDocs(collection(db, "users")),
    getDocs(collection(db, "globalWorkerEmails")),
  ]);

  const usersByEmail = new Map();
  usersSnapshot.forEach((userDoc) => {
    const email = userDoc.data().email?.toLowerCase();
    if (email) usersByEmail.set(email, userDoc.data());
  });

  const managedAccountEntries = accountsSnapshot.docs.map((account) => {
    const data = account.data();
    return {
      email: String(data.email || account.id).trim().toLowerCase(),
      documentId: account.id,
      data,
    };
  });
  const bossEmails = new Set([
    ADMIN_EMAIL,
    LEGACY_ADMIN_EMAIL,
    ...managedAccountEntries.map((account) => account.email),
  ]);
  const bossEmailsList = [...bossEmails];
  const managedAccountsByEmail = new Map(
    managedAccountEntries.map((account) => [account.email, account]),
  );
  const cabinetSnapshots = await Promise.all(
    bossEmailsList.map((email) => getDoc(doc(db, "cabinets", email))),
  );
  const workerEmailsByBoss = new Map();
  workersSnapshot.forEach((workerDoc) => {
    const bossEmail = workerDoc.data().bossEmail?.toLowerCase();
    if (bossEmail) {
      workerEmailsByBoss.set(bossEmail, (workerEmailsByBoss.get(bossEmail) || 0) + 1);
    }
  });

  const bosses = [...bossEmails]
    .map((email, index) => {
      const user = usersByEmail.get(email);
      const cabinet = cabinetSnapshots[index].exists()
        ? cabinetSnapshots[index].data()
        : {};
      return {
        email,
        registered: Boolean(user),
        displayName: user?.displayName || "",
        lastLogin: user?.lastLogin || null,
        registeredAt: user?.registeredAt || user?.lastLogin || null,
        accountCreatedAt: managedAccountsByEmail.get(email)?.data.createdAt || null,
        managedAccountId: managedAccountsByEmail.get(email)?.documentId || null,
        hasWorkerEmail: Boolean(cabinet.globalWorkerEmail?.trim()),
        workerEmail: cabinet.globalWorkerEmail?.trim() || "",
        workerCount: workerEmailsByBoss.get(email) || 0,
        administrator: email === ADMIN_EMAIL || email === LEGACY_ADMIN_EMAIL,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));

  const registeredBosses = bosses.filter((boss) => boss.registered);
  return {
    stats: {
      registeredUsers: usersSnapshot.size,
      bossAccounts: bossEmails.size,
      registeredBosses: registeredBosses.length,
      registeredWorkers: workersSnapshot.size,
    },
    registeredBossHistory: registeredBosses.map(({ email, registeredAt }) => ({
      email,
      registeredAt,
    })),
    bosses,
    managedAccounts: managedAccountEntries.map((account) => account.email).sort(),
  };
};

export const addManagedAccount = async (email) => {
  if (!isAdminEmail(auth.currentUser?.email || "")) {
    throw new Error("Только администратор может добавлять аккаунты.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  await setDoc(doc(db, "managedAccounts", normalizedEmail), {
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    createdBy: ADMIN_EMAIL,
  });
  return { email: normalizedEmail };
};

export const removeManagedAccount = async (email, accountId = email) => {
  if (!isAdminEmail(auth.currentUser?.email || "")) {
    throw new Error("Только администратор может удалять аккаунты.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL || normalizedEmail === LEGACY_ADMIN_EMAIL) {
    throw new Error("Нельзя удалить аккаунт администратора.");
  }
  await deleteDoc(doc(db, "managedAccounts", accountId));
};

export const updateManagedAccount = async (currentEmail, nextEmail, currentAccountId = currentEmail) => {
  if (!isAdminEmail(auth.currentUser?.email || "")) {
    throw new Error("Только администратор может изменять аккаунты.");
  }

  const normalizedCurrentEmail = currentEmail.trim().toLowerCase();
  const normalizedNextEmail = nextEmail.trim().toLowerCase();
  if (normalizedCurrentEmail === normalizedNextEmail) {
    throw new Error("Новый email должен отличаться от текущего.");
  }
  if (
    normalizedCurrentEmail === ADMIN_EMAIL ||
    normalizedCurrentEmail === LEGACY_ADMIN_EMAIL ||
    normalizedNextEmail === ADMIN_EMAIL ||
    normalizedNextEmail === LEGACY_ADMIN_EMAIL
  ) {
    throw new Error("Нельзя изменять аккаунты администратора.");
  }

  const currentRef = doc(db, "managedAccounts", currentAccountId);
  const nextRef = doc(db, "managedAccounts", normalizedNextEmail);
  await runTransaction(db, async (transaction) => {
    const [currentAccount, nextAccount] = await Promise.all([
      transaction.get(currentRef),
      transaction.get(nextRef),
    ]);
    if (!currentAccount.exists()) {
      throw new Error("Аккаунт для изменения не найден.");
    }
    if (nextAccount.exists()) {
      throw new Error("Аккаунт с таким email уже существует.");
    }

    transaction.set(nextRef, {
      ...currentAccount.data(),
      email: normalizedNextEmail,
      updatedAt: new Date().toISOString(),
      updatedBy: ADMIN_EMAIL,
    });
    transaction.delete(currentRef);
  });
};
