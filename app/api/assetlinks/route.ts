// Digital Asset Links pour l'emballage Play Store en Trusted Web Activity (section 12.2).
// Renseigner ANDROID_SHA256_FINGERPRINTS (empreintes SHA-256 du certificat de signature, séparées par des virgules).
export function GET() {
  const empreintes = (process.env.ANDROID_SHA256_FINGERPRINTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const corps = empreintes.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: process.env.ANDROID_PACKAGE_NAME || "com.diwaamagazine.app",
            sha256_cert_fingerprints: empreintes,
          },
        },
      ]
    : [];
  return Response.json(corps);
}
