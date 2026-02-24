import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface ResearcherTerminalProps {
  token: string
  onConnectionChange?: (connected: boolean) => void
}

export default function ResearcherTerminal({ token, onConnectionChange }: ResearcherTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const termInstance = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!termRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
      theme: {
        background: '#0a0e1a',
        foreground: '#e2e8f0',
        cursor: '#60a5fa',
        selectionBackground: '#334155',
        black: '#1e293b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e2e8f0',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.current)
    fitAddon.fit()

    termInstance.current = term
    fitAddonRef.current = fitAddon

    // Build WebSocket URL
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${proto}://${window.location.host}/api/lab/ws/terminal?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      onConnectionChange?.(true)
      // Send initial size
      const dims = fitAddon.proposeDimensions()
      if (dims) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'output') {
          term.write(msg.data)
        } else if (msg.type === 'error') {
          term.write(`\r\n\x1b[31m${msg.data}\x1b[0m\r\n`)
        }
      } catch {
        // If not JSON, write raw
        term.write(event.data)
      }
    }

    ws.onclose = () => {
      onConnectionChange?.(false)
      term.write('\r\n\x1b[33m[Connection closed]\x1b[0m\r\n')
    }

    ws.onerror = () => {
      onConnectionChange?.(false)
      term.write('\r\n\x1b[31m[Connection error]\x1b[0m\r\n')
    }

    // Send terminal input to WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit()
      const dims = fitAddon.proposeDimensions()
      if (dims && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      ws.close()
      term.dispose()
      termInstance.current = null
      wsRef.current = null
      fitAddonRef.current = null
    }
  }, [token, onConnectionChange])

  return (
    <div
      ref={termRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
      }}
    />
  )
}
