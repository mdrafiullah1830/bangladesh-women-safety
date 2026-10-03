/* Women Safety BD — shared API contract types (mirrors WomenSafety.Application.Contracts) */

export type UserRole = "VICTIM" | "TRUSTED_CONTACT" | "RESPONDER" | "MODERATOR" | "ADMIN";

export type EmergencyPrivacyMode = "MAXIMUM_PRIVACY" | "BALANCED" | "SHARE_EXACT_LOCATION";

export type NearbyAlertPrecision =
  | "COARSE_AREA_ONLY"
  | "APPROXIMATE_DISTANCE"
  | "EXACT_LOCATION_AUTHORIZED";

export type IncidentStatus =
  | "DRAFT"
  | "OPEN"
  | "EMERGENCY_ACTIVE"
  | "EMERGENCY_CANCELLED"
  | "AWAITING_VERIFICATION"
  | "VERIFIED"
  | "POLICE_REFERRED"
  | "RESOLVED"
  | "CLOSED"
  | "DUPLICATE"
  | "REJECTED";

export type VerificationStatus =
  | "UNVERIFIED"
  | "PENDING_REVIEW"
  | "VERIFIED_CASE"
  | "OFFICIALLY_CONFIRMED"
  | "REJECTED";

export type IncidentCategory =
  | "HARASSMENT"
  | "STALKING"
  | "DOMESTIC_VIOLENCE"
  | "SEXUAL_ASSAULT"
  | "CYBER_HARASSMENT"
  | "WORKPLACE_HARASSMENT"
  | "ACID_ATTACK"
  | "TRAFFICKING"
  | "ROBBERY"
  | "ROAD_ACCIDENT"
  | "OTHER";

export type TripStatus = "ACTIVE" | "COMPLETED" | "AUTO_ESCALATED" | "CANCELLED";

export type ResponderAssignmentStatus =
  | "ALERTED"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "ON_SCENE"
  | "COMPLETED"
  | "CANCELLED";

export type ReferralStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "CLOSED";

export type DirectoryCategory =
  | "POLICE"
  | "HOSPITAL"
  | "FIRE_SERVICE"
  | "AMBULANCE"
  | "LEGAL_AID"
  | "COUNSELING"
  | "SAFE_PLACE"
  | "SHELTER"
  | "ONE_STOP"
  | "GOVERNMENT"
  | "WOMEN_CENTRE"
  | "HELP_CENTRE"
  | "WOMEN_POLICE_DESK";

