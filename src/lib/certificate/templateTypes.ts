export interface CertificateField {
  id: string;
  key: string; // e.g. 'PARTICIPANT_NAME', 'EVENT_NAME', 'ROLL_NUMBER', 'EVENT_DATE', 'CERTIFICATE_ID', 'ORGANIZER', 'QR_CODE', 'DESCRIPTION', 'TITLE'
  label: string;
  type: "text" | "qr" | "custom_text";
  defaultText?: string;
  x: number; // percentage from left (0 to 100) or pt
  y: number; // percentage from top (0 to 100) or pt
  width: number;
  height: number;
  fontSize: number; // pt (typically 12 - 40)
  fontFamily?: "Helvetica" | "Helvetica-Bold" | "Times-Roman" | "Times-Bold" | "Courier";
  fontWeight?: "normal" | "bold" | "semi-bold";
  textAlign: "left" | "center" | "right";
  color: string; // Hex e.g. "#1C1917", "#C62828"
  letterSpacing?: number;
  rotation?: number;
  qrSize?: number; // for QR code
  qrMargin?: number;
}

export interface TemplateConfiguration {
  title: string;
  subtitle?: string;
  descriptionText?: string;
  fields: CertificateField[];
  backgroundColor?: string;
  borderStyle?: "ornate-gold" | "minimal" | "modern";
  showSeal?: boolean;
  sealText?: string;
  customLogoUrl?: string;
}
