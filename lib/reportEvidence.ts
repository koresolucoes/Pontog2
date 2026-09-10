import { supabase } from './supabase';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_REPORT_EVIDENCE_FILES = 3;
export const MAX_REPORT_EVIDENCE_BYTES = 5 * 1024 * 1024;

export function validateReportEvidence(files: File[]): string | null {
  if (files.length > MAX_REPORT_EVIDENCE_FILES) return 'Você pode anexar no máximo 3 imagens.';
  for (const file of files) {
    if (!MIME_EXT[file.type]) return 'Use apenas imagens JPG, PNG ou WebP.';
    if (file.size < 1 || file.size > MAX_REPORT_EVIDENCE_BYTES) return 'Cada imagem pode ter no máximo 5 MB.';
  }
  return null;
}

export async function uploadReportEvidence(reportId: number, files: File[]): Promise<void> {
  if (!files.length) return;
  const validation = validateReportEvidence(files);
  if (validation) throw new Error(validation);

  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user?.id;
  if (!userId) throw new Error('Sessão necessária para anexar provas.');

  for (const file of files) {
    const ext = MIME_EXT[file.type];
    const path = `${userId}/${reportId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('report_evidence').upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: attachError } = await supabase.rpc('attach_report_evidence_v1', {
      p_report_id: reportId,
      p_object_path: path,
    });
    if (attachError) throw attachError;
  }
}
