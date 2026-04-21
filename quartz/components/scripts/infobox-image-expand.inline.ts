function setupInfoboxImageExpand() {
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
