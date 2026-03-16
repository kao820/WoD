import { ForceGraph2D } from "react-force-graph"
import { useEffect, useState } from "react"

export default function Network() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })

  useEffect(() => {
    fetch("/static/contentIndex.json")
      .then(res => res.json())
      .then(data => {
        const nodes = []
        const links = []

        Object.entries(data).forEach(([id, page]) => {
          nodes.push({ id })

          if (page.links) {
            page.links.forEach(link => {
              links.push({ source: id, target: link })
            })
          }
        })

        setGraphData({ nodes, links })
      })
  }, [])

  return (
    <div style={{ height: "80vh" }}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="id"
        nodeAutoColorBy="id"
      />
    </div>
  )
}