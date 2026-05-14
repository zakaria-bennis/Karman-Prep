"use client";

// ============================================================
// VideoUploader — supports both URL paste and file upload.
// Uploads go to Supabase Storage 'node-videos' bucket.
// ============================================================

import { useRef, useState, useTransition } from "react";
import { Upload, Trash2, ExternalLink, Link2, Video, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionSaveVideoURL, actionUploadVideo, actionDeleteVideo } from "@/app/admin/actions";

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
        await actionSaveVideoURL(
          nodeId,
          urlInput.trim() || null,
          Number.isFinite(parsed ?? NaN) ? parsed : null
        );
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
      setUploadError(
        `File is too large. Max ${MAX_FILE_MB} MB (your file: ${(file.size / 1024 / 1024).toFixed(1)} MB). For bigger videos, host on Mux/YouTube and paste the URL.`
      );
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
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Current video preview */}
      <section>
        <h2 className="mb-1 text-base font-bold text-white">Current video</h2>
        <p className="mb-3 text-xs text-slate-500">
          Shown to students at the top of the lesson page.
        </p>

        {currentUrl ? (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="aspect-video bg-black">
              <video controls src={currentUrl} className="h-full w-full" preload="metadata" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 truncate text-xs text-slate-400">
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-indigo-300"
                >
                  <ExternalLink className="h-3 w-3" /> Open full URL
                </a>
                {duration && (
                  <span className="ml-3">
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <Video className="mx-auto mb-2 h-7 w-7 text-slate-600" />
            <p className="text-sm text-slate-500">No video yet. Upload one or paste a URL below.</p>
          </div>
        )}
      </section>

      {/* Upload file */}
      <section>
        <h3 className="mb-1 text-sm font-bold text-white">Upload a file</h3>
        <p className="mb-3 text-xs text-slate-500">
          MP4/WebM, up to <strong className="text-slate-300">{MAX_FILE_MB} MB</strong>. Larger files
          should be hosted on Mux or YouTube and pasted as a URL below.
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
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
            "border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700",
            uploading && "cursor-wait opacity-60"
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Choose video file"}
        </button>

        {uploadError && (
          <p className="mt-2 flex items-center gap-1 text-xs text-rose-300">
            <Info className="h-3 w-3" /> {uploadError}
          </p>
        )}
      </section>

      {/* Paste a URL */}
      <section>
        <h3 className="mb-1 text-sm font-bold text-white">Or paste a URL</h3>
        <p className="mb-3 text-xs text-slate-500">
          Mux playback URL, YouTube embed URL, Vimeo direct link, or any public video URL.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <input
            type="number"
            min={0}
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            placeholder="duration (sec)"
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none sm:w-40"
          />
          <button
            onClick={handleSaveUrl}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save URL"}
          </button>
        </div>
      </section>
    </div>
  );
}
