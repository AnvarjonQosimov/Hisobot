import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../Firebase/Firebase";

export const ADMIN_EMAIL = "anvarqosimov153@gmail.com";
export const LEGACY_ADMIN_EMAIL = "archoltinnisbatarch@gmail.com";

export const isAdminEmail = (email) => email?.toLowerCase() === ADMIN_EMAIL;

const call = async (name, data) => {
  const callable = httpsCallable(functions, name);
  const result = await callable(data);
  return result.data;
};

export const checkAccountAccess = async () => {
  const email = auth.currentUser?.email?.toLowerCase();
  if (email === ADMIN_EMAIL) {
    return { allowed: true, admin: true };
  }
  if (email === LEGACY_ADMIN_EMAIL) {
    return { allowed: true, admin: false };
  }
  return call("checkAccountAccess");
};

export const getAdminDashboard = () => call("getAdminDashboard");
export const addManagedAccount = (email) => call("addManagedAccount", { email });
export const removeManagedAccount = (email) => call("removeManagedAccount", { email });
