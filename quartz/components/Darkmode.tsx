// @ts-ignore
import darkmodeScript from "./scripts/darkmode.inline"
import styles from "./styles/darkmode.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"

const Darkmode: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
  return (
    <button
      class={classNames(displayClass, "darkmode")}
      aria-label={i18n(cfg.locale).components.themeToggle.darkMode}
      title={i18n(cfg.locale).components.themeToggle.darkMode}
    >
      <span class="darkmode-switch" aria-hidden="true">
        <span class="darkmode-switch-icon"></span>
        <span class="darkmode-switch-thumb"></span>
      </span>
    </button>
  )
}

Darkmode.beforeDOMLoaded = darkmodeScript
Darkmode.css = styles

export default (() => Darkmode) satisfies QuartzComponentConstructor
