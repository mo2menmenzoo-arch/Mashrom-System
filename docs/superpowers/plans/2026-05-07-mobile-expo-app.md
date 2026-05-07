# Mobile Expo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React Native / Expo mobile app (`mushroom-mobile/`) that connects to the `/api/mobile/` routes added in Plan A and provides 100% feature parity with the web app in Arabic RTL.

**Architecture:** Expo managed workflow with expo-router for file-based navigation. A Zustand store holds the JWT + user; an axios instance injects it on every request. TanStack Query handles all data fetching, caching, and mutations. NativeWind provides Tailwind-like styling. The app lives in a separate folder `mushroom-mobile/` next to the existing Next.js project.

**Prerequisites:** Plan A (mobile API routes) must be deployed and working on Vercel before testing any screen.

**Tech Stack:** Expo SDK 52, expo-router v3, TanStack Query v5, Zustand, NativeWind v4, axios, Victory Native (charts), expo-print, expo-sharing, expo-secure-store, xlsx

**Base URL:** `https://mushroom-greenhouse.vercel.app`

---

## File Map

```
mushroom-mobile/
├── app/
│   ├── _layout.tsx                     Root layout — RTL, QueryClient, auth guard
│   ├── (auth)/
│   │   ├── _layout.tsx                 Auth stack layout
│   │   └── login.tsx                   Login screen
│   └── (app)/
│       ├── _layout.tsx                 Bottom tab navigator
│       ├── dashboard.tsx
│       ├── cycles/
│       │   ├── index.tsx               Cycles list
│       │   ├── [id].tsx                Cycle detail
│       │   └── create.tsx              Create cycle form
│       ├── expenses/
│       │   ├── index.tsx               Expenses list + create form
│       │   └── [id]/edit.tsx           Edit expense
│       ├── sales/
│       │   ├── index.tsx               Sales list + create form
│       │   └── [id]/edit.tsx           Edit sale
│       ├── operations/
│       │   ├── index.tsx               Readings list + create form
│       │   └── [id]/edit.tsx           Edit reading
│       ├── inventory/
│       │   └── index.tsx               Inventory list + add item form
│       ├── custody/
│       │   └── index.tsx               Custody list + add form
│       ├── reports/
│       │   └── index.tsx               P&L table + PDF/Excel export
│       ├── analytics/
│       │   └── index.tsx               Victory Native charts
│       ├── search.tsx                  Global search
│       └── settings/
│           ├── index.tsx               Settings menu
│           ├── account.tsx             Name/email/password
│           ├── financial.tsx           Currency/tax rate
│           ├── notifications.tsx       Notifications toggle
│           ├── partners.tsx            Partners list + edit
│           ├── greenhouses/
│           │   ├── index.tsx           Greenhouse list
│           │   └── [id].tsx            Greenhouse detail + settings
│           └── users/
│               ├── index.tsx           Users table
│               └── [id]/permissions.tsx Permissions modal
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Separator.tsx
│   │   └── Toast.tsx
│   └── layout/
│       ├── ScreenHeader.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── api.ts                          axios instance + interceptors
│   ├── auth.ts                         Zustand auth store
│   ├── format.ts                       formatEGP, formatDate, formatInt
│   └── queryClient.ts                  TanStack Query client config
├── hooks/
│   ├── useDashboard.ts
│   ├── useCycles.ts
│   ├── useExpenses.ts
│   ├── useSales.ts
│   ├── useOperations.ts
│   ├── useInventory.ts
│   ├── useCustody.ts
│   ├── useReports.ts
│   ├── useAnalytics.ts
│   ├── useSearch.ts
│   ├── useSettings.ts
│   ├── useGreenhouses.ts
│   └── useTeam.ts
├── app.json
├── eas.json
├── tailwind.config.js
├── babel.config.js
├── tsconfig.json
└── README.md
```

---

## Task 1: Scaffold project + install dependencies

**Files:** All config files + `package.json`

- [ ] **Step 1: Create the Expo project**

Run this from the parent directory (next to the Next.js project folder):

```bash
npx create-expo-app mushroom-mobile --template blank-typescript
cd mushroom-mobile
```

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-router expo-secure-store expo-print expo-sharing expo-file-system expo-font expo-constants
npm install @tanstack/react-query zustand axios nativewind xlsx
npm install --save-dev tailwindcss@3.3.2
npx expo install react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated
npm install victory-native react-native-svg
npm install react-native-toast-message
```

- [ ] **Step 3: Replace `package.json` main entry**

Open `package.json` and change `"main"` to:

```json
"main": "expo-router/entry"
```

- [ ] **Step 4: Create `babel.config.js`**

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
      "react-native-reanimated/plugin",
    ],
  };
};
```

- [ ] **Step 5: Create `tailwind.config.js`**

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#16a34a",
        success: "#16a34a",
        destructive: "#dc2626",
        warning: "#d97706",
        muted: "#6b7280",
        border: "#e5e7eb",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: Create `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 7: Verify the project starts**

```bash
npx expo start
```

Expected: QR code in terminal, no errors. Press `Ctrl+C` to stop.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Expo project with all dependencies"
```

---

## Task 2: Core lib files — API client, auth store, format utils, QueryClient

**Files:**
- Create: `lib/api.ts`
- Create: `lib/auth.ts`
- Create: `lib/format.ts`
- Create: `lib/queryClient.ts`

- [ ] **Step 1: Create `lib/api.ts`**

