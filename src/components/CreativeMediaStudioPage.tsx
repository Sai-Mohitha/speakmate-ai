import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  Film,
  ImagePlus,
  Info,
  Loader2,
  Music,
  X,
} from "lucide-react";

type StudioTab = "text-to-video" | "animate-image" | "music";

export function CreativeMediaStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>("text-to-video");

  // Video Generation & Image Animation state
  const [videoPrompt, setVideoPrompt] = useState(
    "A confident speaker presenting a clean product roadmap on stage in a bright modern auditorium, warm cinematic lighting."
  );
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImageMime, setUploadedImageMime] = useState<string>("image/png");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Music Generation state
  const [musicPrompt, setMusicPrompt] = useState(
    "Calm, uplifting acoustic piano and soft ambient strings background music for confident public speaking warm-up."
  );
  const [musicModel, setMusicModel] = useState<"lyria-3-clip-preview" | "lyria-3-pro-preview">(
    "lyria-3-clip-preview"
  );
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState<string>("");

  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setVideoError("Please upload a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setVideoError("Please select an image smaller than 6 MB.");
      return;
    }
    setVideoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setUploadedImagePreview(result);
      const commaIdx = result.indexOf(",");
      if (commaIdx !== -1) {
        setUploadedImageBase64(result.slice(commaIdx + 1));
        setUploadedImageMime(file.type);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerateVideo(e: FormEvent) {
    e.preventDefault();
    setVideoError(null);
    setGeneratedVideoUrl(null);

    if (activeTab === "animate-image" && !uploadedImageBase64) {
      setVideoError("Please upload a photo to animate into video.");
      return;
    }
    if (!videoPrompt.trim()) {
      setVideoError("Please enter a motion or scene description prompt.");
      return;
    }

    setVideoLoading(true);
    try {
      const res = await fetch("/api/media/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt.trim(),
          aspectRatio,
          ...(activeTab === "animate-image" && uploadedImageBase64
            ? {
                imageBase64: uploadedImageBase64,
                imageMimeType: uploadedImageMime,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVideoError(data.message || "Video generation failed.");
        return;
      }
      setGeneratedVideoUrl(data.videoDataUrl);
    } catch {
      setVideoError("Network timeout or server error during video generation.");
    } finally {
      setVideoLoading(false);
    }
  }

  async function handleGenerateMusic(e: FormEvent) {
    e.preventDefault();
    setMusicError(null);
    setGeneratedAudioUrl(null);
    setGeneratedLyrics("");

    if (!musicPrompt.trim()) {
      setMusicError("Please describe the music track you would like to generate.");
      return;
    }

    setMusicLoading(true);
    try {
      const res = await fetch("/api/media/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt.trim(),
          model: musicModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMusicError(data.message || "Music generation failed.");
        return;
      }
      setGeneratedAudioUrl(data.audioDataUrl);
      setGeneratedLyrics(data.lyrics || "");
    } catch {
      setMusicError("Network error while generating music.");
    } finally {
      setMusicLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Honest Paid-Tier Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-[#E6E8F0] bg-white p-4 text-sm text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#635BDB]" />
        <div>
          <p className="font-semibold text-[#141726]">
            Presentation Media Studio · Omni Flash Video &amp; Lyria Music
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
            Create presentation B-roll clips, animate slide visuals into video (
            <code className="font-mono text-[#141726]">gemini-omni-1.2-flash</code> via Interactions
            API), or compose focus &amp; intro tracks (
            <code className="font-mono text-[#141726]">lyria-3-clip-preview</code> /{" "}
            <code className="font-mono text-[#141726]">lyria-3-pro-preview</code>). Note: These
            generative media models require a billing-enabled Gemini API key selected in{" "}
            <span className="font-semibold text-[#141726]">Settings &gt; Secrets</span>.
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[#E6E8F0] bg-[#F1F3F6] p-1">
        {(
          [
            { id: "text-to-video", label: "Generate Video From Text", icon: Film },
            { id: "animate-image", label: "Animate Photo to Video", icon: ImagePlus },
            { id: "music", label: "Generate Music (Lyria)", icon: Music },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? "border border-[#E6E8F0] bg-white text-[#635BDB] shadow-2xs"
                  : "border border-transparent text-[#4B5563] hover:text-[#141726]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Video & Image Animation Panel */}
      {(activeTab === "text-to-video" || activeTab === "animate-image") && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleGenerateVideo}
            className="space-y-5 rounded-xl border border-[#E6E8F0] bg-white p-6 lg:col-span-5"
          >
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#141726]">
                {activeTab === "animate-image"
                  ? "Animate Photo Into Video"
                  : "Generate Video From Text"}
              </h2>
              <p className="mt-1 text-xs text-[#6B7280]">
                Powered by <span className="font-mono">gemini-omni-1.2-flash</span> · 720p MP4 output
              </p>
            </div>

            {activeTab === "animate-image" && (
              <div>
                <label className="block text-xs font-medium text-[#374151]">
                  Upload Starting Photo (PNG, JPEG, WebP)
                </label>
                {uploadedImagePreview ? (
                  <div className="relative mt-2 overflow-hidden rounded-lg border border-[#E6E8F0]">
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded starting frame"
                      className="max-h-48 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImagePreview(null);
                        setUploadedImageBase64(null);
                      }}
                      aria-label="Remove uploaded image"
                      className="absolute right-2 top-2 rounded-md bg-[#141726]/85 p-1 text-white hover:bg-[#141726] cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-[#F8F9FC] p-6 text-center transition-colors hover:border-[#635BDB] hover:bg-[#F0EEFF]/40">
                    <ImagePlus className="h-6 w-6 text-[#6B7280]" />
                    <span className="mt-2 text-xs font-medium text-[#374151]">
                      Click to choose a photo
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageSelect}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            )}

            <div>
              <label htmlFor="video-prompt" className="block text-xs font-medium text-[#374151]">
                {activeTab === "animate-image" ? "Motion Prompt" : "Scene Description"}
              </label>
              <textarea
                id="video-prompt"
                rows={4}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-[#374151]">Aspect Ratio</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "16:9", label: "16:9 Landscape" },
                    { id: "9:16", label: "9:16 Portrait" },
                  ] as const
                ).map((ratio) => (
                  <button
                    key={ratio.id}
                    type="button"
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      aspectRatio === ratio.id
                        ? "border-[#635BDB] bg-[#F0EEFF] text-[#635BDB]"
                        : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F8F9FC]"
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {videoError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{videoError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={videoLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#635BDB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] disabled:opacity-55 cursor-pointer"
            >
              {videoLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {videoLoading
                ? "Generating Video (May Take 1–2 Min)..."
                : activeTab === "animate-image"
                  ? "Animate Into Video"
                  : "Generate Video"}
            </button>
          </form>

          <div className="flex flex-col items-center justify-center rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] p-6 lg:col-span-7">
            {generatedVideoUrl ? (
              <div className="w-full space-y-3">
                <video
                  src={generatedVideoUrl}
                  controls
                  className="mx-auto max-h-[440px] w-full rounded-xl border border-[#E6E8F0] bg-[#0F131A]"
                />
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="font-mono tabular-nums">
                    gemini-omni-1.2-flash · {aspectRatio}
                  </span>
                  <a
                    href={generatedVideoUrl}
                    download={`speakmate-video-${aspectRatio.replace(":", "x")}.mp4`}
                    className="font-semibold text-[#635BDB] hover:underline"
                  >
                    Download MP4
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#E6E8F0] bg-white text-[#6B7280]">
                  <Film className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#141726]">
                  Generated Video Preview
                </p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#6B7280]">
                  Your 16:9 or 9:16 video clip generated via Interactions API will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Music Generation Panel (Lyria) */}
      {activeTab === "music" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleGenerateMusic}
            className="space-y-5 rounded-xl border border-[#E6E8F0] bg-white p-6 lg:col-span-5"
          >
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#141726]">
                Practice Focus &amp; Intro Music Studio
              </h2>
              <p className="mt-1 text-xs text-[#6B7280]">
                Generate warm-up background tracks or presentation intro music with Lyria.
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#374151]">Track Length Model</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMusicModel("lyria-3-clip-preview")}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    musicModel === "lyria-3-clip-preview"
                      ? "border-[#635BDB] bg-[#F0EEFF] text-[#635BDB]"
                      : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F8F9FC]"
                  }`}
                >
                  Lyria Clip (30s)
                </button>
                <button
                  type="button"
                  onClick={() => setMusicModel("lyria-3-pro-preview")}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    musicModel === "lyria-3-pro-preview"
                      ? "border-[#635BDB] bg-[#F0EEFF] text-[#635BDB]"
                      : "border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F8F9FC]"
                  }`}
                >
                  Lyria Pro (Full)
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="music-prompt" className="block text-xs font-medium text-[#374151]">
                Musical Style &amp; Mood Prompt
              </label>
              <textarea
                id="music-prompt"
                rows={4}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
              />
            </div>

            {musicError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{musicError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={musicLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#635BDB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] disabled:opacity-55 cursor-pointer"
            >
              {musicLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {musicLoading ? "Composing Track..." : "Generate Music Track"}
            </button>
          </form>

          <div className="flex flex-col items-center justify-center rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] p-6 lg:col-span-7">
            {generatedAudioUrl ? (
              <div className="w-full max-w-lg space-y-4">
                <div className="rounded-xl border border-[#E6E8F0] bg-white p-5">
                  <p className="font-mono text-xs font-medium text-[#635BDB]">{musicModel}</p>
                  <p className="mt-1 text-sm font-semibold text-[#141726]">Generated Audio Track</p>
                  <audio src={generatedAudioUrl} controls className="mt-4 w-full" />
                  <div className="mt-3 text-right">
                    <a
                      href={generatedAudioUrl}
                      download="speakmate-lyria-track.mp3"
                      className="text-xs font-semibold text-[#635BDB] hover:underline"
                    >
                      Download Audio
                    </a>
                  </div>
                </div>
                {generatedLyrics && (
                  <div className="rounded-xl border border-[#E6E8F0] bg-white p-4 text-xs text-[#374151] whitespace-pre-wrap">
                    <p className="font-semibold text-[#141726]">Generated Notes / Lyrics</p>
                    <p className="mt-1.5 leading-relaxed">{generatedLyrics}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#E6E8F0] bg-white text-[#6B7280]">
                  <Music className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#141726]">Generated Track Player</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#6B7280]">
                  Compose custom instrumental warm-up or presentation audio using Lyria.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
