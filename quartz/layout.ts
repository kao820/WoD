import { PageLayout, SharedLayout } from "./cfg"
import * as Component from "./components"

// Note: The default layout file that shipped with Quartz was a single-line
// minified export. To improve readability and enable site-wide custom
// behaviour, this file has been reformatted. A custom NetworkScript
// component is inserted into the `afterBody` section of the shared page
// layout. This component will inject the custom network.js script on every
// page load so that the interactive network map works correctly even when
// navigating via the SPA router.

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [Component.NetworkScript()],
  footer: Component.ConditionalRender({ component: Component.Footer({ links: {} }), condition: () => false }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs({ rootName: "Мир Тьмы" }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta({ showDate: false }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.TagList(),
    Component.HomeCampaignHub(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer({
      title: "Содержание",
      folderClickBehavior: "collapse",
      mapFn: (node) => {
        node.displayName = node.displayName.replace(/^[0-9]+\s*[-._]?\s*/, "")
      },
      order: ["filter", "sort", "map"],
    }),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs({ rootName: "Мир Тьмы" }),
    Component.ArticleTitle(),
    Component.ContentMeta({ showDate: false }),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      title: "Содержание",
      folderClickBehavior: "collapse",
      mapFn: (node) => {
        node.displayName = node.displayName.replace(/^[0-9]+\s*[-._]?\s*/, "")
      },
      order: ["filter", "sort", "map"],
    }),
  ],
  right: [],
}
