"use client";

// ============================================================
// VideoUploader — supports both URL paste and file upload.
// Uploads go to Supabase Storage 'node-videos' bucket.
// ============================================================

import { useRef, useState, useTransition } from "react";
import { Upload, Trash2, ExternalLink, Link2, Video, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  actionSaveVideoURL,
  actionUploadVideo,
  actionDeleteVideo,
} from "@/app/admin/actions";

interface Props {
  nodeId: string;
  initialVideoUrl: string | null;
  initialStoragePath: string | null;
  initialDurationSeconds: number | null;
}

const MAX_FILE_MB = 50;

export default function VideoUploader({
  nodeId,
  initialVideoUrl,
  initialStoragePath,
  initialDurationSeconds,
}: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialVideoUrl);
  const [storagePath, setStoragePath] = useState<string | null>(initialStoragePath);
  const [duration, setDuration] = useState<number | null>(initialDurationSeconds);

  const [urlInput, setUrlInput] = useState(initialVideoUrl ?? "");
  const [durationInput, setDurationInput] = useState(initialDurationSeconds?.toString() ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSaveUrl() {
    startTransition(async () => {
      try {
        const parsed = durationInput ? parseInt(durationInput, 10) : null;
        await actionSaveVideoURL(nodeId, urlInput.trim() || null, Number.isFinite(parsed ?? NaN) ? parsed : null);
        setCurrentUrl(urlInput.trim() || null);
        setDuration(Number.isFinite(parsed ?? NaN) ? parsed : null);
      } catch (err) {
        console.error(err);
        alert("Failed to save URL.");
      }
    });
  }

  async function handleFile(file: File) {
    setUploadError(null);
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`File is too large. Max ${MAX_FILE_MB} MB (your file: ${(file.size / 1024 / 1024).toFixed(1)} MB). For bigger videos, host on Mux/YouTube and paste the URL.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      const { publicUrl } = await actionUploadVideo(nodeId, fd);
      setCurrentUrl(publicUrl);
      setUrlInput(publicUrl);
      setStoragePath(`${nodeId}/<uploaded>`); // approximate; real path from DB on reload
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm("Remove the current video? The file will also be deleted from storage.")) return;
    startTransition(async () => {
      try {
        await actionDeleteVideo(nodeId, storagePath);
        setCurrentUrl(null);
        setStoragePath(null);
        setDuration(null);
        setUrlInput("");
        setDurationInput("");
      } catch (err) { console.error(err); }
    });
  }

  return (
    <div className="space-y-8">
      {/* Current video preview */}
      <section>
        <h2 className="text-base font-bold text-white mb-1">Current video</h2>
        <p className="text-xs text-slate-500 mb-3">Shown to students at the top of the lesson page.</p>

        {currentUrl ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="aspect-video bg-black">
              <video controls src={currentUrl} className="w-full h-full" preload="metadata" />
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-slate-400 min-w-0 truncate">
                <a href={currentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-indigo-300">
                  <ExternalLink className="w-3 h-3" /> Open full URL
                </a>
                {duration && (
                  <span className="ml-3">{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}</span>
                )}
              </div>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <Video className="w-7 h-7 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No video yet. Upload one or paste a URL below.</p>
          </div>
        )}
      </section>

      {/* Upload file */}
      <section>
        <h3 className="text-sm font-bold text-white mb-1">Upload a file</h3>
        <p className="text-xs text-slate-500 mb-3">
          MP4/WebM, up to <strong className="text-slate-300">{MAX_FILE_MB} MB</strong>. Larger files should be hosted on Mux or YouTube and pasted as a URL below.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold",
            "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
            uploading && "opacity-60 cursor-wait"
          )}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Choose video file"}
        </button>

        {uploadError && (
          <p className="mt-2 text-xs text-rose-300 flex items-center gap-1">
            <Info className="w-3 h-3" /> {uploadError}
          </p>
        )}
      </section>

      {/* Paste a URL */}
      <section>
        <h3 className="text-sm font-bold text-white mb-1">Or paste a URL</h3>
        <p className="text-xs text-slate-500 mb-3">
          Mux playback URL, YouTube embed URL, Vimeo direct link, or any public video URL.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <input
            type="number"
            min={0}
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            placeholder="duration (sec)"
            className="sm:w-40 px-3 py-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSaveUrl}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save URL"}
          </button>
        </div>
      </section>
    </div>
  );
}
