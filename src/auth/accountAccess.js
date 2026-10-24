import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
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

  const workerCounts = new Map();
  workersSnapshot.forEach((workerDoc) => {
    const bossEmail = workerDoc.data().bossEmail?.toLowerCase();
    if (bossEmail) workerCounts.set(bossEmail, (workerCounts.get(bossEmail) || 0) + 1);
  });

  const bossEmails = new Set([
    ADMIN_EMAIL,
    LEGACY_ADMIN_EMAIL,
    ...accountsSnapshot.docs.map((account) => account.id.toLowerCase()),
  ]);
  const bosses = [...bossEmails]
    .map((email) => {
      const user = usersByEmail.get(email);
      return {
        email,
        registered: Boolean(user),
        displayName: user?.displayName || "",
        lastLogin: user?.lastLogin || null,
        workerCount: workerCounts.get(email) || 0,
        administrator: email === ADMIN_EMAIL || email === LEGACY_ADMIN_EMAIL,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));

  return {
    stats: {
      registeredUsers: usersSnapshot.size,
      bossAccounts: bossEmails.size,
      registeredBosses: bosses.filter((boss) => boss.registered).length,
      registeredWorkers: workersSnapshot.size,
    },
    bosses,
    managedAccounts: accountsSnapshot.docs.map((account) => account.id).sort(),
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

export const removeManagedAccount = async (email) => {
  if (!isAdminEmail(auth.currentUser?.email || "")) {
    throw new Error("Только администратор может удалять аккаунты.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL || normalizedEmail === LEGACY_ADMIN_EMAIL) {
    throw new Error("Нельзя удалить аккаунт администратора.");
  }
  await deleteDoc(doc(db, "managedAccounts", normalizedEmail));
};
