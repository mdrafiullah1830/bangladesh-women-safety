import { useI18n } from "../i18n";
import { Card, PageHeader } from "../components/ui";

const POINTS_BY_LANG: Record<string, { en: string[]; bn: string[] }> = {
  default: {
    en: [
      "We collect the minimum needed to keep you safe: your reports, trusted contacts and the location you choose to share.",
      "Public statistics are aggregated and suppressed below a minimum threshold — no individual is ever identifiable.",
      "You control consent for location tracking, contact alerts, anonymous statistics and notifications.",
      "You can export all of your data as JSON or request account deletion at any time.",
      "This platform never contacts an emergency service on your behalf. It only provides one-tap call shortcuts.",
    ],
    bn: [
      "আমরা আপনার নিরাপত্তার জন্য যতটুকু প্রয়োজন ততটুকুই সংগ্রহ করি — আপনার প্রতিবেদন, বিশ্বস্ত পরিচিতি এবং আপনার শেয়ার করা লোকেশন।",
      "পাবলিক পরিসংখ্যান সামগ্রিক ও ন্যূনতম থ্রেশহোল্ডের নিচে গোপন রাখা হয় — কোনো ব্যক্তিকে চিহ্নিত করা যায় না।",
      "লোকেশন ট্র্যাকিং, পরিচিতি সতর্কবার্তা, বেনামী পরিসংখ্যান ও নোটিফিকেশনের সম্মতি আপনার হাতে।",
      "আপনি যেকোনো সময় JSON আকারে আপনার সব ডেটা ডাউনলোড বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে পারেন।",
      "এই প্ল্যাটফর্ম কখনোই আপনার পক্ষে জরুরি সেবাকে কল করে না — শুধু এক ট্যাপের কল শর্টকাট দেয়।",
    ],
  },
};

export function PrivacyInfoPage() {
  const { t, lang } = useI18n();
  const points = POINTS_BY_LANG.default[lang] ?? POINTS_BY_LANG.default.en;

  return (
    <div className="container section">
      <PageHeader title={`🔒 ${t("privacy")}`} subtitle={t("appTagline")} />
      <Card>
        <ul className="stack" style={{ listStyle: "none" }}>
          {points.map((point, index) => (
            <li key={index} className="list-item">
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}