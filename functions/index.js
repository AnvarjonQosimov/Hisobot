const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const ADMIN_EMAIL = "anvarqosimov153@gmail.com";
const LEGACY_ADMIN_EMAIL = "archoltinnisbatarch@gmail.com";
const MANAGED_ACCOUNTS = "managedAccounts";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getAuthenticatedEmail = (request) => {
  const email = request.auth?.token.email?.toLowerCase();
  if (!email || request.auth.token.email_verified !== true) {
    throw new HttpsError("unauthenticated", "A verified Google account is required.");
  }
  return email;
};

const requireAdmin = (request) => {
  const email = getAuthenticatedEmail(request);
  if (email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Only the account administrator can manage users.");
  }
  return email;
};

exports.checkAccountAccess = onCall(async (request) => {
  const email = getAuthenticatedEmail(request);
  if (email === ADMIN_EMAIL || email === LEGACY_ADMIN_EMAIL) {
    return { allowed: true, admin: email === ADMIN_EMAIL };
  }

  const account = await db.collection(MANAGED_ACCOUNTS).doc(email).get();
  return { allowed: account.exists, admin: false };
});

exports.getAdminDashboard = onCall(async (request) => {
  requireAdmin(request);
  const [accountsSnapshot, usersSnapshot, workersSnapshot] = await Promise.all([
    db.collection(MANAGED_ACCOUNTS).get(),
    db.collection("users").get(),
    db.collection("globalWorkerEmails").get(),
  ]);

  const userByEmail = new Map();
  usersSnapshot.forEach((userDoc) => {
    const email = userDoc.get("email")?.toLowerCase();
    if (email) userByEmail.set(email, userDoc.data());
  });

  const workerCounts = new Map();
  workersSnapshot.forEach((workerDoc) => {
    const bossEmail = workerDoc.get("bossEmail")?.toLowerCase();
    if (bossEmail) workerCounts.set(bossEmail, (workerCounts.get(bossEmail) || 0) + 1);
  });

  const bossEmails = new Set([
    ADMIN_EMAIL,
    LEGACY_ADMIN_EMAIL,
    ...accountsSnapshot.docs.map((account) => account.id.toLowerCase()),
  ]);
  const bosses = [...bossEmails]
    .map((email) => {
      const profile = userByEmail.get(email);
      return {
        email,
        registered: Boolean(profile),
        displayName: profile?.displayName || "",
        lastLogin: profile?.lastLogin || null,
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
});

exports.addManagedAccount = onCall(async (request) => {
  const adminEmail = requireAdmin(request);
  const email = typeof request.data?.email === "string"
    ? request.data.email.trim().toLowerCase()
    : "";
  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email address.");
  }
  if (email === ADMIN_EMAIL || email === LEGACY_ADMIN_EMAIL) {
    throw new HttpsError("already-exists", "This address already has administrator access.");
  }

  const accountRef = db.collection(MANAGED_ACCOUNTS).doc(email);
  const accountSnapshot = await accountRef.get();
  if (!accountSnapshot.exists) {
    await accountRef.set({ email, createdAt: new Date(), createdBy: adminEmail });
  }
  return { email };
});

exports.removeManagedAccount = onCall(async (request) => {
  requireAdmin(request);
  const email = typeof request.data?.email === "string"
    ? request.data.email.trim().toLowerCase()
    : "";
  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email address.");
  }
  if (email === ADMIN_EMAIL || email === LEGACY_ADMIN_EMAIL) {
    throw new HttpsError("failed-precondition", "Administrator access cannot be removed.");
  }
  await db.collection(MANAGED_ACCOUNTS).doc(email).delete();
  return { success: true };
});
