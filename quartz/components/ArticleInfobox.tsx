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
}

.wiki-infobox--chronicle-mage .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, #3a8eff 44%, var(--lightgray));
  background: color-mix(in srgb, #3a8eff 20%, var(--light));
  color: color-mix(in srgb, #3a8eff 76%, var(--dark));
}

.wiki-infobox--chronicle-changeling .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, #ffd74a 56%, var(--lightgray));
  background: color-mix(in srgb, #ffd74a 24%, var(--light));
  color: color-mix(in srgb, #b28700 78%, var(--dark));
}

.wiki-infobox--chronicle-demon .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, #38c772 46%, var(--lightgray));
  background: color-mix(in srgb, #38c772 22%, var(--light));
  color: color-mix(in srgb, #1f9a53 78%, var(--dark));
}

.wiki-infobox--chronicle-werewolf .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, #ef5350 42%, var(--lightgray));
  background: color-mix(in srgb, #ef5350 18%, var(--light));
  color: color-mix(in srgb, #cc2f2c 78%, var(--dark));
}

.wiki-infobox--chronicle-hunter .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, #ff9800 52%, var(--lightgray));
  background: color-mix(in srgb, #ff9800 20%, var(--light));
  color: color-mix(in srgb, #b66600 82%, var(--dark));
}

.wiki-infobox--chronicle-vampire .wiki-infobox__header {
  border-bottom-color: color-mix(in srgb, #ab47bc 44%, var(--lightgray));
  background: color-mix(in srgb, #ab47bc 22%, var(--light));
  color: color-mix(in srgb, #7d1e8d 82%, var(--dark));
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
  color: var(--light);
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
  color: var(--light);
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
