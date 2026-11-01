/**
 * Row of lot photo thumbnails; each opens the full photo in a new tab.
 */
export function LotPhotoStrip({ photos, label = "Lot photo" }: { photos: Array<{ id: string; url: string }>; label?: string }) {
  if (photos.length === 0) return null;
  return (
    <div className="lot-photos">
      {photos.map((p, i) => (
        <a key={p.id} href={p.url} target="_blank" rel="noreferrer" aria-label={`${label} ${i + 1}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={`${label} ${i + 1}`} loading="lazy" />
        </a>
      ))}
    </div>
  );
}
