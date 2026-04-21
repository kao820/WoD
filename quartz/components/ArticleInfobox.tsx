import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames, stripOrderingPrefix } from "../util/lang"
import { FilePath, FullSlug, pathToRoot, resolveRelative, slugifyFilePath } from "../util/path"
// @ts-ignore
import infoboxImageExpandScript from "./scripts/infobox-image-expand.inline"

const IMAGE_KEYS = ["image", "cover", "portrait", "avatar", "art", "illustration"]
const EXCLUDED_KEYS = new Set([
  "title",
  "tags",
  "aliases",
  "modified",
  "created",
  "published",
  "description",
  "socialdescription",
  "publish",
  "draft",
  "lang",
  "enabletoc",
  "cssclasses",
  "socialimage",
  "comments",
])

type ChronicleTone = "mage" | "changeling" | "demon" | "werewolf" | "hunter" | "vampire"

function detectChronicleTone(value: string): ChronicleTone | null {
  const normalized = value.toLowerCase()
  if (normalized.includes("mage") || normalized.includes("маг")) return "mage"
  if (normalized.includes("changeling") || normalized.includes("фе")) return "changeling"
  if (normalized.includes("demon") || normalized.includes("демон")) return "demon"
  if (normalized.includes("werewolf") || normalized.includes("оборот")) return "werewolf"
  if (normalized.includes("hunter") || normalized.includes("охот")) return "hunter"
  if (normalized.includes("vampire") || normalized.includes("вампир")) return "vampire"
  return null
}

function resolveImage(value: string, currentSlug: string): string | null {
  if (
    /^https?:\/\//.test(value) ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/")
  ) {
    return value
  }

  const normalized = value
    .replace(/^\[\[|\]\]$/g, "")
    .split("|")[0]
    .trim()
  if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(normalized)) {
    const encoded = normalized
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/")
    return `${pathToRoot(currentSlug as FullSlug)}/assets/${encoded}`
  }

  return null
}

function resolveWikiHref(
  rawTarget: string,
  currentSlug: string,
  allFiles: QuartzComponentProps["allFiles"],
) {
  const target = rawTarget.trim()
  const targetLower = target.toLowerCase()

  const direct = allFiles.find((entry) => {
    if (!entry.slug) return false
    const fromTitle = String(entry.frontmatter?.title ?? entry.title ?? "").toLowerCase()
    const slugTail = entry.slug.split("/").pop()?.toLowerCase() ?? ""
    return fromTitle === targetLower || slugTail === targetLower.replace(/\s+/g, "-")
  })

  if (direct?.slug) {
    return resolveRelative(currentSlug as FullSlug, direct.slug)
  }

  const slug = slugifyFilePath(`${target}.md` as FilePath)
  return resolveRelative(currentSlug as FullSlug, slug)
}

function parseWikiLinks(
  raw: string,
  currentSlug: string,
  allFiles: QuartzComponentProps["allFiles"],
) {
  const chunks: Array<string | { label: string; href: string }> = []
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      chunks.push(raw.slice(lastIndex, match.index))
    }

    const target = match[1].trim()
    const label = (match[2] ?? target).trim()

    try {
      const href = resolveWikiHref(target, currentSlug, allFiles)
      chunks.push({ label, href })
    } catch {
      chunks.push(label)
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < raw.length) {
    chunks.push(raw.slice(lastIndex))
  }

  return chunks
}

function renderValue(
  value: unknown,
  currentSlug: string,
  allFiles: QuartzComponentProps["allFiles"],
) {
  if (Array.isArray(value)) {
    const rendered = value
      .map((entry) => (typeof entry === "string" ? entry : String(entry)))
      .join(", ")
    return renderValue(rendered, currentSlug, allFiles)
  }

  const raw = String(value ?? "").trim()
  if (!raw) return null

  const parts = parseWikiLinks(raw, currentSlug, allFiles)
  return (
    <span>
      {parts.map((part, idx) =>
        typeof part === "string" ? (
          <span key={idx}>{part}</span>
        ) : (
          <a key={idx} href={part.href} class="internal">
            {stripOrderingPrefix(part.label)}
          </a>
        ),
      )}
    </span>
  )
}

