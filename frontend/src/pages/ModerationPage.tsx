import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { fmtDate, humanize } from "../lib/format";
import type { AdminUser, DeletionRequestView, ModerationQueueItem } from "../types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, statusTone } from "../components/ui";

export function ModerationPage() {
  const { t, lang } = useI18n();
  const { show } = useToast();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const queue = useAsync<ModerationQueueItem[]>(() => http.get("/api/moderation/queue"), []);
  const users = useAsync<AdminUser[]>(
    () => (isAdmin ? http.get("/api/moderation/users") : Promise.resolve([])),
    [isAdmin]
  );
  const deletions = useAsync<DeletionRequestView[]>(
    () => (isAdmin ? http.get("/api/moderation/deletion-requests") : Promise.resolve([])),
    [isAdmin]
  );

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) =>
    show(err instanceof ApiError ? err.message : t("error"), "error");

  const decide = async (id: string, approve: boolean) => {
    setBusy(true);
    try {
      await http.post(`/api/moderation/incidents/${id}/decision`, {
        approve,
        note: notes[id] || undefined,
      });
      show(t("saved"), "success");
      queue.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const setRole = async (id: string, role: string) => {
    try {
      await http.post(`/api/moderation/users/${id}/role`, role);
      show(t("saved"), "success");
      users.reload();
    } catch (err) {
      fail(err);
    }
  };

  const setActive = async (id: string, active: boolean) => {
    try {
      await http.post(`/api/moderation/users/${id}/active`, active);
      show(t("saved"), "success");
      users.reload();
    } catch (err) {
      fail(err);
    }
  };

  const resolveDeletion = async (id: string, approved: boolean) => {
    try {
      await http.post(`/api/moderation/deletion-requests/${id}`, approved);
      show(t("saved"), "success");
      deletions.reload();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="container section">
      <PageHeader title={`🛡️ ${t("moderationConsole")}`} subtitle={t("reviewQueue")} />

      <Card title={t("reviewQueue")}>
        {queue.loading ? (
          <Spinner />
        ) : queue.error ? (
          <ErrorState message={queue.error} onRetry={queue.reload} />
        ) : (queue.data ?? []).length === 0 ? (
          <EmptyState hint={t("noQueue")} />
        ) : (
          (queue.data ?? []).map((item) => (
            <div className="card" key={item.id} style={{ marginBottom: 12 }}>
              <div className="flex-between">
                <strong>
                  {item.isEmergency ? "🆘 " : ""}
                  {item.title || item.reference}
                </strong>
                <div className="flex" style={{ gap: 6 }}>
                  <Badge tone={statusTone(item.status)}>{humanize(item.status)}</Badge>
                  <Badge tone={statusTone(item.verificationStatus)}>
                    {humanize(item.verificationStatus)}
                  </Badge>
                </div>
              </div>
              <div className="meta">
                {humanize(item.category)}
                {item.districtName ? ` · ${item.districtName}` : ""} · {item.helpfulVotes}{" "}
                {t("helpfulVotes")} · {item.evidenceCount} {t("addEvidence")}
              </div>
              {item.description ? <p className="muted">{item.description}</p> : null}
              <div className="form-group" style={{ marginTop: 10 }}>
                <input
                  className="form-control"
                  placeholder={t("decisionNote")}
                  value={notes[item.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                />
              </div>
              <div className="flex" style={{ gap: 8 }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => decide(item.id, true)}
                  disabled={busy}
                >
                  {t("approve")}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => decide(item.id, false)}
                  disabled={busy}
                >
                  {t("reject")}
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      {isAdmin ? (
        <>
          <section style={{ marginTop: 24 }}>
            <Card title={t("adminUsers")}>
              {users.loading ? (
                <Spinner />
              ) : (users.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("name")}</th>
                        <th>{t("role")}</th>
                        <th>{t("verifiedReports")}</th>
                        <th>{t("action")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users.data ?? []).map((user) => (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.displayName}</strong>
                            <div className="meta">{user.email || user.phoneNumber}</div>
                          </td>
                          <td>
                            <select
                              className="form-control"
                              value={user.role}
                              onChange={(e) => setRole(user.id, e.target.value)}
                            >
                              {["VICTIM", "TRUSTED_CONTACT", "RESPONDER", "MODERATOR", "ADMIN"].map(
                                (role) => (
                                  <option key={role} value={role}>
                                    {humanize(role)}
                                  </option>
                                )
                              )}
                            </select>
                          </td>
                          <td>{user.verifiedReports}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => setActive(user.id, !user.isActive)}
                            >
                              {user.isActive ? t("deactivateUser") : t("activateUser")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>

          <section style={{ marginTop: 24 }}>
            <Card title={t("deletionRequests")}>
              {deletions.loading ? (
                <Spinner />
              ) : (deletions.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                (deletions.data ?? []).map((request) => (
                  <div className="list-item" key={request.id}>
                    <div>
                      <strong>{request.reason}</strong>
                      <div className="meta">{fmtDate(request.createdAt, true, lang)}</div>
                    </div>
                    <div className="flex" style={{ gap: 8 }}>
                      <Badge tone={request.status === "APPROVED" ? "success" : "warning"}>
                        {humanize(request.status)}
                      </Badge>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => resolveDeletion(request.id, true)}
                      >
                        {t("approve")}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => resolveDeletion(request.id, false)}
                      >
                        {t("reject")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}