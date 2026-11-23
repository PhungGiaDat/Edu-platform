import React from 'react';

import { getAssetCandidateUrls } from '@/lib/courseAssets';
import type { CourseTrailer } from '@/types/course';

type Props = { trailer: CourseTrailer; locale: 'en' | 'vi' };

export const CourseTrailerCard: React.FC<Props> = ({ trailer, locale }) => {
  const videoCandidates = React.useMemo(() => getAssetCandidateUrls(trailer.asset), [trailer.asset]);
  const poster = getAssetCandidateUrls(trailer.poster)[0];
  const [candidate, setCandidate] = React.useState(0);
  const ready = trailer.asset.status === 'ready';
  const copy = locale === 'vi'
    ? { heading: 'Xem trước cùng Lexi', unavailable: 'Trailer đang được chuẩn bị', caption: trailer.captions_vi }
    : { heading: 'Preview with Lexi', unavailable: 'Trailer is being prepared', caption: trailer.captions_vi };

  return (
    <section aria-label={copy.heading} className="overflow-hidden rounded-[34px] border-4 border-white bg-[#EAF5FF] p-4 shadow-[0_10px_0_rgba(91,141,239,0.14)] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{copy.heading}</h2>
          <p className="text-sm font-bold text-slate-600">{trailer.title} · {trailer.duration_seconds}s</p>
        </div>
      </div>
      {ready && videoCandidates[candidate] ? (
        <video
          className="aspect-video w-full rounded-[24px] border-4 border-white bg-slate-900 object-cover shadow-[0_6px_0_rgba(15,23,42,0.12)]"
          controls
          preload="metadata"
          playsInline
          poster={poster}
          aria-label={trailer.title}
          onError={() => setCandidate((value) => value + 1)}
        >
          <source src={videoCandidates[candidate]} type="video/mp4" />
          {copy.unavailable}
        </video>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-[24px] border-4 border-white bg-slate-800 shadow-[0_6px_0_rgba(15,23,42,0.12)]">
          {poster && <img src={poster} alt="" className="h-full w-full object-cover opacity-70" />}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 p-5 text-center">
            <p className="rounded-2xl bg-white px-4 py-3 font-black text-slate-800">{copy.unavailable}</p>
          </div>
        </div>
      )}
      <p className="mt-3 text-sm font-bold text-slate-700">{copy.caption}</p>
    </section>
  );
};
