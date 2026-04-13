import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { FilePath, resolveRelative, slugifyFilePath } from "../util/path"

type CampaignCardConfig = {
  notePath: string
  cover: string
  subtitle?: string
}

const CAMPAIGN_CARDS: CampaignCardConfig[] = [
  {
    notePath: "01 Хронология/01 Mage The Ascension.md",
    cover: "./static/campaign-covers/mage-the-ascension.jpg",
    subtitle: "Парадигмы, аватары и война за Истину",
  },
  {
    notePath: "01 Хронология/02 Changeling The dreaming.md",
    cover: "./static/campaign-covers/changeling-the-dreaming.jpg",
    subtitle: "Аркадия, грёзы и жестокая реальность",
  },
  {
    notePath: "01 Хронология/03 Demon The Fallen.md",
    cover: "./static/campaign-covers/demon-the-fallen.jpg",
    subtitle: "Падшие, клятвы и сделки во тьме",
  },
  {
    notePath: "01 Хронология/04 Werewolf The Apocalypse.md",
    cover: "./static/campaign-covers/werewolf-the-apocalypse.jpg",
    subtitle: "Ярость Гару и война за мир духов",
  },
  {
    notePath: "01 Хронология/05 Hunter The Reckoning.md",
    cover: "./static/campaign-covers/hunter-the-reckoning.jpg",
    subtitle: "Охотники, заговоры и грань выживания",
  },
  {
    notePath: "01 Хронология/06 Vampire The Masquerade.md",
    cover: "./static/campaign-covers/vampire-the-masquerade.jpg",
    subtitle: "Городские интриги, кровь и маскарад",
  },
]

const HomeCampaignHub: QuartzComponent = ({
  allFiles,
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  if (fileData.slug !== "index") return null

  const cards = CAMPAIGN_CARDS.map((card) => {
    const file = allFiles.find((entry) => entry.filePath?.endsWith(card.notePath))

    if (file?.slug) {
      return {
        ...card,
        title: file.frontmatter?.title ?? file.title ?? card.notePath.replace(/\.md$/, ""),
        href: resolveRelative(fileData.slug!, file.slug),
      }
    }

    const fallbackSlug = slugifyFilePath(`content/${card.notePath}` as FilePath)
    return {
      ...card,
      title: card.notePath.replace(/^[0-9]+\s/, "").replace(/\.md$/, ""),
      href: resolveRelative(fileData.slug!, fallbackSlug),
    }
  })

  return (
    <section class={classNames(displayClass, "home-campaign-hub")}>
      <h2 class="home-campaign-hub__title">Мир Тьмы LRS</h2>
      <p class="home-campaign-hub__intro">
        Вики кампаний в <strong>Мире Тьмы</strong>, которые проводились на калане LivingRoomStudio
      </p>
      <div class="home-campaign-hub__grid">
        {cards.map((card) => (
          <a key={card.notePath} href={card.href} class="home-campaign-card internal">
            <div class="home-campaign-card__cover">
              <img src={card.cover} alt={String(card.title)} />
            </div>
            <div class="home-campaign-card__overlay"></div>
            <div class="home-campaign-card__content">
              <h3>{card.title}</h3>
              {card.subtitle && <p>{card.subtitle}</p>}
            </div>
          </a>
        ))}

        {[1, 2].map((idx) => (
          <div
            key={idx}
            class="home-campaign-card home-campaign-card--coming-soon"
            aria-label="Coming soon"
          >
            <div class="home-campaign-card__content">
              <p class="home-campaign-card__tag">Coming Soon</p>
              <h3>Новая хроника</h3>
              <p>Скоро здесь появится следующая кампания.</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

HomeCampaignHub.css = `
.home-campaign-hub {
  margin: 1rem 0 2.5rem;
}

.home-campaign-hub__title {
  margin: 0 0 0.35rem;
  font-size: clamp(2rem, 3.6vw, 2.8rem);
}

.home-campaign-hub__intro {
  margin: 0 0 1rem;
  color: var(--dark);
  font-family: var(--bodyFont);
}

.page[data-slug="index"] .article-title,
.page[data-slug="index"] .content-meta,
.page[data-slug="index"] article.popover-hint,
.page[data-slug="index"] .center > hr,
.page[data-slug="index"] .page-footer {
  display: none;
}

.home-campaign-hub__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.home-campaign-card {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  min-height: 220px;
  border: 1px solid color-mix(in srgb, var(--lightgray) 58%, transparent);
  background: linear-gradient(165deg, color-mix(in srgb, var(--dark) 86%, black), color-mix(in srgb, var(--tertiary) 26%, var(--dark)));
  display: flex;
  align-items: flex-end;
}

a.home-campaign-card {
  text-decoration: none;
}

.home-campaign-card__cover,
.home-campaign-card__overlay {
  position: absolute;
  inset: 0;
}

.home-campaign-card__cover {
  opacity: 0.94;
  overflow: hidden;
}

.home-campaign-card__cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  transform: scale(1.01);
}

.home-campaign-card__overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.25) 52%, rgba(0, 0, 0, 0.1));
}

.home-campaign-card__content {
  position: relative;
  z-index: 1;
  padding: 1rem;
}

.home-campaign-card__content h3 {
  margin: 0;
  color: #fff;
  font-size: 1.12rem;
}

.home-campaign-card__content p {
  margin: 0.4rem 0 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.92rem;
}

.home-campaign-card:hover {
  transform: translateY(-2px);
  transition: transform 0.15s ease;
}

.home-campaign-card--coming-soon {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--secondary) 32%, var(--lightgray));
  background: linear-gradient(165deg, color-mix(in srgb, var(--light) 96%, transparent), color-mix(in srgb, var(--lightgray) 35%, transparent));
}

.home-campaign-card--coming-soon .home-campaign-card__content h3,
.home-campaign-card--coming-soon .home-campaign-card__content p {
  color: var(--dark);
}

.home-campaign-card__tag {
  display: inline-flex;
  margin: 0 0 0.6rem;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--secondary) 35%, var(--lightgray));
  padding: 0.12rem 0.55rem;
  color: var(--secondary);
}

@media (max-width: 1200px) {
  .home-campaign-hub__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .home-campaign-hub__grid {
    grid-template-columns: 1fr;
  }

  .home-campaign-card {
    min-height: 205px;
  }
}
`

export default (() => HomeCampaignHub) satisfies QuartzComponentConstructor
