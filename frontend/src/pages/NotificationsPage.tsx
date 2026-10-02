import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate } from "../lib/format";
import type { NotificationsResponse } from "../types";
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

export function NotificationsPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();
  const notifications = useAsync<NotificationsResponse>(
    () => http.get<NotificationsResponse>("/api/notifications?take=100"),
    []
  );

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const markRead = async (id: string) => {
    try {
      await http.post(`/api/notifications/${id}/read`);
      notifications.reload();
    } catch (err) {
      fail(err);
    }
  };

  const markAllRead = async () => {
    try {
      await http.post("/api/notifications/read-all");
      show(t("markAllRead"), "success");
      notifications.reload();
    } catch (err) {
      fail(err);
    }
  };

  const items = notifications.data?.items ?? [];

  return (
    <div className="container section">
      <PageHeader
        title={`🔔 ${t("notifications")}`}
        subtitle={`${t("unread")}: ${notifications.data?.unreadCount ?? 0}`}
        actions={
          <button className="btn btn-outline" onClick={markAllRead} disabled={items.length === 0}>
            {t("markAllRead")}
          </button>
        }
      />

      <Card>
        {notifications.loading ? (
          <Spinner />
        ) : notifications.error ? (
          <ErrorState message={notifications.error} onRetry={notifications.reload} />
        ) : items.length === 0 ? (
          <EmptyState hint={t("noNotifications")} />
        ) : (
          items.map((item) => {
            const title = lang === "bn" ? item.titleBn : item.titleEn;
            const body = lang === "bn" ? item.bodyBn : item.bodyEn;
            return (
              <div
                className="list-item"
                key={item.id}
                style={{ opacity: item.isRead ? 0.7 : 1 }}
              >
                <div>
                  <strong>
                    {!item.isRead ? "● " : ""}
                    {title}
                  </strong>
                  {body ? <p className="muted">{body}</p> : null}
                  <div className="meta">{fmtDate(item.createdAt, true, lang)}</div>
                </div>
                {!item.isRead ? (
                  <button className="btn btn-sm btn-outline" onClick={() => markRead(item.id)}>
                    {t("markRead")}
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}