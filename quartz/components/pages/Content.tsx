import { ComponentChildren } from "preact"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import ArticleInfobox from "../ArticleInfobox"

const InlineInfobox = ArticleInfobox()

const Content: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData, tree } = props
  const content = htmlToJsx(fileData.filePath!, tree) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  return (
    <article class={classString}>
      <InlineInfobox {...props} displayClass="wiki-infobox-inline" />
      {content}
    </article>
  )
}

export default (() => Content) satisfies QuartzComponentConstructor