```typescript
// lib/api.ts
import axios from "axios";
import { useAuthStore } from "@/lib/auth";

const BASE_URL = "https://mushroom-greenhouse.vercel.app";

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);
```

- [ ] **Step 2: Create `lib/auth.ts`**

```typescript
// lib/auth.ts
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "mushroom_jwt";

export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "OPERATOR" | "ACCOUNTANT" | "VIEWER";
  perms: Record<string, boolean>;
};

type AuthState = {
  token: string | null;
  user: AppUser | null;
  isLoading: boolean;
  login: (token: string, user: AppUser) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  login: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const { api } = await import("@/lib/api");
        const res = await api.get("/api/mobile/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        set({ token, user: res.data.user });
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

- [ ] **Step 3: Create `lib/format.ts`**

```typescript
// lib/format.ts
export function formatEGP(value: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Africa/Cairo",
  }).format(d);
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("ar-EG").format(Math.round(value));
}
```

- [ ] **Step 4: Create `lib/queryClient.ts`**

```typescript
// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add lib/
git commit -m "feat: add api client, auth store, format utils, queryClient"
```

---

## Task 3: Root layout + navigation + auth guard

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(app)/_layout.tsx`

- [ ] **Step 1: Create root layout**

```typescript
// app/_layout.tsx
import { useEffect } from "react";
import { I18nManager } from "react-native";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";

// Force RTL for Arabic
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

export default function RootLayout() {
  const { loadFromStorage, isLoading } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Create auth group layout with redirect guard**

```typescript
// app/(auth)/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/lib/auth";

export default function AuthLayout() {
  const { token } = useAuthStore();
  if (token) return <Redirect href="/(app)/dashboard" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Create app group layout — bottom tab navigator**

```typescript
// app/(app)/_layout.tsx
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "@/lib/auth";
import { Home, ClipboardList, BarChart2, Search, Settings } from "lucide-react-native";

export default function AppLayout() {
  const { token } = useAuthStore();
  if (!token) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16a34a",
        tabBarLabelStyle: { fontFamily: "System", fontSize: 11 },
        tabBarStyle: { direction: "rtl" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="operations/index"
        options={{ title: "التشغيل", tabBarIcon: ({ color }) => <ClipboardList color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="reports/index"
        options={{ title: "التقارير", tabBarIcon: ({ color }) => <BarChart2 color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "بحث", tabBarIcon: ({ color }) => <Search color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{ title: "الإعدادات", tabBarIcon: ({ color }) => <Settings color={color} size={22} /> }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add root layout, auth guard, bottom tab navigator"
```

---

## Task 4: Shared UI components

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/layout/ScreenHeader.tsx`
- Create: `components/layout/EmptyState.tsx`

- [ ] **Step 1: Create Button**

```typescript
// components/ui/Button.tsx
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from "react-native";

type Variant = "default" | "outline" | "destructive";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  default: { container: "bg-primary rounded-lg px-4 py-3 items-center", text: "text-white font-semibold text-base" },
  outline: { container: "border border-gray-300 rounded-lg px-4 py-3 items-center bg-white", text: "text-gray-700 font-semibold text-base" },
  destructive: { container: "bg-red-600 rounded-lg px-4 py-3 items-center", text: "text-white font-semibold text-base" },
};

export function Button({ label, variant = "default", loading, disabled, ...props }: ButtonProps) {
  const s = variantStyles[variant];
  return (
    <TouchableOpacity
      className={`${s.container} ${disabled || loading ? "opacity-50" : ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? "#374151" : "#fff"} />
      ) : (
        <Text className={s.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Create Card**

```typescript
// components/ui/Card.tsx
import { View, Text, ViewProps } from "react-native";

export function Card({ children, className = "", ...props }: ViewProps & { className?: string }) {
  return (
    <View className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <View className="px-4 pt-4 pb-2">{children}</View>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-base font-bold text-gray-900 text-right">{children}</Text>;
}

export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <View className={`px-4 pb-4 ${className}`}>{children}</View>;
}
```

- [ ] **Step 3: Create Input**

```typescript
// components/ui/Input.tsx
import { TextInput, Text, View, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="space-y-1">
      {label && <Text className="text-sm font-medium text-gray-700 text-right">{label}</Text>}
      <TextInput
        className={`border rounded-lg px-3 py-2.5 text-right text-base bg-white ${error ? "border-red-500" : "border-gray-300"}`}
        textAlign="right"
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text className="text-xs text-red-600 text-right">{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 4: Create Badge**

```typescript
// components/ui/Badge.tsx
import { View, Text } from "react-native";

type Variant = "default" | "success" | "destructive" | "warning" | "secondary";

const styles: Record<Variant, { bg: string; text: string }> = {
  default: { bg: "bg-gray-100", text: "text-gray-700" },
  success: { bg: "bg-green-100", text: "text-green-700" },
  destructive: { bg: "bg-red-100", text: "text-red-700" },
  warning: { bg: "bg-amber-100", text: "text-amber-700" },
  secondary: { bg: "bg-gray-100", text: "text-gray-600" },
};

export function Badge({ label, variant = "default" }: { label: string; variant?: Variant }) {
  const s = styles[variant];
  return (
    <View className={`${s.bg} px-2 py-0.5 rounded-full self-start`}>
      <Text className={`${s.text} text-xs font-medium`}>{label}</Text>
    </View>
  );
}
```

- [ ] **Step 5: Create ScreenHeader**

```typescript
// components/layout/ScreenHeader.tsx
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, showBack, right }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-white border-b border-gray-200 flex-row items-center justify-between px-4 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-1">
        <Text className="text-xl font-bold text-gray-900 text-right">{title}</Text>
        {subtitle && <Text className="text-sm text-gray-500 text-right mt-0.5">{subtitle}</Text>}
      </View>
      <View className="flex-row items-center gap-2">
        {right}
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <ChevronRight size={24} color="#374151" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Step 6: Create EmptyState**

```typescript
// components/layout/EmptyState.tsx
import { View, Text } from "react-native";

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <Text className="text-gray-400 text-center text-sm">{message}</Text>
    </View>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add components/
git commit -m "feat: add shared UI components (Button, Card, Input, Badge, ScreenHeader, EmptyState)"
```

---

## Task 5: Data-fetching hooks

**Files:** All 13 hook files in `hooks/`

- [ ] **Step 1: Create `hooks/useDashboard.ts`**

```typescript
// hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get("/api/mobile/dashboard");
      return res.data;
    },
  });
}
```

- [ ] **Step 2: Create `hooks/useCycles.ts`**

```typescript
// hooks/useCycles.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCycles() {
  return useQuery({ queryKey: ["cycles"], queryFn: async () => (await api.get("/api/mobile/cycles")).data });
}

