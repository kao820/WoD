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

function applyPageChronicleTone() {
  const tagLinks = Array.from(document.querySelectorAll(".tags .tag-link, .tags .internal"))
  const tagTone = tagLinks
    .map((tag) => tag.textContent?.trim() || "")
    .map((text) => detectChronicleTone(text))
    .find(Boolean)

  if (tagTone) {
    document.body.setAttribute("data-chronicle-tone", tagTone)
    return
  }

  const infoboxRows = Array.from(document.querySelectorAll(".wiki-infobox__row"))
  for (const row of infoboxRows) {
    const key = row.querySelector("dt")?.textContent?.trim().toLowerCase() || ""
    if (key !== "хроника" && key !== "chronicle") continue

    const val = row.querySelector("dd")?.textContent?.trim() || ""
    const tone = detectChronicleTone(val)
    if (tone) {
      document.body.setAttribute("data-chronicle-tone", tone)
      return
    }
  }

  document.body.removeAttribute("data-chronicle-tone")
}

function setupInfoboxImageExpand() {
  applyPageChronicleTone()

  const expandButtons = document.querySelectorAll(".wiki-infobox__image-expand")

  expandButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return

    const imageWrap = button.closest(".wiki-infobox__image-wrap")
    const infobox = button.closest(".wiki-infobox")
    if (!(imageWrap instanceof HTMLElement) || !(infobox instanceof HTMLElement)) return

    const modal = infobox.querySelector(".wiki-infobox__image-modal")
    const image = imageWrap.querySelector("img")
    const closeButton = modal?.querySelector(".wiki-infobox__image-close")
    if (!(modal instanceof HTMLDialogElement) || !(image instanceof HTMLImageElement)) return

    const modalImage =
      modal.querySelector(".wiki-infobox__image-modal-content") || modal.querySelector("img")
    if (modalImage instanceof HTMLImageElement) {
      modalImage.src = image.currentSrc || image.src
      modalImage.alt = image.alt
    }

    const onExpand = () => {
      if (!modal.open) {
        modal.showModal()
      }
    }

    const onClose = () => {
      if (modal.open) modal.close()
    }

    const onModalClick = (event: MouseEvent) => {
      if (event.target === modal) {
        onClose()
      }
    }

    button.addEventListener("click", onExpand)
    closeButton?.addEventListener("click", onClose)
    modal.addEventListener("click", onModalClick)

    window.addCleanup(() => {
      button.removeEventListener("click", onExpand)
      closeButton?.removeEventListener("click", onClose)
      modal.removeEventListener("click", onModalClick)
      if (modal.open) modal.close()
    })
  })
}

document.addEventListener("nav", setupInfoboxImageExpand)
