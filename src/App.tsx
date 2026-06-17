import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/auth-context";
import { RequireAuth, RequirePermission } from "@/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { homeRouteForRole } from "@/app/navigation";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { CallQueuePage } from "@/pages/calls";
import { FollowUpPage } from "@/pages/followup";
import { ClinicPortalPage } from "@/pages/clinic";
import { BookingsFeedPage } from "@/pages/bookings";
import { WorkflowsPage } from "@/pages/workflows";
import { PermissionsPage } from "@/pages/permissions";
import { SettingsPage } from "@/pages/settings";
import { FinancesPage } from "@/pages/finances";
import { ClinicsAdminPage } from "@/pages/clinics";
import { PerformancePage } from "@/pages/performance";
import { MarketingPage } from "@/pages/marketing";
import { SystemHealthPage } from "@/pages/system";
import { GradingPage } from "@/pages/grading";
import { CoachingPage } from "@/pages/coaching";
import { TrainingPage } from "@/pages/training";
import { HiringPage } from "@/pages/hiring";
import { ApprovalsPage } from "@/pages/approvals";
import { StaffPage } from "@/pages/staff";
import { MessagesPage } from "@/pages/messages";
import { NotificationsPage } from "@/pages/notifications";
import { LeadsPage } from "@/pages/leads";
import { FlagsPage } from "@/pages/flags";

function HomeRedirect() {
  const { primaryRole } = useAuth();
  return <Navigate to={homeRouteForRole(primaryRole)} replace />;
}

const guard = (perm: string, el: React.ReactNode) => (
  <RequirePermission perm={perm}>{el}</RequirePermission>
);

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="/dashboard" element={guard("dashboard.view", <DashboardPage />)} />
          <Route path="/calls" element={guard("leads.call", <CallQueuePage />)} />
          <Route path="/followup" element={guard("followup.view", <FollowUpPage />)} />
          <Route path="/clinic" element={<ClinicPortalPage />} />
          <Route path="/bookings" element={guard("bookings.view", <BookingsFeedPage />)} />
          <Route path="/leads" element={guard("leads.view", <LeadsPage />)} />
          <Route path="/clinics" element={guard("clinics.view", <ClinicsAdminPage />)} />
          <Route path="/performance" element={guard("dashboard.view", <PerformancePage />)} />
          <Route path="/finances" element={guard("billing.view", <FinancesPage />)} />
          <Route path="/marketing" element={guard("marketing.view", <MarketingPage />)} />
          <Route path="/grading" element={guard("grading.review", <GradingPage />)} />
          <Route path="/coaching" element={guard("coaching.manage", <CoachingPage />)} />
          <Route path="/training" element={guard("training.view", <TrainingPage />)} />
          <Route path="/hiring" element={guard("hiring.manage", <HiringPage />)} />
          <Route path="/approvals" element={guard("approvals.manage", <ApprovalsPage />)} />
          <Route path="/staff" element={guard("staff.view", <StaffPage />)} />
          <Route path="/messages" element={guard("comms.send", <MessagesPage />)} />
          <Route path="/workflows" element={guard("workflows.view", <WorkflowsPage />)} />
          <Route path="/permissions" element={guard("permissions.manage", <PermissionsPage />)} />
          <Route path="/system" element={guard("system.view", <SystemHealthPage />)} />
          <Route path="/flags" element={guard("flags.manage", <FlagsPage />)} />
          <Route path="/settings" element={guard("settings.manage", <SettingsPage />)} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
