const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export const api = {
  auth: {
    verify: (token: string) =>
      request<{
        authenticated: boolean;
        onboarded: boolean;
        privyId?: string;
        email?: string;
        walletAddress?: string;
        user?: any;
      }>("/api/auth/verify", { method: "POST", token }),

    onboard: (token: string, data: any) =>
      request<{ user: any }>("/api/auth/onboard", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
  },

  org: {
    get: (token: string) => request<any>("/api/org", { token }),
    update: (token: string, data: any) =>
      request<any>("/api/org", { method: "PUT", token, body: JSON.stringify(data) }),
  },

  employees: {
    list: (token: string) => request<{ employees: any[] }>("/api/employees", { token }),
    invite: (token: string, data: any) =>
      request<any>("/api/employees/invite", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    listInvites: (token: string) =>
      request<{ invites: any[] }>("/api/employees/invite", { token }),
    revokeInvite: (token: string, id: string) =>
      request<any>(`/api/employees/invite?id=${id}`, { method: "DELETE", token }),
    update: (token: string, id: string, data: any) =>
      request<any>(`/api/employees/${id}`, {
        method: "PUT",
        token,
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      request<any>(`/api/employees/${id}`, { method: "DELETE", token }),
  },

  departments: {
    list: (token: string) => request<{ departments: any[] }>("/api/departments", { token }),
    create: (token: string, data: any) =>
      request<any>("/api/departments", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      request<any>(`/api/departments/${id}`, { method: "DELETE", token }),
  },

  payroll: {
    list: (token: string, page = 1) =>
      request<{ payrolls: any[]; total: number }>(`/api/payroll?page=${page}`, { token }),
    get: (token: string, id: string) => request<any>(`/api/payroll/${id}`, { token }),
    run: (token: string, data: any) =>
      request<any>("/api/payroll/run", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    approve: (token: string, id: string) =>
      request<any>(`/api/payroll/${id}/approve`, { method: "POST", token }),
    upcoming: (token: string) => request<any>("/api/payroll/upcoming", { token }),
  },

  treasury: {
    balance: (token: string) => request<any>("/api/treasury/balance", { token }),
    deposit: (token: string, data: any) =>
      request<any>("/api/treasury/deposit", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    withdraw: (token: string, data: any) =>
      request<any>("/api/treasury/withdraw", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    transactions: (token: string) => request<any>("/api/treasury/transactions", { token }),
  },

  vesting: {
    list: (token: string) => request<{ schedules: any[] }>("/api/vesting", { token }),
    create: (token: string, data: any) =>
      request<any>("/api/vesting", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    release: (token: string, id: string) =>
      request<any>(`/api/vesting/${id}/release`, { method: "POST", token }),
  },

  me: {
    profile: (token: string) => request<any>("/api/me/profile", { token }),
    updateProfile: (token: string, data: any) =>
      request<any>("/api/me/profile", { method: "PUT", token, body: JSON.stringify(data) }),
    balance: (token: string) => request<any>("/api/me/balance", { token }),
    payments: (token: string, page = 1) =>
      request<any>(`/api/me/payments?page=${page}`, { token }),
    withdraw: (token: string, data: any) =>
      request<any>("/api/me/withdraw", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    vesting: (token: string) => request<any>("/api/me/vesting", { token }),
    payslip: (token: string, paymentId: string) =>
      request<any>(`/api/me/payslip?id=${paymentId}`, { token }),
  },

  earn: {
    balance: (token: string) => request<any>("/api/earn/balance", { token }),
    deposit: (token: string, data: any) =>
      request<any>("/api/earn/deposit", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    withdraw: (token: string, data: any) =>
      request<any>("/api/earn/withdraw", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
  },

  ens: {
    resolve: (name: string) => request<any>(`/api/ens/resolve?name=${name}`),
  },

  audit: {
    list: (token: string, page = 1) =>
      request<{ logs: any[]; total: number; pages: number }>(`/api/audit?page=${page}`, { token }),
  },

  token: {
    lookup: (address: string) =>
      request<{ address: string; name: string; symbol: string; decimals: number }>(
        `/api/token?address=${address}`
      ),
  },
};
