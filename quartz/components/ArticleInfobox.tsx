import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { FilePath, FullSlug, resolveRelative, slugifyFilePath } from "../util/path"

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

const PRIORITY_FIELDS = [
  "race",
  "faction",
  "status",
  "season",
  "episode",
  "location",
  "clan",
  "tribe",
]

function formatLabel(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase())
}

function resolveImage(value: string, currentSlug: string): string {
  if (
    /^https?:\/\//.test(value) ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/")
  ) {
    return value
  }

  const normalized = value.replace(/^\[\[|\]\]$/g, "").trim()
  if (normalized) {
    const slug = slugifyFilePath(`${normalized}.md` as FilePath)
    return resolveRelative(currentSlug as FullSlug, slug)
  }

  return value
}

function parseWikiLinks(raw: string, currentSlug: string) {
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
      const slug = slugifyFilePath(`${target}.md` as FilePath)
      const href = resolveRelative(currentSlug as FullSlug, slug)
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

function renderValue(value: unknown, currentSlug: string) {
  if (Array.isArray(value)) {
    const rendered = value
      .map((entry) => (typeof entry === "string" ? entry : String(entry)))
      .join(", ")
    return renderValue(rendered, currentSlug)
  }

  const raw = String(value ?? "").trim()
  if (!raw) return null

  const parts = parseWikiLinks(raw, currentSlug)
  return (
    <span>
      {parts.map((part, idx) =>
        typeof part === "string" ? (
          <span key={idx}>{part}</span>
        ) : (
          <a key={idx} href={part.href} class="internal">
            {part.label}
          </a>
        ),
      )}
    </span>
  )
}

const ArticleInfobox: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  if (fileData.slug === "index") return null

  const frontmatter = fileData.frontmatter ?? {}
  const entries = Object.entries(frontmatter)

  const imageEntry = entries.find(([key, value]) => IMAGE_KEYS.includes(key.toLowerCase()) && value)

  const infoEntries = entries
    .filter(
      ([key, value]) =>
        value !== undefined && value !== null && !IMAGE_KEYS.includes(key.toLowerCase()),
    )
    .filter(([key]) => !EXCLUDED_KEYS.has(key.toLowerCase()))
    .sort(([a], [b]) => {
      const aIdx = PRIORITY_FIELDS.indexOf(a.toLowerCase())
      const bIdx = PRIORITY_FIELDS.indexOf(b.toLowerCase())
      const aScore = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx
      const bScore = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx
      return aScore - bScore || a.localeCompare(b)
    })

  if (!imageEntry && infoEntries.length === 0) return null

  const imageValue = imageEntry ? String(imageEntry[1]).trim() : ""

  return (
    <aside class={classNames(displayClass, "wiki-infobox")}>
      {imageValue && (
        <div class="wiki-infobox__image-wrap">
          <img
            src={resolveImage(imageValue, fileData.slug!)}
            alt={String(fileData.frontmatter?.title ?? fileData.title ?? "Infobox image")}
          />
        </div>
      )}

      {infoEntries.length > 0 && (
        <dl class="wiki-infobox__meta">
          {infoEntries.map(([key, value]) => (
            <div key={key} class="wiki-infobox__row">
              <dt>{formatLabel(key)}:</dt>
              <dd>{renderValue(value, fileData.slug!)}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  )
}

ArticleInfobox.css = `
.wiki-infobox {
  border: 1px solid var(--lightgray);
  border-radius: 12px;
  background: color-mix(in srgb, var(--light) 98%, transparent);
  overflow: hidden;
  margin-bottom: 1.2rem;
}

.wiki-infobox__image-wrap {
  line-height: 0;
  border-bottom: 1px solid var(--lightgray);
  background: color-mix(in srgb, var(--lightgray) 30%, transparent);
}

.wiki-infobox__image-wrap img {
  width: 100%;
  max-height: 360px;
  object-fit: cover;
  display: block;
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

export default (() => ArticleInfobox) satisfies QuartzComponentConstructor
