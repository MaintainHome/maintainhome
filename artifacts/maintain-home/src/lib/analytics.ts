const isDev = import.meta.env.DEV;

export type AnalyticsEvent =
  | "dashboard_view"
  | "broker_dashboard_view"
  | "quiz_start"
  | "quiz_complete"
  | "chat_message_sent"
  | "chat_opened"
  | "export_pdf_click"
  | "export_csv_click"
  | "signup_complete"
  | "login_complete"
  | "logout"
  | "role_switch_to_broker"
  | "role_switch_to_homeowner"
  | "support_form_open"
  | "support_form_submit"
  | "calendar_view"
  | "history_view"
  | "home_profile_view"
  | "pricing_view"
  | "privacy_view"
  | "help_view"
  | "upgrade_click";

interface EventProperties {
  userId?: number;
  email?: string;
  plan?: string;
  page?: string;
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: AnalyticsEvent, props?: EventProperties): void {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
    ...props,
  };

  if (isDev) {
    console.log("[Analytics]", payload);
  }

  try {
    const key = "mh_analytics_queue";
    const existing = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    existing.push(payload);
    if (existing.length > 100) existing.shift();
    sessionStorage.setItem(key, JSON.stringify(existing));
  } catch {
  }
}
