// Supabase Storage — reemplaza Cloudinary manteniendo las mismas firmas exportadas
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const BUCKET = 'axon-docs';

export async function uploadBuffer(
  buffer: Buffer,
  path: string,
  _resourceType?: string,
): Promise<{ secure_url: string; public_id: string }> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos para subir documentos');
  }
  const cleanPath = path.replace(/^\/+/, '');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${cleanPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Storage ${res.status}: ${text}`);
  }
  return {
    secure_url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${cleanPath}`,
    public_id: cleanPath,
  };
}

export async function uploadDocument(
  buffer: Buffer,
  filename: string,
  shipmentId: string,
): Promise<{ url: string; publicId: string }> {
  const result = await uploadBuffer(buffer, `shipments/${shipmentId}/${filename}`);
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteDocument(publicId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${publicId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  });
}

export function getSignedUrl(publicId: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${publicId}`;
}
