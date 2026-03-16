import { ForceGraph2D } from "react-force-graph"
import { useEffect, useState } from "react"

export default function NetworkGraph() {
  const [data, setData] = useState({ nodes: [], links: [] })

  useEffect(() => {
    fetch("/static/contentIndex.json")
      .then(res => res.json())
      .then(index => {
        const nodes = []
        const links = []

        Object.keys(index).forEach(key => {
          nodes.push({ id: key })

          index[key].links?.forEach(link => {
            links.push({ source: key, target: link })
          })
        })

        setData({ nodes, links })
      })
  }, [])

  return (
    <ForceGraph2D
      graphData={data}
      nodeAutoColorBy="id"
      nodeLabel="id"
    />
  )
}