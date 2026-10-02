import { useState } from "react";
import { useI18n } from "../i18n";
import { useToast } from "../context/ToastContext";
import { ApiError, http } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { NearbyAlertPrecision, TrustedContactRequest, TrustedContactView } from "../types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

const PRECISIONS: NearbyAlertPrecision[] = [
  "COARSE_AREA_ONLY",
  "APPROXIMATE_DISTANCE",
  "EXACT_LOCATION_AUTHORIZED",
];

const PRECISION_LABEL: Record<NearbyAlertPrecision, string> = {
  COARSE_AREA_ONLY: "precisionCoarse",
  APPROXIMATE_DISTANCE: "precisionApprox",
  EXACT_LOCATION_AUTHORIZED: "precisionExact",
};

const EMPTY_FORM: TrustedContactRequest = {
  displayName: "",
  phoneNumber: "",
  relationship: "",
  preferredChannel: "SMS",
  allowPushNotification: true,
  allowSms: true,
  allowPhoneCallShortcut: true,
  locationPrecision: "APPROXIMATE_DISTANCE",
  priority: 1,
};

export function ContactsPage() {
  const { t } = useI18n();
  const { show } = useToast();
  const contacts = useAsync<TrustedContactView[]>(() => http.get("/api/contacts"), []);

  const [form, setForm] = useState<TrustedContactRequest>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const onSubmit = async () => {
    if (!form.displayName.trim() || !form.phoneNumber.trim()) {
      show(t("required"), "error");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await http.put(`/api/contacts/${editingId}`, form);
      } else {
        await http.post("/api/contacts", form);
      }
      show(t("saved"), "success");
      reset();
      contacts.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : t("error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t("confirmDeleteContact"))) return;
    try {
      await http.del(`/api/contacts/${id}`);
      show(t("deleted"), "success");
      contacts.reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : t("error"), "error");
    }
  };

  const startEdit = (contact: TrustedContactView) => {
    setEditingId(contact.id);
    setForm({
      displayName: contact.displayName,
      phoneNumber: "",
      relationship: contact.relationship ?? "",
      preferredChannel: contact.preferredChannel ?? "SMS",
      allowPushNotification: true,
      allowSms: true,
      allowPhoneCallShortcut: true,
      locationPrecision: contact.locationPrecision,
      priority: contact.priority,
    });
  };

  return (
    <div className="container section">
      <PageHeader title={`👥 ${t("contacts")}`} subtitle={t("contactLimit")} />

      <div className="grid grid-2">
        <Card title={editingId ? t("editContact") : t("addContact")}>
          <div className="form-group">
            <label>{t("contactName")}</label>
            <input
              className="form-control"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("contactPhone")}</label>
            <input
              className="form-control"
              value={form.phoneNumber}
              placeholder="01xxxxxxxxx"
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t("relationship")}</label>
              <input
                className="form-control"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t("priority")}</label>
              <input
                className="form-control"
                type="number"
                min={1}
                max={10}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>{t("locationPrecision")}</label>
            <select
              className="form-control"
              value={form.locationPrecision}
              onChange={(e) =>
                setForm({ ...form, locationPrecision: e.target.value as NearbyAlertPrecision })
              }
            >
              {PRECISIONS.map((precision) => (
                <option key={precision} value={precision}>
                  {t(PRECISION_LABEL[precision])}
                </option>
              ))}
            </select>
          </div>
          <div className="stack" style={{ marginBottom: 16 }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.allowSms}
                onChange={(e) => setForm({ ...form, allowSms: e.target.checked })}
              />
              {t("allowSms")}
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.allowPushNotification}
                onChange={(e) => setForm({ ...form, allowPushNotification: e.target.checked })}
              />
              {t("allowPush")}
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.allowPhoneCallShortcut}
                onChange={(e) => setForm({ ...form, allowPhoneCallShortcut: e.target.checked })}
              />
              {t("allowCall")}
            </label>
          </div>
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={onSubmit} disabled={busy}>
              {busy ? t("saving") : t("save")}
            </button>
            {editingId ? (
              <button className="btn btn-ghost" onClick={reset}>
                {t("cancel")}
              </button>
            ) : null}
          </div>
        </Card>

        <Card title={t("myContacts")}>
          {contacts.loading ? (
            <Spinner />
          ) : contacts.error ? (
            <ErrorState message={contacts.error} onRetry={contacts.reload} />
          ) : (contacts.data ?? []).length === 0 ? (
            <EmptyState hint={t("noContacts")} />
          ) : (
            (contacts.data ?? []).map((contact) => (
              <div className="list-item" key={contact.id}>
                <div>
                  <strong>{contact.displayName}</strong>
                  <div className="meta">
                    {contact.phoneNumberMasked}
                    {contact.relationship ? ` · ${contact.relationship}` : ""}
                  </div>
                  <div className="flex" style={{ gap: 6, marginTop: 6 }}>
                    <Badge tone="info">{t(PRECISION_LABEL[contact.locationPrecision])}</Badge>
                    {contact.isVerified ? <Badge tone="success">{t("verified")}</Badge> : null}
                    <span className="chip">#{contact.priority}</span>
                  </div>
                </div>
                <div className="flex" style={{ gap: 8 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => startEdit(contact)}>
                    {t("editing")}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => onDelete(contact.id)}>
                    {t("delete")}
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
