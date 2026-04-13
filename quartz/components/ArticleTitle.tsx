import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames, stripOrderingPrefix } from "../util/lang"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (title) {
    return (
      <h1 class={classNames(displayClass, "article-title")}>
        {String(title).replace(/^(?:[0-9]+|[A-Za-zА-Яа-я]{2,}[0-9]+)\s*[-._]?\s*/, "")}
      </h1>
    )
  } else {
    return null
  }
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