export function useCycle(id: string) {
  return useQuery({ queryKey: ["cycles", id], queryFn: async () => (await api.get(`/api/mobile/cycles/${id}`)).data });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { startDate: string; greenhouseId: string; notes?: string }) =>
      api.post("/api/mobile/cycles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycles"] }),
  });
}

export function useCloseCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/mobile/cycles/${id}`, { action: "close" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycles"] }),
  });
}

export function useDeleteCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/mobile/cycles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycles"] }),
  });
}
```

- [ ] **Step 3: Create `hooks/useExpenses.ts`**

```typescript
// hooks/useExpenses.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useExpenses(cycleId?: string) {
  return useQuery({
    queryKey: ["expenses", cycleId],
    queryFn: async () => (await api.get("/api/mobile/expenses", { params: { cycleId } })).data,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/api/mobile/expenses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/api/mobile/expenses/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.delete(`/api/mobile/expenses/${id}`, { data: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
```

- [ ] **Step 4: Create `hooks/useSales.ts`**

```typescript
// hooks/useSales.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSales(cycleId?: string) {
  return useQuery({
    queryKey: ["sales", cycleId],
    queryFn: async () => (await api.get("/api/mobile/sales", { params: { cycleId } })).data,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/api/mobile/sales", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/api/mobile/sales/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/mobile/sales/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, additionalPaid }: { id: string; additionalPaid: number }) =>
      api.post(`/api/mobile/sales/${id}/pay`, { additionalPaid }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
```

- [ ] **Step 5: Create remaining hooks**

```typescript
// hooks/useOperations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useOperations(cycleId?: string) {
  return useQuery({
    queryKey: ["operations", cycleId],
    queryFn: async () => (await api.get("/api/mobile/operations", { params: { cycleId } })).data,
  });
}

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/api/mobile/operations", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/api/mobile/operations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operations"] }),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/mobile/operations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operations"] }),
  });
}
```

```typescript
// hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useInventory(cycleId?: string) {
  return useQuery({
    queryKey: ["inventory", cycleId],
    queryFn: async () => (await api.get("/api/mobile/inventory", { params: { cycleId } })).data,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/api/mobile/inventory", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/mobile/inventory/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
```

```typescript
// hooks/useCustody.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCustody(cycleId?: string) {
  return useQuery({
    queryKey: ["custody", cycleId],
    queryFn: async () => (await api.get("/api/mobile/custody", { params: { cycleId } })).data,
  });
}

export function useCreateCustodyRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/api/mobile/custody", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custody"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCustodyRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recordType }: { id: string; recordType: string }) =>
      api.delete(`/api/mobile/custody/${id}`, { data: { recordType } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custody"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
```

```typescript
// hooks/useReports.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useReports(view = "cycles", greenhouseId?: string) {
  return useQuery({
    queryKey: ["reports", view, greenhouseId],
    queryFn: async () => (await api.get("/api/mobile/reports", { params: { view, greenhouseId } })).data,
  });
}
```

```typescript
// hooks/useAnalytics.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get("/api/mobile/analytics")).data,
  });
}
```

```typescript
// hooks/useSearch.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: async () => (await api.get("/api/mobile/search", { params: { q } })).data,
    enabled: q.length >= 2,
  });
}
```

```typescript
// hooks/useSettings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/api/mobile/settings")).data,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.patch("/api/mobile/settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
```

```typescript
// hooks/useGreenhouses.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGreenhouses() {
  return useQuery({
    queryKey: ["greenhouses"],
    queryFn: async () => (await api.get("/api/mobile/greenhouses")).data,
  });
}

export function useGreenhouse(id: string) {
  return useQuery({
    queryKey: ["greenhouses", id],
    queryFn: async () => (await api.get(`/api/mobile/greenhouses/${id}`)).data,
  });
}

export function useCreateGreenhouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.post("/api/mobile/greenhouses", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["greenhouses"] }),
  });
}

export function useUpdateGreenhouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/api/mobile/greenhouses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["greenhouses"] }),
  });
}
```

```typescript
// hooks/useTeam.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => (await api.get("/api/mobile/team")).data,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/api/mobile/team", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.patch("/api/mobile/team", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}
```

