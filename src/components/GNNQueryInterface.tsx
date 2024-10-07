import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Parliamentarian {
  name: string;
  sector: string;
  url_imagen: string;
}

interface Edge {
  parliamentarian_1: string;
  parliamentarian_2: string;
  proportion_agreement: number;
}

interface CompleteData {
  nodos: Parliamentarian[];
  aristas: Edge[];
  parliamentarian_to_index: { [key: string]: number };
  embeddings: number[][];
}

export default function GNNQueryInterface() {
  const [data, setData] = useState<CompleteData | null>(null)
  const [selectedParliamentarian, setSelectedParliamentarian] = useState("")
  const [queryResult, setQueryResult] = useState<{sector: string, similarNodes: {name: string, similarity: number, sector: string, proportion_agreement?: number}[]} | null>(null)

  useEffect(() => {
    fetch('/datos_completos.json')
      .then(response => response.json())
      .then(jsonData => setData(jsonData))
  }, [])

  const handleQuery = () => {
    if (!data || !selectedParliamentarian) return

    const index = data.parliamentarian_to_index[selectedParliamentarian]
    const embedding = data.embeddings[index]
    
    // Calculate cosine similarity
    const similarities = data.embeddings.map(e => 
      e.reduce((sum, val, i) => sum + val * embedding[i], 0) / 
      (Math.sqrt(e.reduce((sum, val) => sum + val * val, 0)) * 
       Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)))
    )

    const topSimilarIndices = similarities
      .map((s, i) => ({index: i, similarity: s}))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(1, 6)  // Exclude the parliamentarian itself and get top 5

    const similarNodes = topSimilarIndices.map(({index, similarity}) => {
      const name = Object.keys(data.parliamentarian_to_index).find(key => data.parliamentarian_to_index[key] === index) || ""
      const node = data.nodos.find(n => n.name === name)
      const edge = data.aristas.find(e => 
        (e.parliamentarian_1 === selectedParliamentarian && e.parliamentarian_2 === name) ||
        (e.parliamentarian_2 === selectedParliamentarian && e.parliamentarian_1 === name)
      )
      return {
        name,
        similarity,
        sector: node?.sector || "",
        proportion_agreement: edge?.proportion_agreement
      }
    })

    const sector = data.nodos.find(n => n.name === selectedParliamentarian)?.sector || ""

    setQueryResult({sector, similarNodes})
  }

  if (!data) return <div>Loading...</div>

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>GNN Query Interface</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select onValueChange={setSelectedParliamentarian}>
            <SelectTrigger>
              <SelectValue placeholder="Select a parliamentarian" />
            </SelectTrigger>
            <SelectContent>
              {data.nodos.map((p) => (
                <SelectItem key={p.name} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleQuery}>Query</Button>

          {queryResult && (
            <div className="space-y-4">
              <p>Sector: {queryResult.sector}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Similar Parliamentarian</TableHead>
                    <TableHead>Similarity Score</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Proportion Agreement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryResult.similarNodes.map((node) => (
                    <TableRow key={node.name}>
                      <TableCell>{node.name}</TableCell>
                      <TableCell>{node.similarity.toFixed(4)}</TableCell>
                      <TableCell>{node.sector}</TableCell>
                      <TableCell>{node.proportion_agreement?.toFixed(4) || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}