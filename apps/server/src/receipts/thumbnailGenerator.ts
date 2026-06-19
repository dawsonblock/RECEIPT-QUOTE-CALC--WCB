/**
 * Thumbnail generation.
 *
 * For v1 we keep this intentionally conservative:
 * - Image receipts: use the original file as the preview source (frontend can
 *   scale it down itself).
 * - PDF receipts: serve the PDF directly to the browser's native PDF renderer.
 *
 * The Mac `qlmanage -t` command can be wired later for true thumbnail files.
 */

export async function ensureThumbnail(_sourcePath: string, _thumbnailPath: string): Promise<void> {
  // Placeholder for later qlmanage thumbnail generation.
}
