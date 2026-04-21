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

const CHRONICLE_ICON_PATHS: Record<ChronicleTone, string> = {
  mage: "M4 3h12l3 3v13H5L4 3zm2.4 2.2.6 11.6h9.6V7.1l-1.4-1.9H6.4zM12 8l1.2 2.2 2.4.4-1.7 1.6.4 2.3-2.3-1.1-2.3 1.1.4-2.3-1.7-1.6 2.4-.4L12 8z",
  changeling:
    "M12 6.3a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM7 9.5c1.8 0 3.2.7 4.1 2.2-.8.9-1.4 1.9-1.8 3C7.5 14.1 6 13 5.4 11.6c.2-1.4.8-2.1 1.6-2.1zm10 0c.8 0 1.4.7 1.6 2.1-.6 1.4-2.1 2.5-3.9 3.1-.4-1.1-1-2.1-1.8-3 .9-1.5 2.3-2.2 4.1-2.2zM9.7 14.8l2.3 3.4 2.3-3.4c1.4.2 2.5.8 3.2 1.8-.8 1.3-3 2.1-5.5 2.1s-4.7-.8-5.5-2.1c.7-1 1.8-1.6 3.2-1.8z",
  demon:
    "M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4zm0 1.9A7.3 7.3 0 1 0 12 19.3 7.3 7.3 0 0 0 12 4.7zm0 2.7 2 3.2h3.8L16 13.8l1.8 3.2H14L12 20.2 10 17H6.2L8 13.8l-1.8-3.2H10L12 7.4zM12 1a1.3 1.3 0 1 1 0 2.6A1.3 1.3 0 0 1 12 1zm0 19.4a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z",
  werewolf:
    "M12 2.6a9.4 9.4 0 0 1 7.2 3.3l-1.5 1.2A7.4 7.4 0 0 0 12 4.6c-2.8 0-5.2 1.5-6.5 3.8l2.6-1.2 1.8.7 2.2-1.6 1.5.8 1.9-.8-.6 2.1 1.8 1.2-.9 2 1.7.9-1.6 1.4.5 2-1.9-.4-1.2 1.6-1.4-1.4-1.9.6.2-2.1-1.8-.9 1.2-1.8-1.5-1.4.9-2L5 10.5A7.4 7.4 0 0 0 12 19.4c1.7 0 3.2-.6 4.4-1.5l1.3 1.5a9.3 9.3 0 0 1-5.7 2 9.4 9.4 0 0 1 0-18.8z",
  hunter:
    "M10.8 2h2.4v3h2.3l1.4 1.4v2.2h3v2.4h-3v2.2l-1.4 1.4h-2.3V22h-2.4v-6.4H8.5L7 14.2V12H4v-2.4h3V7.4L8.5 6h2.3V2zm-1.4 5.4v5.8h5.2V7.4H9.4zM12 0a1.4 1.4 0 1 1 0 2.8A1.4 1.4 0 0 1 12 0zm0 21.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z",
  vampire:
    "M2.5 7c1.8 0 3.2.8 4.1 2.4l1.2 2.2c.4.6.9.9 1.6.9h5.2c.7 0 1.2-.3 1.6-.9L17.4 9c.9-1.2 2.3-2 4.1-2-.3 3.7-2.2 6.7-5.8 8.7h-7.4C4.7 13.8 2.8 10.8 2.5 7zm3.2-.8c0 1.8 1.4 3.3 3.2 3.3S12 8 12 6.2 10.6 3 8.9 3 5.7 4.4 5.7 6.2zm9.4 0c0 1.8 1.4 3.3 3.2 3.3s3.2-1.4 3.2-3.3S20.1 3 18.3 3s-3.2 1.4-3.2 3.2zM8.8 15.7h2.8l-.8 3.3H8.5l.3-3.3zm3.8 0h2.8l.3 3.3h-2.3l-.8-3.3z",
}

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
  const chronicleIconUrl = chronicleTone ? `/WoD/static/chronicle-icons/${chronicleTone}.svg` : ""

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
          <svg
            class={classNames(
              "wiki-infobox__chronicle-icon",
              `wiki-infobox__chronicle-icon--${chronicleTone}`,
            )}
            style={`--chronicle-icon-url: url('${chronicleIconUrl}');`}
            aria-hidden="true"
          >
            <path d={CHRONICLE_ICON_PATHS[chronicleTone]} />
          </svg>
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
  width: 32px;
  height: 32px;
  margin-left: auto;
  background-image: var(--chronicle-icon-url);
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  opacity: 0.92;
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