const ArticleInfobox: QuartzComponent = ({
  fileData,
  displayClass,
  allFiles,
}: QuartzComponentProps) => {
  if (fileData.slug === "index") return null
  const displayTokens = (displayClass ?? "").split(/\s+/).filter(Boolean)
  if (
    displayTokens.length > 0 &&
    !displayTokens.includes("wiki-infobox-inline") &&
    !displayTokens.includes("popover-hint")
  ) {
    return null
  }
  if (displayTokens.includes("popover-hint")) {
    return null
  }

  const frontmatter = (fileData.frontmatter ?? {}) as Record<string, unknown>
  const entries = Object.entries(frontmatter)

  const imageEntry = entries.find(([key, value]) => IMAGE_KEYS.includes(key.toLowerCase()) && value)

  const infoEntries = entries
    .filter(
      ([key, value]) =>
        value !== undefined &&
        value !== null &&
        !IMAGE_KEYS.includes(key.toLowerCase()) &&
        key.toLowerCase() !== "type",
    )
    .filter(([key]) => !EXCLUDED_KEYS.has(key.toLowerCase()))

  if (!imageEntry && infoEntries.length === 0) return null

  const imageValue = imageEntry ? String(imageEntry[1]).trim() : ""
  const resolvedImage = imageValue ? resolveImage(imageValue, fileData.slug!) : null
  const typeValue =
    typeof frontmatter.type === "string" ? frontmatter.type.toLowerCase().trim() : ""
  const chronicleEntry = entries.find(([key, value]) => {
    const normalizedKey = key.toLowerCase()
    return value && (normalizedKey === "хроника" || normalizedKey === "chronicle")
  })
  const chronicleTone = chronicleEntry ? detectChronicleTone(String(chronicleEntry[1])) : null

  return (
    <aside
      class={classNames(
        displayClass,
        "wiki-infobox",
        typeValue && `wiki-infobox--${typeValue}`,
        chronicleTone && `wiki-infobox--chronicle-${chronicleTone}`,
      )}
    >
      <div class="wiki-infobox__header">
        <span>{typeValue ? typeValue.toUpperCase() : "ИНФОРМАЦИЯ"}</span>
        {chronicleTone && (
          <span
            class={classNames(
              "wiki-infobox__chronicle-icon",
              `wiki-infobox__chronicle-icon--${chronicleTone}`,
            )}
            aria-hidden="true"
          ></span>
        )}
      </div>
      {resolvedImage && (
        <div class="wiki-infobox__image-wrap">
          <img
            src={resolvedImage}
            alt={String(fileData.frontmatter?.title ?? fileData.title ?? "Infobox image")}
          />
          <button
            type="button"
            class="wiki-infobox__image-expand"
            aria-label="Развернуть изображение"
            title="Развернуть изображение"
          >
            ⤢
          </button>
        </div>
      )}
      {resolvedImage && (
        <dialog class="wiki-infobox__image-modal">
          <button
            type="button"
            class="wiki-infobox__image-close"
            aria-label="Закрыть изображение"
            title="Закрыть изображение"
          >
            ✕
          </button>
          <img
            class="wiki-infobox__image-modal-content"
            src={resolvedImage}
            alt={String(fileData.frontmatter?.title ?? fileData.title ?? "Infobox image")}
          />
        </dialog>
      )}

      {infoEntries.length > 0 && (
        <dl class="wiki-infobox__meta">
          {infoEntries.map(([key, value]) => (
            <div key={key} class="wiki-infobox__row">
              <dt>{`${key}`}</dt>
              <dd>{renderValue(value, fileData.slug!, allFiles)}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  )
}

ArticleInfobox.css = `
.wiki-infobox {
  float: right;
  width: min(360px, 42%);
  margin: 0 0 1rem 1rem;
  border: 2px solid color-mix(in srgb, var(--secondary) 38%, var(--lightgray));
  border-radius: 12px;
  background: color-mix(in srgb, var(--light) 96%, transparent);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--dark) 8%, transparent);
  overflow: hidden;
}

.wiki-infobox:not(.wiki-infobox-inline) {
  display: none !important;
}

.wiki-infobox--игрок {
  border-color: color-mix(in srgb, #4ea8de 45%, var(--lightgray));
}

.wiki-infobox--локация {
  border-color: color-mix(in srgb, #70c1b3 45%, var(--lightgray));
}

.wiki-infobox--фракция {
  border-color: color-mix(in srgb, #a06cd5 45%, var(--lightgray));
}

.wiki-infobox__header {
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid color-mix(in srgb, var(--secondary) 20%, var(--lightgray));
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--secondary);
  background: color-mix(in srgb, var(--secondary) 8%, var(--light));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.35rem;
}

.wiki-infobox__chronicle-icon {
  display: inline-block;
  flex-shrink: 0;
  width: 19px;
  height: 19px;
  margin-left: auto;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  opacity: 0.92;
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
}

.wiki-infobox__chronicle-icon--mage {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l1.7 4.3L18 8l-4.3 1.7L12 14l-1.7-4.3L6 8l4.3-1.7L12 2zm-6 11l1 2.5L9.5 16 7 17l-1 2.5L5 17l-2.5-1L5 15.5 6 13zm12 0l1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-.5 1-2.5zM12 11l1.2 3 3 .8-3 1.2-1.2 3-1.2-3-3-1.2 3-.8 1.2-3z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l1.7 4.3L18 8l-4.3 1.7L12 14l-1.7-4.3L6 8l4.3-1.7L12 2zm-6 11l1 2.5L9.5 16 7 17l-1 2.5L5 17l-2.5-1L5 15.5 6 13zm12 0l1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-.5 1-2.5zM12 11l1.2 3 3 .8-3 1.2-1.2 3-1.2-3-3-1.2 3-.8 1.2-3z'/%3E%3C/svg%3E");
}

.wiki-infobox__chronicle-icon--changeling {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3c2.8 0 5 2.2 5 5 0 1.9-1 3.5-2.6 4.4l-.4 3.1 2.5-1.4-.6 3.2-3 1.7L12 22l-1-3-3-1.7-.6-3.2 2.5 1.4-.4-3.1A5 5 0 0 1 7 8c0-2.8 2.2-5 5-5zm0 2.2A2.8 2.8 0 1 0 12 11a2.8 2.8 0 0 0 0-5.6z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3c2.8 0 5 2.2 5 5 0 1.9-1 3.5-2.6 4.4l-.4 3.1 2.5-1.4-.6 3.2-3 1.7L12 22l-1-3-3-1.7-.6-3.2 2.5 1.4-.4-3.1A5 5 0 0 1 7 8c0-2.8 2.2-5 5-5zm0 2.2A2.8 2.8 0 1 0 12 11a2.8 2.8 0 0 0 0-5.6z'/%3E%3C/svg%3E");
}

.wiki-infobox__chronicle-icon--demon {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 3c1.3 1.4 2 2.6 2 4.1C9 8.7 7.9 10 6.2 10.9A4 4 0 0 0 8 14.3V19l4-2 4 2v-4.7a4 4 0 0 0 1.8-3.4c-1.7-.9-2.8-2.2-2.8-3.8 0-1.5.7-2.7 2-4.1L13.6 5 12 3.5 10.4 5 7 3zm5 5.7c1.8 0 3.3 1.5 3.3 3.3S13.8 15.3 12 15.3 8.7 13.8 8.7 12 10.2 8.7 12 8.7z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 3c1.3 1.4 2 2.6 2 4.1C9 8.7 7.9 10 6.2 10.9A4 4 0 0 0 8 14.3V19l4-2 4 2v-4.7a4 4 0 0 0 1.8-3.4c-1.7-.9-2.8-2.2-2.8-3.8 0-1.5.7-2.7 2-4.1L13.6 5 12 3.5 10.4 5 7 3zm5 5.7c1.8 0 3.3 1.5 3.3 3.3S13.8 15.3 12 15.3 8.7 13.8 8.7 12 10.2 8.7 12 8.7z'/%3E%3C/svg%3E");
}

.wiki-infobox__chronicle-icon--werewolf {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5.5 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM12 9c3.7 0 6 2.3 6 5.3C18 17.5 15.4 20 12 20s-6-2.5-6-5.7C6 11.3 8.3 9 12 9zm-2 3.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5.5 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM12 9c3.7 0 6 2.3 6 5.3C18 17.5 15.4 20 12 20s-6-2.5-6-5.7C6 11.3 8.3 9 12 9zm-2 3.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z'/%3E%3C/svg%3E");
}

.wiki-infobox__chronicle-icon--hunter {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M11 2h2v3.1a7 7 0 0 1 5.9 5.9H22v2h-3.1a7 7 0 0 1-5.9 5.9V22h-2v-3.1a7 7 0 0 1-5.9-5.9H2v-2h3.1a7 7 0 0 1 5.9-5.9V2zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-1 2h2v2h2v2h-2v2h-2v-2H9v-2h2V9z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M11 2h2v3.1a7 7 0 0 1 5.9 5.9H22v2h-3.1a7 7 0 0 1-5.9 5.9V22h-2v-3.1a7 7 0 0 1-5.9-5.9H2v-2h3.1a7 7 0 0 1 5.9-5.9V2zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-1 2h2v2h2v2h-2v2h-2v-2H9v-2h2V9z'/%3E%3C/svg%3E");
}

.wiki-infobox__chronicle-icon--vampire {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 4h12l-1.2 6.8A4.8 4.8 0 0 1 12 15a4.8 4.8 0 0 1-4.8-4.2L6 4zm2.4 2 .7 4a2.9 2.9 0 0 0 5.8 0l.7-4H8.4zM9 16h2l-1 4H8l1-4zm4 0h2l1 4h-2l-1-4z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 4h12l-1.2 6.8A4.8 4.8 0 0 1 12 15a4.8 4.8 0 0 1-4.8-4.2L6 4zm2.4 2 .7 4a2.9 2.9 0 0 0 5.8 0l.7-4H8.4zM9 16h2l-1 4H8l1-4zm4 0h2l1 4h-2l-1-4z'/%3E%3C/svg%3E");
}

.wiki-infobox[class*="wiki-infobox--chronicle-"] {
  border-color: color-mix(in srgb, var(--chronicle-accent) 44%, var(--lightgray));
}

.wiki-infobox[class*="wiki-infobox--chronicle-"] .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, var(--chronicle-accent) 52%, var(--lightgray));
  background: color-mix(in srgb, var(--chronicle-accent) 20%, var(--light));
  color: color-mix(in srgb, var(--chronicle-accent-text, var(--chronicle-accent)) 78%, var(--dark));
}

.wiki-infobox[class*="wiki-infobox--chronicle-"] .wiki-infobox__row dd a.internal {
  color: color-mix(in srgb, var(--chronicle-accent-text, var(--chronicle-accent)) 78%, var(--dark));
  background: color-mix(in srgb, var(--chronicle-accent) 14%, var(--light));
  border-radius: 6px;
  padding: 0.02rem 0.22rem;
}

.wiki-infobox--chronicle-mage {
  --chronicle-accent: #3a8eff;
  --chronicle-accent-text: #3a8eff;
}

.wiki-infobox--chronicle-changeling {
  --chronicle-accent: #ffd74a;
  --chronicle-accent-text: #b28700;
}

.wiki-infobox--chronicle-demon {
  --chronicle-accent: #38c772;
  --chronicle-accent-text: #1f9a53;
}

.wiki-infobox--chronicle-werewolf {
  --chronicle-accent: #ef5350;
  --chronicle-accent-text: #cc2f2c;
}

.wiki-infobox--chronicle-hunter {
  --chronicle-accent: #ff9800;
  --chronicle-accent-text: #b66600;
}

.wiki-infobox--chronicle-vampire {
  --chronicle-accent: #ab47bc;
  --chronicle-accent-text: #7d1e8d;
}

body[data-chronicle-tone="mage"] {
  --chronicle-accent: #3a8eff;
  --chronicle-accent-text: #3a8eff;
}

body[data-chronicle-tone="changeling"] {
  --chronicle-accent: #ffd74a;
  --chronicle-accent-text: #b28700;
}

body[data-chronicle-tone="demon"] {
  --chronicle-accent: #38c772;
  --chronicle-accent-text: #1f9a53;
}

body[data-chronicle-tone="werewolf"] {
  --chronicle-accent: #ef5350;
  --chronicle-accent-text: #cc2f2c;
}

body[data-chronicle-tone="hunter"] {
  --chronicle-accent: #ff9800;
  --chronicle-accent-text: #b66600;
}

body[data-chronicle-tone="vampire"] {
  --chronicle-accent: #ab47bc;
  --chronicle-accent-text: #7d1e8d;
}

body[data-chronicle-tone] article a.internal,
body[data-chronicle-tone] .backlinks a.internal,
body[data-chronicle-tone] .toc a.internal,
body[data-chronicle-tone] .tags a.internal.tag-link {
  color: color-mix(in srgb, var(--chronicle-accent-text, var(--chronicle-accent)) 82%, var(--dark));
}

body[data-chronicle-tone] .tags a.internal.tag-link,
body[data-chronicle-tone] article a.internal {
  background: color-mix(in srgb, var(--chronicle-accent) 12%, var(--light));
  border-radius: 6px;
  padding: 0.02rem 0.24rem;
}

body[data-chronicle-tone] .backlinks ul li::marker {
  color: color-mix(in srgb, var(--chronicle-accent) 72%, var(--secondary));
}

body[data-chronicle-tone] .toc .active {
  border-left-color: color-mix(in srgb, var(--chronicle-accent) 82%, var(--secondary));
}

.wiki-infobox[class*="wiki-infobox--chronicle-"] {
  border-color: color-mix(in srgb, var(--chronicle-accent) 44%, var(--lightgray));
}

.wiki-infobox[class*="wiki-infobox--chronicle-"] .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, var(--chronicle-accent) 52%, var(--lightgray));
  background: color-mix(in srgb, var(--chronicle-accent) 20%, var(--light));
  color: color-mix(in srgb, var(--chronicle-accent-text, var(--chronicle-accent)) 78%, var(--dark));
}

.wiki-infobox[class*="wiki-infobox--chronicle-"] .wiki-infobox__row dd a.internal {
  color: color-mix(in srgb, var(--chronicle-accent-text, var(--chronicle-accent)) 78%, var(--dark));
  background: color-mix(in srgb, var(--chronicle-accent) 14%, var(--light));
  border-radius: 6px;
  padding: 0.02rem 0.22rem;
}

.wiki-infobox--chronicle-mage {
  --chronicle-accent: #3a8eff;
  --chronicle-accent-text: #3a8eff;
}

.wiki-infobox--chronicle-changeling {
  --chronicle-accent: #ffd74a;
  --chronicle-accent-text: #b28700;
}

.wiki-infobox--chronicle-demon {
  --chronicle-accent: #38c772;
  --chronicle-accent-text: #1f9a53;
}

.wiki-infobox--chronicle-werewolf {
  --chronicle-accent: #ef5350;
  --chronicle-accent-text: #cc2f2c;
}

.wiki-infobox--chronicle-hunter {
  --chronicle-accent: #ff9800;
  --chronicle-accent-text: #b66600;
}

.wiki-infobox--chronicle-vampire {
  --chronicle-accent: #ab47bc;
  --chronicle-accent-text: #7d1e8d;
}

body[data-chronicle-tone="mage"] {
  --chronicle-accent: #3a8eff;
  --chronicle-accent-text: #3a8eff;
}

body[data-chronicle-tone="changeling"] {
  --chronicle-accent: #ffd74a;
  --chronicle-accent-text: #b28700;
}

body[data-chronicle-tone="demon"] {
  --chronicle-accent: #38c772;
  --chronicle-accent-text: #1f9a53;
}

body[data-chronicle-tone="werewolf"] {
  --chronicle-accent: #ef5350;
  --chronicle-accent-text: #cc2f2c;
}

body[data-chronicle-tone="hunter"] {
  --chronicle-accent: #ff9800;
  --chronicle-accent-text: #b66600;
}

body[data-chronicle-tone="vampire"] {
  --chronicle-accent: #ab47bc;
  --chronicle-accent-text: #7d1e8d;
}

body[data-chronicle-tone] article a.internal,
body[data-chronicle-tone] .backlinks a.internal,
body[data-chronicle-tone] .toc a.internal,
body[data-chronicle-tone] .tags a.internal.tag-link {
  color: color-mix(in srgb, var(--chronicle-accent-text, var(--chronicle-accent)) 82%, var(--dark));
}

body[data-chronicle-tone] .tags a.internal.tag-link,
body[data-chronicle-tone] article a.internal {
  background: color-mix(in srgb, var(--chronicle-accent) 12%, var(--light));
  border-radius: 6px;
  padding: 0.02rem 0.24rem;
}

body[data-chronicle-tone] .backlinks ul li::marker {
  color: color-mix(in srgb, var(--chronicle-accent) 72%, var(--secondary));
}

body[data-chronicle-tone] .toc .active {
  border-left-color: color-mix(in srgb, var(--chronicle-accent) 82%, var(--secondary));
}


@media (max-width: 1000px) {
  .wiki-infobox {
    float: none;
    width: 100%;
    margin: 0 0 1rem;
  }
}

.page article::after {
  content: "";
  display: block;
  clear: both;
}

.wiki-infobox__image-wrap {
  position: relative;
  line-height: 0;
  border-bottom: 1px solid var(--lightgray);
  background: color-mix(in srgb, var(--lightgray) 30%, transparent);
}

.wiki-infobox__image-wrap img {
  width: 100%;
  height: 340px;
  object-fit: cover;
  object-position: center;
  display: block;
  margin: 0 !important;
}

.wiki-infobox__image-expand {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 32px;
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--darkgray) 65%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--dark) 24%, transparent);
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.wiki-infobox__image-modal {
  border: none;
  padding: 0;
  margin: 0;
  max-width: min(96vw, 1700px);
  max-height: 96vh;
  width: fit-content;
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  overflow: visible;
  background: transparent;
}

.wiki-infobox__image-modal::backdrop {
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(2px);
}

.wiki-infobox__image-modal-content {
  display: block;
  max-width: min(96vw, 1700px);
  max-height: 92vh;
  width: auto;
  height: auto;
  border-radius: 8px;
}

.wiki-infobox__image-close {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 2;
  pointer-events: auto;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--darkgray) 65%, transparent);
  background: color-mix(in srgb, var(--dark) 78%, transparent);
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

.wiki-infobox__meta {
  margin: 0;
  padding: 0.7rem 0.8rem;
}

.wiki-infobox__row {
  display: grid;
  grid-template-columns: minmax(90px, 34%) minmax(0, 1fr);
  gap: 0.45rem;
  margin: 0;
  padding: 0.34rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--lightgray) 70%, transparent);
}

.wiki-infobox__row:last-child {
  border-bottom: none;
}

.wiki-infobox__row dt,
.wiki-infobox__row dd {
  margin: 0;
  font-size: 0.9rem;
}

.wiki-infobox__row dt {
  font-weight: 700;
}

.wiki-infobox__row dd {
  color: var(--darkgray);
  overflow-wrap: anywhere;
}

.wiki-infobox__row dd a.internal {
  text-decoration: underline;
  text-underline-offset: 2px;
}
`
ArticleInfobox.afterDOMLoaded = infoboxImageExpandScript

export default (() => ArticleInfobox) satisfies QuartzComponentConstructor