export type OtpPurpose = "REGISTER" | "LOGIN" | "RESET_PASSWORD" | "PHONE_VERIFY";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfileView {
  id: string;
  displayName: string;
  phoneNumber?: string | null;
  email?: string | null;
  role: UserRole;
  districtId?: string | null;
  districtName?: string | null;
  divisionId?: string | null;
  preferredLanguage: string;
  defaultPrivacyMode: EmergencyPrivacyMode;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  reputationScore: number;
  verifiedReports: number;
  helpfulVotes: number;
  strikes: number;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthResult {
  succeeded: boolean;
  user?: UserProfileView | null;
  tokens?: AuthTokens | null;
  devOtp?: string | null;
  error?: string | null;
}

export interface SessionView {
  id: string;
  deviceId: string;
  platform?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  isCurrent: boolean;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface IncidentOwnerView {
  id: string;
  incidentReference: string;
  isEmergency: boolean;
  status: IncidentStatus;
  verificationStatus: VerificationStatus;
  privacyMode: EmergencyPrivacyMode;
  description?: string | null;
  addressText?: string | null;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastAccuracyMeters?: number | null;
  authorityContactState: string;
  contactNotificationState: string;
  responderNotificationState: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id: string;
  from: IncidentStatus;
  to: IncidentStatus;
  note?: string | null;
  systemGenerated: boolean;
  at: string;
}

export interface EvidenceView {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  caption?: string | null;
  isBlurred: boolean;
  visibility: string;
  capturedAt: string;
  createdAt: string;
}

export interface ReferralView {
  id: string;
  incidentId: string;
  stationName: string;
  reference: string;
  status: ReferralStatus;
  createdAt: string;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  notes?: string | null;
}

export interface ReferralCreateResponse {
  id: string;
  reference: string;
  status: ReferralStatus;
  letter: string;
}

export interface IncidentDetail {
  id: string;
  reference: string;
  title?: string | null;
  category: IncidentCategory;
  status: IncidentStatus;
  verificationStatus: VerificationStatus;
  isEmergency: boolean;
  description?: string | null;
  addressText?: string | null;
  districtId?: string | null;
  districtName?: string | null;
  divisionId?: string | null;
  occurredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  timeline?: TimelineEntry[];
  evidence?: EvidenceView[];
  referral?: ReferralView | null;
}

export interface IncidentLocationPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  source: string;
  recordedAt: string;
  isMoving: boolean;
  isLastKnownFallback: boolean;
  accuracyLabel: string;
}

export interface CreateIncidentRequest {
  description?: string;
  addressText?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  locationSource?: string;
  isEmergency: boolean;
  notifyTrustedContacts: boolean;
  privacyMode: EmergencyPrivacyMode;
  idempotencyKey: string;
  clientRecordedAt?: string;
}

export interface DispatchResult {
  contactsNotified: number;
  contactsQueued: number;
  respondersAlerted: number;
  smsAutoSendSupported: boolean;
  smsOneTapUri?: string | null;
  emergencyDialUri?: string | null;
  helplineDialUri?: string | null;
  notice: string;
}

export interface CreateEmergencyResponse {
  incident: IncidentOwnerView;
  duplicate: boolean;
  dispatch?: DispatchResult;
}

// ─── Trusted contacts ─────────────────────────────────────────────────────────

export interface TrustedContactView {
  id: string;
  displayName: string;
  phoneNumberMasked: string;
  relationship?: string | null;
  preferredChannel?: string | null;
  locationPrecision: NearbyAlertPrecision;
  priority: number;
  isVerified: boolean;
}

export interface TrustedContactRequest {
  displayName: string;
  phoneNumber: string;
  relationship?: string;
  preferredChannel?: string;
  allowPushNotification: boolean;
  allowSms: boolean;
  allowPhoneCallShortcut: boolean;
  locationPrecision: NearbyAlertPrecision;
  priority: number;
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export interface TripView {
  id: string;
  title: string;
  originText?: string | null;
  destinationText: string;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  status: TripStatus;
  startedAt: string;
  expectedArrivalAt: string;
  lastCheckInAt?: string | null;
  autoEscalatedAt?: string | null;
  checkInIntervalMinutes: number;
  transportMode?: string | null;
  trustedContactId?: string | null;
  createdAt: string;
}

export interface TripCheckIn {
  id: string;
  respondent: string;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
}

export interface TripDetail {
  trip: TripView;
  checkIns: TripCheckIn[];
}

// ─── Live location shares ─────────────────────────────────────────────────────

export interface ShareView {
  id: string;
  token: string;
  url: string;
  note?: string | null;
  latitude: number;
  longitude: number;
  expiresAt: string;
  viewCount: number;
  maxViews: number;
  revoked: boolean;
  expired: boolean;
  createdAt: string;
}

export interface ShareCreateResponse {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
  maxViews: number;
  smsUri: string;
}

export interface SharePublicView {
  state: "ACTIVE" | "REVOKED" | "EXPIRED" | "LIMIT_REACHED";
  note?: string | null;
  latitude?: number;
  longitude?: number;
  expiresAt?: string;
  viewsRemaining?: number;
  mapUri?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  titleEn: string;
  titleBn: string;
  bodyEn?: string | null;
  bodyBn?: string | null;
  linkHref?: string | null;
  isRead: boolean;
  incidentId?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  unreadCount: number;
  items: NotificationItem[];
}

// ─── Privacy ──────────────────────────────────────────────────────────────────

export interface ConsentView {
  key: string;
  granted: boolean;
  updatedAt?: string | null;
}

export interface DeletionRequestView {
  id: string;
  userId?: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  adminNote?: string | null;
}

// ─── Directory ────────────────────────────────────────────────────────────────

export interface EmergencyNumber {
  id: string;
  service: string;
  serviceBn: string;
  serviceEn: string;
  number: string;
  dialUri?: string | null;
  category: string;
  note?: string | null;
  is24x7: boolean;
}

export interface DirectoryEntry {
  id: string;
  category: DirectoryCategory;
  name: string;
  nameEn: string;
  nameBn: string;
  address?: string | null;
  phoneNumber?: string | null;
  dialUri?: string | null;
  districtId?: string | null;
  districtName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is24x7: boolean;
  isVerified: boolean;
}

export interface NearbyEntry {
  id: string;
  category: DirectoryCategory;
  name: string;
  phoneNumber?: string | null;
  dialUri?: string | null;
  distanceMeters: number;
  is24x7: boolean;
  districtName?: string | null;
  mapUri: string;
}

export interface LawResource {
  id: string;
  category: string;
  title: string;
  titleEn: string;
  titleBn: string;
  summary: string;
  lawReference?: string | null;
  phone?: string | null;
  dialUri?: string | null;
  website?: string | null;
}

export interface SafetyTip {
  id: string;
  category: string;
  title: string;
  body: string;
  nightOnly: boolean;
}

export interface TipsResponse {
  nightOnly: boolean;
  categories: string[];
  tips: SafetyTip[];
}

// ─── Public data / statistics ─────────────────────────────────────────────────

export interface District {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  centerLatitude?: number | null;
  centerLongitude?: number | null;
}

export interface Division {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  districts: District[];
}

export interface StatisticDefinition {
  key: string;
  labelEn: string;
  labelBn: string;
  meaning: string;
}

export interface DataSourceNote {
  name: string;
  url?: string | null;
  verificationStatus: string;
  coverageStart?: string | null;
  coverageEnd?: string | null;
  publishedAt?: string | null;
  isDemoData: boolean;
}

export interface DistrictPublicStat {
  districtId: string;
  districtName: string;
  divisionName: string;
  reportedIncidents: number;
  emergencyActivations: number;
  verifiedCases: number;
  policeReferred: number;
  policeConfirmed: number;
  resolvedCases: number;
  pendingCases: number;
  duplicateReports: number;
  rejectedReports: number;
  suppressed: boolean;
  suppressionReason?: string | null;
  populationEstimate?: number | null;
  populationSourceYear?: number | null;
  populationSource?: string | null;
}

export interface PublicStatsEnvelope {
  districts: DistrictPublicStat[];
  definitions: StatisticDefinition[];
  minimumAggregationThreshold: number;
  sources: DataSourceNote[];
}

export interface TrendBucket {
  month: string;
  reported: number;
  emergency: number;
  verified: number;
  referred: number;
  resolved: number;
}

export interface TrendResponse {
  months: number;
  from: string;
  districtId?: string | null;
  minimumAggregationThreshold: number;
  suppressed: boolean;
  note: string;
  buckets: TrendBucket[];
  categories: { category: IncidentCategory; count: number }[];
  definitions: StatisticDefinition[];
}

export interface DistrictSummary {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  divisionId: string;
  divisionName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reportCount: number;
  published: boolean;
}

export interface HeatmapCell {
  latitude: number;
  longitude: number;
  reportedIncidents: number;
  verifiedCases: number;
  suppressed: boolean;
}

export interface HeatmapResponse {
  minimumAggregationThreshold: number;
  note: string;
  cells: HeatmapCell[];
}

export interface ConnectivityStatus {
  serverReachable: boolean;
  checkedAt: string;
  providerName: string;
  smsAutoSendSupported: boolean;
  emergencyDispatchApiSupported: boolean;
  officialPoliceConfirmationSupported: boolean;
}

// ─── Responder console ────────────────────────────────────────────────────────

export interface ResponderAvailableIncident {
  id: string;
  reference: string;
  category: IncidentCategory;
  status: IncidentStatus;
  isEmergency: boolean;
  districtName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  minutesAgo: number;
}

export interface ResponderAssignment {
  id: string;
  incidentId: string;
  reference?: string | null;
  category?: IncidentCategory | null;
  status: ResponderAssignmentStatus;
  informationShared: NearbyAlertPrecision;
  reportedDistanceMeters?: number | null;
  alertedAt?: string | null;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  privacyMode?: EmergencyPrivacyMode | null;
}

export interface ResponderStats {
  total: number;
  active: number;
  completed: number;
  isOnDuty?: boolean;
}

// ─── Moderation console ───────────────────────────────────────────────────────

export interface ModerationQueueItem {
  id: string;
  reference: string;
  category: IncidentCategory;
  status: IncidentStatus;
  verificationStatus: VerificationStatus;
  isEmergency: boolean;
  title?: string | null;
  districtName?: string | null;
  createdAt: string;
  evidenceCount: number;
  helpfulVotes: number;
  description?: string | null;
}

export interface AdminUser {
  id: string;
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  isActive: boolean;
  isPhoneVerified: boolean;
  reputationScore: number;
  verifiedReports: number;
  helpfulVotes: number;
  strikes: number;
  createdAt: string;
}
