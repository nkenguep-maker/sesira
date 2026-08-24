const channelLabels: Record<string, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  PHONE: "Téléphone",
  WHATSAPP: "WhatsApp",
  WEB: "Site internet",
};

export function messageChannelLabel(channel: string): string {
  return channelLabels[channel.trim().toUpperCase()] ?? "Autre canal";
}