```typescript
// hooks/usePartners.ts  (add to hooks/ folder)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePartners() {
  return useQuery({
    queryKey: ["partners"],
    queryFn: async () => (await api.get("/api/mobile/partners")).data,
  });
}

export function useUpdatePartners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object[]) => api.put("/api/mobile/partners", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add hooks/
git commit -m "feat: add all data-fetching hooks"
```

---

## Task 6: Login screen

**Files:**
- Create: `app/(auth)/login.tsx`

- [ ] **Step 1: Create login screen**

```typescript
// app/(auth)/login.tsx
import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/mobile/auth/login", { email, password });
      await login(res.data.token, res.data.user);
      router.replace("/(app)/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "تعذّر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top }}
        className="bg-gray-50"
      >
        <View className="flex-1 px-6 justify-center py-12">
          <View className="items-center mb-10">
            <Text className="text-4xl mb-2">🍄</Text>
            <Text className="text-2xl font-bold text-gray-900">نظام إدارة صوبة الماشروم</Text>
            <Text className="text-sm text-gray-500 mt-1">سجّل الدخول للمتابعة</Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <Input
              label="البريد الإلكتروني"
              placeholder="admin@greenhouse.local"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="كلمة المرور"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <View className="bg-red-50 rounded-lg p-3">
                <Text className="text-red-700 text-sm text-right">{error}</Text>
              </View>
            ) : null}

            <Button label="تسجيل الدخول" onPress={handleLogin} loading={loading} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Test on device / simulator**

```bash
npx expo start
```

Open on Android device or emulator. Enter the admin credentials from the seeded DB. You should navigate to the dashboard after login.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add login screen"
```

---

## Task 7: Dashboard screen

**Files:**
- Create: `app/(app)/dashboard.tsx`

- [ ] **Step 1: Create dashboard screen**

```typescript
// app/(app)/dashboard.tsx
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { TrendingUp, TrendingDown, CircleDollarSign, AlertTriangle, Plus } from "lucide-react-native";
import { useDashboard } from "@/hooks/useDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { formatEGP, formatInt, formatDate } from "@/lib/format";

export default function DashboardScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useDashboard();

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-400">جارٍ التحميل...</Text>
      </View>
    );
  }

  const cycle = data?.activeCycle;
  const alerts = data?.alerts ?? [];

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="الرئيسية" />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {!cycle ? (
          <Card>
            <CardContent>
              <Text className="text-gray-500 text-center py-8 text-sm">
                لا توجد دورة إنتاج نشطة.{"\n"}ابدأ بإنشاء دورتك الأولى.
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-lg py-3 items-center mt-2"
                onPress={() => router.push("/(app)/cycles/create")}
              >
                <Text className="text-white font-semibold">إنشاء دورة جديدة</Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cycle header */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-bold text-gray-900 text-right">الرئيسية</Text>
                <Text className="text-xs text-gray-500 text-right">
                  دورة {formatInt(cycle.number)} · {formatDate(cycle.startDate)}
                </Text>
              </View>
              <View className="bg-gray-100 px-3 py-1.5 rounded-full">
                <Text className="text-sm font-semibold text-gray-700">
                  اليوم {formatInt(cycle.dayNumber)}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <Card>
              <CardContent className="pt-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-xs text-gray-500">نهاية</Text>
                  <View className="flex-row items-end gap-1">
                    <Text className="text-2xl font-bold text-primary">{cycle.progressPct}</Text>
                    <Text className="text-sm text-gray-500 pb-0.5">٪</Text>
                  </View>
                  <Text className="text-xs text-gray-500">بداية</Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${cycle.progressPct}%` }}
                  />
                </View>
              </CardContent>
            </Card>

            {/* KPI cards */}
            <View className="flex-row flex-wrap gap-3">
              <KpiCard label="الإيرادات" value={formatEGP(cycle.pnl.revenue)} color="#16a34a" />
              <KpiCard label="مصاريف التشغيل" value={formatEGP(cycle.pnl.expenses)} color="#dc2626" />
              <KpiCard label="مصاريف العهدة" value={formatEGP(cycle.pnl.custody)} color="#d97706" />
              <KpiCard
                label={cycle.pnl.net >= 0 ? "صافي الربح" : "صافي الخسارة"}
                value={formatEGP(Math.abs(cycle.pnl.net))}
                color={cycle.pnl.net >= 0 ? "#16a34a" : "#dc2626"}
              />
            </View>

            {/* Alerts */}
            {alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <View className="flex-row items-center gap-2 justify-end">
                      <Text className="text-base font-bold">تنبيهات</Text>
                      <AlertTriangle size={16} color="#d97706" />
                    </View>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.map((alert: any) => (
                    <View
                      key={alert.id}
                      className="border-r-4 border-amber-400 bg-amber-50 rounded-lg p-3 mb-2"
                    >
                      <Text className="text-sm text-amber-800 text-right">{alert.message}</Text>
                    </View>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quick add */}
            <Card>
              <CardHeader><CardTitle>إضافة سريعة</CardTitle></CardHeader>
              <CardContent>
                <View className="flex-row flex-wrap gap-3">
                  <QuickAddButton label="مصروف جديد" color="#dc2626" onPress={() => router.push("/(app)/expenses")} />
                  <QuickAddButton label="بيع جديد" color="#16a34a" onPress={() => router.push("/(app)/sales")} />
                  <QuickAddButton label="صرف عهدة" color="#d97706" onPress={() => router.push("/(app)/custody")} />
                  <QuickAddButton label="قراءة اليوم" color="#2563eb" onPress={() => router.push("/(app)/operations")} />
                </View>
              </CardContent>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="bg-white rounded-xl border border-gray-200 p-4 flex-1 min-w-[45%]" style={{ borderTopWidth: 3, borderTopColor: color }}>
      <Text className="text-xs text-gray-500 text-right mb-1">{label}</Text>
      <Text className="text-lg font-bold text-right" style={{ color }}>{value}</Text>
    </View>
  );
}

function QuickAddButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-gray-50 border border-gray-200 rounded-xl p-4 items-center flex-1 min-w-[45%]"
    >
      <View className="w-10 h-10 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: color + "20" }}>
        <Plus size={20} color={color} />
      </View>
      <Text className="text-xs font-medium text-gray-700">{label}</Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Verify on device — you should see KPI cards or "no active cycle" state**

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/dashboard.tsx"
git commit -m "feat: add dashboard screen"
```

---

## Task 8: Cycles, Expenses, Sales, Operations, Inventory, Custody screens

These six screens all follow the same pattern: fetch a list → render cards → show a create form at the top. Each also has an edit/detail sub-screen.

- [ ] **Step 1: Create `app/(app)/cycles/index.tsx`**

```typescript
// app/(app)/cycles/index.tsx
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCycles, useCloseCycle, useDeleteCycle } from "@/hooks/useCycles";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatDate, formatInt } from "@/lib/format";
import { useAuthStore } from "@/lib/auth";
import Toast from "react-native-toast-message";

export default function CyclesScreen() {
  const router = useRouter();
  const { data: cycles = [], isLoading, refetch, isRefetching } = useCycles();
  const { user } = useAuthStore();
  const closeCycle = useCloseCycle();
  const deleteCycle = useDeleteCycle();
  const canManage = user?.role === "ADMIN";

  async function handleClose(id: string) {
    try {
      await closeCycle.mutateAsync(id);
      Toast.show({ type: "success", text1: "تم إغلاق الدورة" });
    } catch (err: any) {
      Toast.show({ type: "error", text1: err.response?.data?.error ?? "خطأ" });
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title="الدورات"
        right={
          canManage ? (
            <TouchableOpacity onPress={() => router.push("/(app)/cycles/create")} className="p-2">
              <Plus size={24} color="#16a34a" />
            </TouchableOpacity>
          ) : null
        }
      />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {!isLoading && cycles.length === 0 && <EmptyState message="لا توجد دورات بعد" />}
        {cycles.map((c: any) => (
          <TouchableOpacity key={c.id} onPress={() => router.push(`/(app)/cycles/${c.id}`)}>
            <Card>
              <CardContent className="pt-4">
                <View className="flex-row justify-between items-start">
                  <Badge
                    label={c.status === "ACTIVE" ? "نشطة" : "مغلقة"}
                    variant={c.status === "ACTIVE" ? "success" : "secondary"}
                  />
                  <Text className="text-base font-bold text-gray-900">دورة {formatInt(c.number)}</Text>
                </View>
                <Text className="text-xs text-gray-500 text-right mt-1">
                  {formatDate(c.startDate)} — {formatDate(c.endDate)}
                </Text>
                {c.status === "ACTIVE" && canManage && (
                  <View className="mt-3">
                    <Button
                      label="إغلاق الدورة"
                      variant="outline"
                      loading={closeCycle.isPending}
                      onPress={() => handleClose(c.id)}
                    />
                  </View>
                )}
              </CardContent>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Create `app/(app)/cycles/create.tsx`**

```typescript
// app/(app)/cycles/create.tsx
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateCycle } from "@/hooks/useCycles";
import { useGreenhouses } from "@/hooks/useGreenhouses";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Card, CardContent } from "@/components/ui/Card";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";

export default function CreateCycleScreen() {
  const router = useRouter();
  const createCycle = useCreateCycle();
  const { data: greenhouses = [] } = useGreenhouses();
  const [greenhouseId, setGreenhouseId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    try {
      await createCycle.mutateAsync({ startDate, greenhouseId, notes: notes || undefined });
      Toast.show({ type: "success", text1: "تم إنشاء الدورة" });
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "خطأ في الإنشاء");
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="إنشاء دورة جديدة" showBack />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16 }}>
        <Card>
          <CardContent className="pt-4 space-y-4">
            <Input label="تاريخ البداية" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
            <Input label="ملاحظات (اختياري)" value={notes} onChangeText={setNotes} multiline />
            {error ? <View className="bg-red-50 p-3 rounded-lg"><Text className="text-red-700 text-right text-sm">{error}</Text></View> : null}
            <Button label="إنشاء الدورة" onPress={handleSubmit} loading={createCycle.isPending} />
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Create `app/(app)/expenses/index.tsx`**

```typescript
// app/(app)/expenses/index.tsx
import { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { useDashboard } from "@/hooks/useDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/layout/EmptyState";
import { formatEGP, formatDate } from "@/lib/format";
import { useAuthStore } from "@/lib/auth";
import Toast from "react-native-toast-message";

export default function ExpensesScreen() {
  const { data: dashboard } = useDashboard();
  const cycleId = dashboard?.activeCycle?.id;
  const { data: expenses = [], isLoading, refetch, isRefetching } = useExpenses(cycleId);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const { user } = useAuthStore();
  const canEdit = user?.perms?.editExpenses;

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!cycleId) return;
    setError("");
    try {
      await createExpense.mutateAsync({ cycleId, date, description, amount: Number(amount) });
      setDescription(""); setAmount("");
      Toast.show({ type: "success", text1: "تم تسجيل المصروف" });
    } catch (err: any) {
      setError(err.response?.data?.error ?? "خطأ");
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="المصاريف" />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {canEdit && cycleId && (
          <Card>
            <CardHeader><CardTitle>مصروف جديد</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input label="التاريخ" value={date} onChangeText={setDate} />
              <Input label="الوصف" value={description} onChangeText={setDescription} placeholder="وصف المصروف" />
              <Input label="المبلغ (ج.م)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
              {error ? <Text className="text-red-600 text-right text-sm">{error}</Text> : null}
              <Button label="تسجيل المصروف" onPress={handleCreate} loading={createExpense.isPending} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>قائمة المصاريف ({expenses.length})</CardTitle></CardHeader>
          <CardContent>
            {expenses.length === 0
              ? <EmptyState message="لا توجد مصاريف مسجلة" />
              : expenses.map((e: any) => (
                  <View key={e.id} className="border-b border-gray-100 py-3 flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900 text-right">{e.description}</Text>
                      <Text className="text-xs text-gray-400 text-right">{formatDate(e.date)}</Text>
                    </View>
                    <Text className="font-bold text-red-600 mr-3">{formatEGP(Number(e.amount))}</Text>
                  </View>
                ))
            }
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: Create Sales, Operations, Inventory, Custody screens**

Following the exact same pattern as expenses (list + inline create form), create:

**`app/(app)/sales/index.tsx`** — uses `useSales`, `useCreateSale`, `useRecordPayment`. Shows customer name, cartons, total, paid, remaining. Payment button for unpaid sales.

**`app/(app)/operations/index.tsx`** — uses `useOperations`, `useCreateOperation`. Fields: date, temperature, humidity, CO2, cleanliness, watered checkbox, notes.

**`app/(app)/inventory/index.tsx`** — uses `useInventory`, `useCreateInventoryItem`. Shows item name, balance, unit, expiry date.

**`app/(app)/custody/index.tsx`** — uses `useCustody`, `useCreateCustodyRecord`. Shows balance at top, tabs for deposits vs withdrawals, inline form with type toggle.

Each screen follows this template:
```
ScreenHeader title="[Screen Name]"
ScrollView
  Card (create form, visible only if canEdit)
  Card (list with items)
```

- [ ] **Step 5: Commit screens**

```bash
git add "app/(app)/"
git commit -m "feat: add cycles, expenses, sales, operations, inventory, custody screens"
```

---

## Task 9: Reports screen + PDF/Excel export

**Files:**
- Create: `app/(app)/reports/index.tsx`

- [ ] **Step 1: Create reports screen**

```typescript
// app/(app)/reports/index.tsx
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { useReports } from "@/hooks/useReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { formatEGP, formatInt } from "@/lib/format";

export default function ReportsScreen() {
  const { data: cycles = [], isLoading, refetch, isRefetching } = useReports("cycles");

  const totals = cycles.reduce(
    (acc: any, c: any) => ({
      revenue: acc.revenue + c.revenue,
      expenses: acc.expenses + c.expenses,
      custody: acc.custody + c.custody,
      net: acc.net + c.net,
    }),
    { revenue: 0, expenses: 0, custody: 0, net: 0 },
  );

  async function exportPDF() {
    const html = `
      <html dir="rtl">
        <head><meta charset="utf-8"/><style>
          body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background: #f3f4f6; }
        </style></head>
        <body>
          <h2>تقرير الأرباح والخسائر</h2>
          <table>
            <tr><th>الدورة</th><th>الإيرادات</th><th>المصاريف</th><th>العهدة</th><th>الصافي</th></tr>
            ${cycles.map((c: any) => `
              <tr>
                <td>دورة ${c.cycleNumber}</td>
                <td>${c.revenue.toFixed(2)}</td>
                <td>${c.expenses.toFixed(2)}</td>
                <td>${c.custody.toFixed(2)}</td>
                <td style="color:${c.net >= 0 ? 'green' : 'red'}">${c.net.toFixed(2)}</td>
              </tr>
            `).join("")}
            <tr style="font-weight:bold">
              <td>الإجمالي</td>
              <td>${totals.revenue.toFixed(2)}</td>
              <td>${totals.expenses.toFixed(2)}</td>
              <td>${totals.custody.toFixed(2)}</td>
              <td style="color:${totals.net >= 0 ? 'green' : 'red'}">${totals.net.toFixed(2)}</td>
            </tr>
          </table>
        </body>
      </html>`;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "تصدير PDF" });
  }

  async function exportExcel() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      cycles.map((c: any) => ({
        الدورة: `دورة ${c.cycleNumber}`,
        الإيرادات: c.revenue,
        "مصاريف التشغيل": c.expenses,
        "مصاريف العهدة": c.custody,
        "صافي الربح": c.net,
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws, "P&L");
    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const path = `${FileSystem.cacheDirectory}report.xlsx`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(path, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="التقارير" />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Export buttons */}
        <View className="flex-row gap-3">
          <View className="flex-1"><Button label="تصدير PDF" variant="outline" onPress={exportPDF} /></View>
          <View className="flex-1"><Button label="تصدير Excel" variant="outline" onPress={exportExcel} /></View>
        </View>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>ملخص الكل</CardTitle></CardHeader>
          <CardContent>
            <Row label="إجمالي الإيرادات" value={formatEGP(totals.revenue)} color="#16a34a" />
            <Row label="إجمالي المصاريف" value={formatEGP(totals.expenses)} color="#dc2626" />
            <Row label="إجمالي العهدة" value={formatEGP(totals.custody)} color="#d97706" />
            <Row label="صافي الربح" value={formatEGP(totals.net)} color={totals.net >= 0 ? "#16a34a" : "#dc2626"} bold />
          </CardContent>
        </Card>

        {/* Per-cycle table */}
        <Card>
          <CardHeader><CardTitle>تفاصيل الدورات</CardTitle></CardHeader>
          <CardContent>
            {cycles.map((c: any) => (
              <View key={c.cycleId} className="border-b border-gray-100 py-3">
                <Text className="font-semibold text-right text-gray-800 mb-1">دورة {formatInt(c.cycleNumber)}</Text>
                <Row label="الإيرادات" value={formatEGP(c.revenue)} color="#16a34a" />
                <Row label="المصاريف" value={formatEGP(c.expenses)} color="#dc2626" />
                <Row label="العهدة" value={formatEGP(c.custody)} color="#d97706" />
                <Row label="الصافي" value={formatEGP(c.net)} color={c.net >= 0 ? "#16a34a" : "#dc2626"} bold />
              </View>
            ))}
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text style={{ color, fontWeight: bold ? "700" : "400" }}>{value}</Text>
      <Text className="text-gray-600 text-right">{label}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/reports/"
git commit -m "feat: add reports screen with PDF and Excel export"
```

---

## Task 10: Analytics, Search, Settings screens

- [ ] **Step 1: Create `app/(app)/analytics/index.tsx`**

```typescript
// app/(app)/analytics/index.tsx
import { ScrollView, View, Text, Dimensions, RefreshControl } from "react-native";
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryLine } from "victory-native";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";

const W = Dimensions.get("window").width - 64;

export default function AnalyticsScreen() {
  const { data, isLoading, refetch, isRefetching } = useAnalytics();

  const pnlData = (data?.pnl ?? []).map((c: any) => ({
    x: `د${c.cycleNumber}`, y: c.net,
  }));

  const tempData = (data?.env ?? [])
    .filter((c: any) => c.avgTemp !== null)
    .map((c: any) => ({ x: c.cycleNumber, y: c.avgTemp }));

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="التحليل البياني" />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Card>
          <CardHeader><CardTitle>الربح/الخسارة لكل دورة</CardTitle></CardHeader>
          <CardContent>
            {pnlData.length === 0
              ? <Text className="text-gray-400 text-center py-8">لا بيانات</Text>
              : <VictoryChart width={W} height={220} theme={VictoryTheme.material}>
                  <VictoryAxis />
                  <VictoryAxis dependentAxis />
                  <VictoryBar data={pnlData} style={{ data: { fill: "#16a34a" } }} />
                </VictoryChart>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>متوسط الحرارة لكل دورة</CardTitle></CardHeader>
          <CardContent>
            {tempData.length === 0
              ? <Text className="text-gray-400 text-center py-8">لا بيانات</Text>
              : <VictoryChart width={W} height={220} theme={VictoryTheme.material}>
                  <VictoryAxis />
                  <VictoryAxis dependentAxis />
                  <VictoryLine data={tempData} style={{ data: { stroke: "#2563eb" } }} />
                </VictoryChart>
            }
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Create `app/(app)/search.tsx`**

```typescript
// app/(app)/search.tsx
import { useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { useSearch } from "@/hooks/useSearch";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { formatEGP, formatDate, formatInt } from "@/lib/format";

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const { data } = useSearch(q);

  const total = (data?.sales?.length ?? 0) + (data?.expenses?.length ?? 0) +
    (data?.withdrawals?.length ?? 0) + (data?.inventory?.length ?? 0);

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="البحث" />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 12 }}>
        <Input
          placeholder="ابحث عن عميل، مصروف، صنف..."
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
        />

        {q.length >= 2 && total === 0 && (
          <Text className="text-gray-400 text-center py-8">لا نتائج لـ "{q}"</Text>
        )}

        {(data?.sales ?? []).length > 0 && (
          <Card>
            <CardHeader><CardTitle>المبيعات ({formatInt(data.sales.length)})</CardTitle></CardHeader>
            <CardContent>
              {data.sales.map((s: any) => (
                <View key={s.id} className="border-b border-gray-100 py-2 flex-row justify-between">
                  <Text className="text-success font-medium">{formatEGP(Number(s.total))}</Text>
                  <Text className="text-gray-800">{s.customerName}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {(data?.expenses ?? []).length > 0 && (
          <Card>
            <CardHeader><CardTitle>المصاريف ({formatInt(data.expenses.length)})</CardTitle></CardHeader>
            <CardContent>
              {data.expenses.map((e: any) => (
                <View key={e.id} className="border-b border-gray-100 py-2 flex-row justify-between">
                  <Text className="text-destructive font-medium">{formatEGP(Number(e.amount))}</Text>
                  <Text className="text-gray-800">{e.description}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {(data?.inventory ?? []).length > 0 && (
          <Card>
            <CardHeader><CardTitle>المخزن ({formatInt(data.inventory.length)})</CardTitle></CardHeader>
            <CardContent>
              {data.inventory.map((i: any) => (
                <View key={i.id} className="border-b border-gray-100 py-2 flex-row justify-between">
                  <Text className="text-gray-500">{i.unit}</Text>
                  <Text className="text-gray-800 font-medium">{i.name}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Create `app/(app)/settings/index.tsx`**

```typescript
// app/(app)/settings/index.tsx
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, User, Building, Users, DollarSign, Bell, UserSquare, LogOut } from "lucide-react-native";
import { Card, CardContent } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { useAuthStore } from "@/lib/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const items = [
    { label: "الحساب الشخصي", icon: User, href: "/(app)/settings/account" },
    { label: "الإشعارات", icon: Bell, href: "/(app)/settings/notifications" },
    ...(isAdmin ? [
      { label: "الصوبات", icon: Building, href: "/(app)/settings/greenhouses" },
      { label: "المستخدمون", icon: Users, href: "/(app)/settings/users" },
      { label: "الإعدادات المالية", icon: DollarSign, href: "/(app)/settings/financial" },
      { label: "الشركاء", icon: UserSquare, href: "/(app)/settings/partners" },
    ] : []),
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="الإعدادات" />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 12 }}>
        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.href as any)}
              className={`flex-row items-center justify-between px-4 py-4 ${i < items.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <ChevronLeft size={18} color="#9ca3af" />
              <View className="flex-row items-center gap-3">
                <Text className="text-base text-gray-800">{item.label}</Text>
                <item.icon size={20} color="#374151" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Card>
          <CardContent className="pt-4">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-2"
              onPress={() => logout()}
            >
              <Text className="text-red-600 font-semibold text-base">تسجيل الخروج</Text>
              <LogOut size={20} color="#dc2626" />
            </TouchableOpacity>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: Create remaining settings screens**

`app/(app)/settings/account.tsx` — name, email, password change form using `useUpdateSettings` and direct `api.patch` calls.

`app/(app)/settings/notifications.tsx` — toggle switch reading/writing `UserPreferences.notificationsEnabled` via `/api/mobile/settings`.

`app/(app)/settings/financial.tsx` — currency + tax rate form, ADMIN only.

`app/(app)/settings/partners.tsx` — list of partners with share percents, editable, uses `useUpdatePartners`.

`app/(app)/settings/greenhouses/index.tsx` — list of greenhouses, uses `useGreenhouses`.

`app/(app)/settings/greenhouses/[id].tsx` — greenhouse detail + settings (name, cycle duration).

`app/(app)/settings/users/index.tsx` — users table with role badges, uses `useTeam`.

`app/(app)/settings/users/[id]/permissions.tsx` — permissions toggles, uses `useUpdateUser`.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/"
git commit -m "feat: add analytics, search, and all settings screens"
```

---

## Task 11: app.json + eas.json + README

**Files:**
- Create: `app.json`
- Create: `eas.json`
- Create: `README.md`

- [ ] **Step 1: Create `app.json`**

```json
{
  "expo": {
    "name": "نظام الماشروم",
    "slug": "mushroom-greenhouse",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "mushroom",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.mushroom.greenhouse",
      "versionCode": 1,
      "permissions": ["NOTIFICATIONS", "INTERNET", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      [
        "expo-print",
        { "isCameraPermissionRequired": false }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "apiBaseUrl": "https://mushroom-greenhouse.vercel.app",
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

- [ ] **Step 2: Create `eas.json`**

```json
{
  "cli": {
    "version": ">= 5.9.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 3: Create `README.md`**

```markdown
# 🍄 نظام الماشروم — Mobile App

React Native / Expo mobile app for mushroom greenhouse management.

**Backend:** https://mushroom-greenhouse.vercel.app  
**Platform:** Android (APK), iOS-ready

---

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Android device or emulator (for local testing)

---

## Run Locally

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Press 'a' to open on Android emulator
# Or scan the QR code with Expo Go on your physical device
```

---

## Build Android APK

### 1. Log in to Expo

```bash
eas login
```

### 2. Configure the project (first time only)

```bash
eas build:configure
```

This creates/updates your EAS project ID. Copy the ID into `app.json` under `extra.eas.projectId`.

### 3. Build a preview APK

```bash
eas build --platform android --profile preview
```

The build runs in the cloud. When done (~10 min), EAS gives you a download URL for the `.apk` file.

### 4. Install on Android device

Download the APK and transfer it to your device, or use:

```bash
adb install path/to/app.apk
```

---

## Environment Variables

No environment variables are needed in the mobile app. The API base URL is hardcoded in `lib/api.ts` as `https://mushroom-greenhouse.vercel.app`.

---

## Project Structure

```
app/           expo-router screens
components/    reusable UI components
hooks/         TanStack Query hooks (one per entity)
lib/           api client, auth store, format utils
```

---

## Default Login

Use the same credentials configured in the web app:

- **Email:** `admin@greenhouse.local`
- **Password:** `ChangeMe!2026`
```

- [ ] **Step 4: Commit**

```bash
git add app.json eas.json README.md
git commit -m "chore: add app.json, eas.json, README"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run the app on Android emulator or device**

```bash
npx expo start --android
```

Walk through the golden path:
1. Login → Dashboard loads with KPI cards
2. Tap "مصروف جديد" → Expenses screen → add an expense → appears in list
3. Tap "بيع جديد" → Sales screen → add a sale → appears in list
4. Reports → P&L table loads → tap "تصدير PDF" → share sheet opens
5. Settings → logout → redirected to login

- [ ] **Step 2: Build APK**

```bash
eas build --platform android --profile preview
```

Wait for the build to complete (~10 min). Download and install the APK on a physical Android device.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete mobile app — full feature parity with web"
```

---

**Plan B complete.** Both plans together deliver the full mobile app with 100% feature parity.
```
